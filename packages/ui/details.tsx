"use client";
import { relationshipPalette } from "../appearance/config";
import { useState } from "react";
import { Modal } from "./primitives";
import { useTranslation } from "react-i18next";
import { X, Plus, ArrowUpRight, Pencil, Trash2, Pin } from "lucide-react";
import { useNetwork } from "./store";
import {
  type Person,
  type Connection,
  displayName,
  ownerRelationship,
  removeEntity,
} from "../domain/model";
import { metrics } from "../graph-engine/metrics";
import { Flag } from "./primitives";
export function Details({
  person,
  onClose,
  onEdit,
  onConnect,
  onSelect,
  onLock,
}: {
  person: Person;
  onClose: () => void;
  onEdit: () => void;
  onConnect: (edge?: Connection) => void;
  onSelect: (id: string) => void;
  onLock: () => void;
}) {
  const { t } = useTranslation(),
    s = useNetwork(),
    data = s.data!,
    m = metrics(data).get(person.id)!,
    relation = ownerRelationship(data, person.id),
    colors = relationshipPalette(data.preferences),
    edges = data.connections.filter(
      (e) => e.sourceId === person.id || e.targetId === person.id,
    );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = Boolean(s.conflict || s.repo?.readOnly);
  return (
    <aside className="details-panel">
      <header>
        <span className="eyebrow">{t("profile")}</span>
        <button
          className="icon-button"
          aria-label={t("close")}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div
        className="person-avatar"
        style={{
          background:
            person.id === data.ownerId
              ? "linear-gradient(135deg, var(--ownerStart), var(--ownerEnd))"
              : colors[relation],
        }}
      >
        {displayName(person).slice(0, 1)}
      </div>
      <h2>{displayName(person)}</h2>
      <p className="muted-copy">
        {[person.profile.firstName, person.profile.lastName].join(" ")}
      </p>
      <div className="profile-meta">
        <span>
          {person.profile.birthYear ??
            person.profile.birthDate?.slice(0, 4) ??
            t("unknown")}
        </span>
        {person.profile.nationalities.map((c) => (
          <Flag key={c} code={c} />
        ))}
        <span>{t(person.profile.contactMode)}</span>
      </div>
      <div
        className="relation-badge"
        style={{
          borderColor: colors[relation],
          backgroundColor: colors[relation] + "20",
        }}
      >
        {person.id === data.ownerId ? t("me") : t(relation)}
      </div>
      <div className="profile-actions">
        <button onClick={onEdit}>
          <Pencil size={15} />
          {t("edit")}
        </button>
        <button onClick={onLock}>
          <Pin size={15} />
          {t(person.display.positionLocked ? "unlock" : "lock")}
        </button>
        {person.id !== data.ownerId && (
          <button
            className="danger"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} />
            {t("deletePerson")}
          </button>
        )}
      </div>
      <div className="metric-grid">
        <div>
          <strong>{m.degree}</strong>
          <span>{t("connections")}</span>
        </div>
        <div title={t("affinityHelp")}>
          <strong>{m.affinity ?? "—"}</strong>
          <span>{t("affinity")}</span>
        </div>
        <div>
          <strong>{Math.round(m.centrality * 100)}%</strong>
          <span>{t("centrality")}</span>
        </div>
        <div>
          <strong>{m.bridges}</strong>
          <span>{t("bridges")}</span>
        </div>
      </div>
      <p className="metric-note">
        {t("intensity")}: {m.intensity?.toFixed(1) ?? "—"} / 5 ·{" "}
        {t("community")} {m.community}
      </p>
      {person.profile.interests.length > 0 && (
        <>
          <h3>{t("interests")}</h3>
          <div className="chips">
            {person.profile.interests.map((v) => (
              <span className="chip" key={v}>
                {v}
              </span>
            ))}
          </div>
        </>
      )}
      {person.profile.tags.length > 0 && (
        <>
          <h3>{t("tags")}</h3>
          <div className="chips">
            {person.profile.tags.map((v) => (
              <span className="chip" key={v}>
                {v}
              </span>
            ))}
          </div>
        </>
      )}
      {person.profile.notes && (
        <>
          <h3>{t("notes")}</h3>
          <p className="private-notes">{person.profile.notes}</p>
        </>
      )}
      <header className="connections-header">
        <h3>
          {t("connections")} <span>{edges.length}</span>
        </h3>
        <button
          className="icon-button"
          aria-label={t("addConnection")}
          onClick={() => onConnect()}
        >
          <Plus size={18} />
        </button>
      </header>
      <div className="connection-list">
        {edges.map((e) => {
          const other = data.people.find(
            (p) =>
              p.id === (e.sourceId === person.id ? e.targetId : e.sourceId),
          )!;
          return (
            <div className="connection-row" key={e.id}>
              <button
                className="connection-person"
                onClick={() => onSelect(other.id)}
              >
                <span
                  className="avatar-small"
                  style={{ background: colors[e.relationshipType] }}
                >
                  {displayName(other)[0]}
                </span>
                <span>
                  <strong>{displayName(other)}</strong>
                  <small>
                    {t(e.relationshipType)} · {e.intensity}/5
                  </small>
                </span>
                <ArrowUpRight size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={t("editConnection")}
                onClick={() => onConnect(e)}
              >
                <Pencil size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={t("delete")}
                onClick={() => {
                  if (window.confirm(t("deleteConfirm")))
                    s.mutate((d) => removeEntity(d, e.id, "connection"));
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!edges.length && <p className="muted-copy">{t("noConnections")}</p>}
      </div>
      {confirmDelete && (
        <Modal
          title={t("deletePerson")}
          onClose={() => setConfirmDelete(false)}
        >
          <div className="form-content">
            <p>
              {t("deletePersonConfirm", {
                name: displayName(person),
                count: edges.length,
              })}
            </p>
            <footer className="modal-actions">
              <button onClick={() => setConfirmDelete(false)}>
                {t("cancel")}
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() => {
                  s.mutate((d) => removeEntity(d, person.id, "person"));
                  if (
                    !useNetwork
                      .getState()
                      .data?.people.some((p) => p.id === person.id)
                  )
                    onClose();
                }}
              >
                {t("deletePerson")}
              </button>
            </footer>
          </div>
        </Modal>
      )}
    </aside>
  );
}
