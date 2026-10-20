"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import type { GoogleSession } from "../storage-adapters/google-auth";
import { offlineNetworks } from "../storage-adapters/offline-repository";
import {
  replicaBytes,
  replicaKey,
  type OfflineRecord,
} from "../storage-core/offline";
import { useNetwork } from "./store";
import { useLibrary } from "./library";
import { outbox } from "../storage-core/outbox";
import { androidCall, isAndroid } from "../storage-adapters/android-bridge";

export function OfflineControls({
  session,
  network,
}: {
  session: GoogleSession;
  network: string;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith("es");
  const key = replicaKey(session.accountId, network);
  const [record, setRecord] = useState<OfflineRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const update = () =>
      void offlineNetworks.storage
        .get(key)
        .then((r) => {
          if (live) setRecord(r);
        })
        .catch(() => {
          if (live)
            setError(
              es
                ? "No se pudo leer el almacenamiento local."
                : "Could not read local storage.",
            );
        });
    update();
    const timer = setInterval(update, 1500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [key, es]);
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      const code = e instanceof Error ? e.message : "storageError";
      setError(
        code === "offlinePendingRemoval"
          ? es
            ? "Hay cambios pendientes. Sincronízalos antes de quitar la descarga. Puedes exportar una copia para recuperarlos."
            : "Pending changes exist. Sync before removing the download. You can export a recovery copy."
          : (es
              ? "No se completó la operación. Los cambios locales se conservan. Reconecta la misma cuenta si ha caducado el acceso. "
              : "Operation failed. Local changes are retained. Reconnect the same account if access expired. ") +
              code,
      );
    } finally {
      try {
        setRecord(await offlineNetworks.storage.get(key));
      } catch {
        setError(
          es
            ? "No se pudo leer el almacenamiento local."
            : "Could not read local storage.",
        );
      } finally {
        setBusy(false);
      }
    }
  };
  const resolveReplica = async (choice: "local" | "remote") => {
    const scope =
      "drive:" +
      session.accountId +
      (network === "default" ? "" : ":" + network) +
      ":" +
      record?.base.ownerId;
    const state = useNetwork.getState();
    const active = useLibrary.getState().activeId === network;
    if (active && state.dirty && !(await state.prepareSwitch()))
      throw Error("localSaveFailed");
    const pending = await outbox.list(scope);
    if (pending.length) await offlineNetworks.recover(key, pending);
    await offlineNetworks.resolve(key, choice);
    for (const entry of pending) await outbox.remove(entry);
    if (active) {
      // The explicit resolution supersedes the editor journal; never replay the discarded version.
      useNetwork.setState({ dirty: false, conflict: null });
      const repo = useLibrary.getState().library!.repository(network);
      await useNetwork.getState().open(await repo.load(), repo);
    }
  };
  const recoverJournal = async () => {
    const current = await offlineNetworks.required(key);
    const scope =
      "drive:" +
      session.accountId +
      (network === "default" ? "" : ":" + network) +
      ":" +
      current.base.ownerId;
    const entries = await outbox.list(scope);
    if (entries.length) {
      await offlineNetworks.recover(key, entries);
      for (const entry of entries) await outbox.remove(entry);
    }
  };
  const sync = async () => {
    if (useLibrary.getState().activeId === network) {
      await useNetwork.getState().persist();
      if (useNetwork.getState().dirty) throw Error("localSaveFailed");
    }
    await recoverJournal();
    await offlineNetworks.sync(
      key,
      session.accountId,
      new GoogleDriveRepository(session, network),
    );
  };
  return (
    <div className="offline-controls" aria-live="polite">
      <label>
        <input
          type="checkbox"
          checked={Boolean(record)}
          disabled={busy}
          onChange={() =>
            void act(async () => {
              if (record) {
                if (useLibrary.getState().activeId === network) {
                  await useNetwork.getState().persist();
                  if (useNetwork.getState().dirty)
                    throw Error("offlinePendingRemoval");
                }
                await recoverJournal();
                await offlineNetworks.remove(key);
              } else {
                await offlineNetworks.download(
                  session.accountId,
                  network,
                  new GoogleDriveRepository(session, network),
                );
                await navigator.storage?.persist?.();
              }
            })
          }
        />{" "}
        {es ? "Disponible sin conexión" : "Available offline"}
      </label>
      {record && (
        <>
          <p>
            {busy || offlineNetworks.syncing(key)
              ? es
                ? "Sincronizando…"
                : "Syncing…"
              : record.conflict
                ? es
                  ? "Conflicto: requiere atención"
                  : "Conflict: needs attention"
                : record.error
                  ? es
                    ? "Error: requiere atención"
                    : "Error: needs attention"
                  : record.pending
                    ? es
                      ? "Guardado en el dispositivo · Cambios pendientes"
                      : "Saved on device · Pending changes"
                    : es
                      ? "Sincronizado con Drive"
                      : "Synced with Drive"}
          </p>
          <small>
            {es ? "Última sincronización correcta: " : "Last successful sync: "}
            {new Date(record.lastSync).toLocaleString(i18n.language)} ·{" "}
            {(replicaBytes(record) / 1048576).toFixed(2)} MB
          </small>
          <button
            disabled={busy || Boolean(record.conflict)}
            onClick={() => void act(sync)}
          >
            {es ? "Sincronizar ahora" : "Sync now"}
          </button>
          {record.conflict && (
            <div>
              <p>
                {es
                  ? "Ambas versiones están guardadas. Revisa los datos antes de elegir."
                  : "Both versions are saved. Review the data before choosing."}
              </p>
              {record.conflict.fields.map((field) => (
                <details key={field.path}>
                  <summary>{field.path}</summary>
                  <p>
                    {es ? "Dispositivo" : "Device"}:{" "}
                    {JSON.stringify(field.local)}
                  </p>
                  <p>Drive: {JSON.stringify(field.remote)}</p>
                </details>
              ))}
              <button
                disabled={busy}
                onClick={() => void act(() => resolveReplica("local"))}
              >
                {es
                  ? "Conservar versión del dispositivo"
                  : "Keep device version"}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      es
                        ? "¿Usar la versión de Drive y descartar la versión local en conflicto?"
                        : "Use the Drive version and discard conflicting local edits?",
                    )
                  )
                    void act(() => resolveReplica("remote"));
                }}
              >
                {es ? "Usar versión de Drive" : "Use Drive version"}
              </button>
            </div>
          )}
          <button
            onClick={() => {
              if (isAndroid()) {
                void act(() => androidCall<void>("exportRecovery", { key }));
                return;
              }
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(record, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "graphlive-offline-recovery.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            {es
              ? "Exportar recuperación (ambas versiones)"
              : "Export recovery (both versions)"}
          </button>
        </>
      )}
      {(error || record?.error) && (
        <p role="alert">
          {error ||
            (es
              ? "Los cambios locales se conservan. Revisa la conexión y el acceso a Drive: "
              : "Local changes are retained. Check connection and Drive access: ") +
              record?.error}
        </p>
      )}
    </div>
  );
}

export function useOfflineSync() {
  const library = useLibrary((s) => s.library);
  useEffect(() => {
    if (library?.provider !== "drive" || !library.session) return;
    const session = library.session;
    let running = false,
      stopped = false;
    const wake = async () => {
      if (running || stopped || !navigator.onLine) return;
      running = true;
      try {
        for (const r of await offlineNetworks.storage.list(session.accountId)) {
          if (stopped || r.conflict) continue;
          // The editor flushes its own journal first; avoid invalidating active revisions mid-edit.
          if (
            useLibrary.getState().activeId === r.network &&
            useNetwork.getState().dirty
          )
            continue;
          const scope =
            "drive:" +
            session.accountId +
            (r.network === "default" ? "" : ":" + r.network) +
            ":" +
            r.base.ownerId;
          const pending = await outbox.list(scope);
          if (pending.length) {
            await offlineNetworks.recover(r.key, pending);
            for (const entry of pending) await outbox.remove(entry);
          }
          await offlineNetworks
            .sync(
              r.key,
              session.accountId,
              new GoogleDriveRepository(session, r.network),
            )
            .catch(() => {});
        }
      } finally {
        running = false;
      }
    };
    const trigger = () => {
      void wake().catch(() => {});
    };
    trigger();
    const timer = setInterval(trigger, 30000);
    window.addEventListener("online", trigger);
    window.addEventListener("focus", trigger);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", trigger);
      window.removeEventListener("focus", trigger);
    };
  }, [library]);
}
