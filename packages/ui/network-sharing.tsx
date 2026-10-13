"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  ShieldCheck,
  UserRound,
  UserRoundMinus,
} from "lucide-react";
import {
  GoogleDriveRepository,
  type DriveMember,
  type NetworkAccess,
} from "../storage-adapters/google-drive";
import type { NetworkEntry, NetworkLibrary } from "./library";
import { Field, Modal } from "./primitives";

export function NetworkSharing({
  entry,
  library,
  prepare,
  onClose,
  onInvited,
}: {
  entry: NetworkEntry;
  library: NetworkLibrary;
  prepare: () => Promise<GoogleDriveRepository>;
  onClose: () => void;
  onInvited: () => void;
}) {
  const { t } = useTranslation();
  const repo = useMemo(
    () => library.repository(entry.id) as GoogleDriveRepository,
    [library, entry.id],
  );
  const [access, setAccess] = useState<NetworkAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reader" | "writer">("reader");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<DriveMember | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void repo
      .access()
      .then((value) => {
        if (!cancelled) setAccess(value);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "storageError");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, reload]);
  async function invite() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await library.session!.ensureFileAccess();
      const current = await prepare();
      const latest = await current.access();
      setAccess(latest);
      if (
        latest.members.some(
          (p) => p.emailAddress?.toLowerCase() === email.trim().toLowerCase(),
        )
      )
        throw new Error("sharedAlreadyMember");
      await current.invite(email.trim(), role);
      setEmail("");
      setNotice("sharedInvitationSent");
      onInvited();
      setReload((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (!removing) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await library.session!.ensureFileAccess();
      await repo.revoke(removing.id);
      setAccess((previous) =>
        previous
          ? {
              ...previous,
              members: previous.members.filter((p) => p.id !== removing.id),
            }
          : previous,
      );
      setRemoving(null);
      setNotice("sharedRevoked");
      setReload((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageError");
    } finally {
      setBusy(false);
    }
  }
  const label = (p: DriveMember) =>
    p.name || p.emailAddress || t("sharedUnnamed");
  return (
    <Modal
      title={t("shareNetwork")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="form-content sharing-panel">
        <h3>{entry.preferences.networkName || t("defaultNetwork")}</h3>
        <p>{t("shareNetworkHelp")}</p>
        <section aria-label={t("sharedMembers")}>
          <div className="sharing-heading">
            <h4>{t("sharedMembers")}</h4>
            <button
              type="button"
              className="icon-button"
              aria-label={t("refreshNetworks")}
              disabled={busy || loading}
              onClick={() => {
                setError("");
                setReload((v) => v + 1);
              }}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {loading ? (
            <p role="status">{t("loading")}</p>
          ) : !access?.members.length ? (
            <p className="muted-copy">{t("sharedNoMembers")}</p>
          ) : (
            <ul className="sharing-members">
              {access.members.map((p) => (
                <li key={p.id}>
                  <span className="member-avatar" aria-hidden="true">
                    <UserRound size={20} />
                  </span>
                  <div className="member-identity">
                    <strong>{label(p)}</strong>
                    {p.emailAddress && <span>{p.emailAddress}</span>}
                    <small>
                      {t(
                        p.role === "owner"
                          ? "sharedOwner"
                          : p.role === "writer"
                            ? "sharedWriter"
                            : p.role === "reader"
                              ? "sharedReader"
                              : "sharedOtherAccess",
                      )}
                      {p.id === library.session?.accountId
                        ? ` · ${t("sharedYou")}`
                        : ""}
                    </small>
                  </div>
                  {access.canShare && repo.canRevoke(p) && (
                    <button
                      type="button"
                      className="icon-button danger"
                      disabled={busy}
                      aria-label={t("sharedRevokePerson", { name: label(p) })}
                      onClick={() => setRemoving(p)}
                    >
                      <UserRoundMinus size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        {removing && (
          <section className="notice" aria-label={t("sharedRevoke")}>
            <p>
              {t("sharedRevokeConfirm", {
                name: label(removing),
                email: removing.emailAddress || "",
              })}
            </p>
            <p className="muted-copy">{t("sharedRevokeHelp")}</p>
            <div className="modal-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRemoving(null)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => void revoke()}
              >
                {t("sharedRevoke")}
              </button>
            </div>
          </section>
        )}
        {access?.canShare && (
          <form
            className="sharing-invite"
            onSubmit={(e) => {
              e.preventDefault();
              void invite();
            }}
          >
            <Field label={t("sharedEmail")}>
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={t("sharedPermission")}>
              <select
                value={role}
                disabled={busy}
                onChange={(e) => setRole(e.target.value as typeof role)}
              >
                <option value="reader">{t("sharedReader")}</option>
                <option value="writer">{t("sharedWriter")}</option>
              </select>
            </Field>
            <p className="muted-copy">
              <ShieldCheck size={16} aria-hidden="true" /> {t("sharedSyncHelp")}
            </p>
            <button
              className="primary full"
              disabled={busy || loading || !email.trim()}
            >
              {t(busy ? "saving" : "sendInvitation")}
            </button>
          </form>
        )}
        <p className="muted-copy">{t("sharedReceiveHelp")}</p>
        {notice && (
          <p role="status" className="notice">
            {t(notice)}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
