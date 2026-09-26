"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import { useNetwork } from "./store";
import { Modal } from "./primitives";
export function DriveBackupSettings() {
  const s = useNetwork(),
    { t } = useTranslation();
  const [plan, setPlan] = useState<string[] | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!(s.repo instanceof GoogleDriveRepository)) return null;
  const repo = s.repo;
  return (
    <section>
      <h3>{t("backupPolicy")}</h3>
      <p className="muted-copy">{t("backupPolicyHelp")}</p>
      {repo.backupWarning && <p role="alert">{t(repo.backupWarning)}</p>}
      <button
        disabled={busy || s.saving || s.dirty}
        onClick={() => {
          setBusy(true);
          setMessage("");
          void repo
            .legacyCleanupPlan()
            .then((ids) =>
              ids.length ? setPlan(ids) : setMessage("noOldBackups"),
            )
            .catch(() => setMessage("storageError"))
            .finally(() => setBusy(false));
        }}
      >
        {t("reviewOldBackups")}
      </button>
      {message && <p role="status">{t(message)}</p>}
      {plan && (
        <Modal
          title={t("reviewOldBackups")}
          onClose={() => {
            if (!busy) setPlan(null);
          }}
        >
          <div className="form-content">
            <p>{t("cleanupBackupsConfirm", { count: plan.length })}</p>
            <footer className="modal-actions">
              <button disabled={busy} onClick={() => setPlan(null)}>
                {t("cancel")}
              </button>
              <button
                className="danger"
                disabled={busy || s.saving || s.dirty}
                onClick={() => {
                  setBusy(true);
                  void repo
                    .cleanupLegacy(plan)
                    .then(() => {
                      setPlan(null);
                      setMessage("backupsCleaned");
                    })
                    .catch(() => {
                      setPlan(null);
                      setMessage("backupCleanupFailed");
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {t(busy ? "loading" : "deleteOldBackups")}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </section>
  );
}
