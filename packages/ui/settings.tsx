"use client";
import { formatDate, formatBackupDate } from "../i18n/dates";
import { ImagePicker } from "./image-picker";
import { DriveBackupSettings } from "./drive-backup-settings";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";

import { AppearanceSettings } from "./appearance-settings";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNetwork } from "./store";
import { Modal, Field } from "./primitives";
import {
  type Snapshot,
  type Preferences,
  emptySnapshot,
} from "../domain/model";
import {
  exportJson,
  exportZip,
  importFile,
  download,
} from "../storage-core/export";
export function Settings({
  onClose,
  onPreview,
  onDisconnect,
}: {
  onClose: () => void;
  onPreview: (s: Snapshot) => void;
  onDisconnect: () => void;
}) {
  const { t } = useTranslation(),
    s = useNetwork(),
    data = s.data!;
  const [backups, setBackups] = useState<string[] | null>(null),
    [message, setMessage] = useState("");
  const change = <K extends keyof Preferences>(k: K, v: Preferences[K]) =>
    s.mutate((d) => {
      d.preferences[k] = v;
    });
  async function perform(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "storageError");
    }
  }
  return (
    <Modal title={t("settings")} onClose={onClose}>
      {s.repo?.readOnly ? (
        <div className="form-content">
          <p>{t("sharedReadOnly")}</p>
          <button onClick={() => exportJson(data)}>{t("download")}</button>
        </div>
      ) : (
        <div className="form-content settings">
          <Field label={t("networkName")}>
            <input
              maxLength={80}
              defaultValue={data.preferences.networkName ?? t("defaultNetwork")}
              disabled={Boolean(s.conflict)}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (
                  name &&
                  name !== (data.preferences.networkName ?? t("defaultNetwork"))
                )
                  change("networkName", name);
                else
                  e.target.value =
                    data.preferences.networkName ?? t("defaultNetwork");
              }}
            />
          </Field>
          <ImagePicker
            kind="banner"
            value={data.preferences.banner}
            disabled={Boolean(s.conflict)}
            onChange={(v) => change("banner", v)}
          />
          {!s.demo && (
            <button
              disabled={Boolean(s.conflict)}
              onClick={() => {
                change("introduction", "profile");
                onClose();
              }}
            >
              {t("guideResume")}
            </button>
          )}
          <h3>{t("appearance")}</h3>
          <AppearanceSettings />
          <Field label={t("sizeMode")}>
            <select
              value={data.preferences.sizeMode}
              onChange={(e) =>
                change("sizeMode", e.target.value as Preferences["sizeMode"])
              }
            >
              {["degree", "centrality", "importance", "combined"].map((v) => (
                <option key={v} value={v}>
                  {t(v === "combined" ? v : v + "Metric")}
                </option>
              ))}
            </select>
          </Field>
          {(
            [
              "showLabels",
              "showOwner",
              "showPhotos",
              "searchNotes",
              "autoBackup",
            ] as const
          ).map((k, i) => (
            <label className="check" key={k}>
              <input
                type="checkbox"
                checked={data.preferences[k]}
                onChange={(e) => change(k, e.target.checked)}
              />
              {t(
                ["labels", "owner", "showPhotos", "searchNotes", "autoBackup"][
                  i
                ],
              )}
            </label>
          ))}
          <DriveBackupSettings />
          <h3>{t("data")}</h3>
          <div className="action-grid">
            <button onClick={() => exportJson(data)}>{t("exportJson")}</button>
            <button onClick={() => exportZip(data)}>{t("exportZip")}</button>
            <label className="button file-button">
              {t("import")}
              <input
                type="file"
                accept=".json,.zip"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void perform(async () => onPreview(await importFile(f)));
                  e.target.value = "";
                }}
              />
            </label>
            <button
              disabled={!s.repo || s.saving || s.dirty}
              onClick={() =>
                void perform(async () => {
                  await s.repo!.backup();
                  setMessage("savedBackup");
                })
              }
            >
              {t("backup")}
            </button>
            <button
              disabled={!s.repo}
              onClick={() =>
                void perform(async () => setBackups(await s.repo!.backups()))
              }
            >
              {t("backups")}
            </button>
            <button
              onClick={() =>
                download(
                  JSON.stringify(
                    {
                      app: "GraphLive",
                      version: "1.0.4",
                      schemaVersion: data.schemaVersion,
                      provider: s.demo ? "demo" : s.repo?.constructor.name,
                      pending: s.dirty,
                      error: s.error ? "storage-operation-failed" : null,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2,
                  ),
                  "GraphLive-diagnostics.json",
                )
              }
            >
              {t("diagnostics")}
            </button>
          </div>
          {backups && (
            <div className="backup-list">
              {!backups.length && <p>{t("noBackups")}</p>}
              {backups.map((id) => (
                <button
                  key={id}
                  onClick={() =>
                    void perform(async () =>
                      onPreview(await s.repo!.restorePreview(id)),
                    )
                  }
                >
                  {t("restore")} ·{" "}
                  {s.repo instanceof GoogleDriveRepository &&
                  s.repo.backupInfo(id).timestamp
                    ? t(s.repo.backupInfo(id).kind) +
                      " · " +
                      formatDate(
                        s.repo.backupInfo(id).timestamp,
                        data.preferences.language,
                        true,
                      )
                    : formatBackupDate(id, data.preferences.language)}
                </button>
              ))}
            </div>
          )}
          <h3>{t("storage")}</h3>
          <button onClick={onDisconnect}>{t("disconnect")}</button>
          <p className="muted-copy">
            {t("cloud")} — {t("unavailable")}
          </p>
          <button
            className="danger"
            disabled={s.saving || s.dirty}
            onClick={() => {
              if (window.confirm(t("deleteAllConfirm")))
                void perform(async () => {
                  if (s.repo) await s.repo.backup();
                  s.mutate((d) => {
                    const fresh = emptySnapshot();
                    Object.assign(d, fresh, {
                      revision: d.revision,
                      counters: d.counters,
                    });
                  });
                  onClose();
                });
            }}
          >
            {t("deleteAll")}
          </button>
          {message && (
            <p role="status">{t(message, { defaultValue: t("error") })}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
