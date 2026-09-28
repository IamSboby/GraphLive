"use client";
import { useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  type Connection,
  relationshipTypes,
  displayName,
  edgeInputSchema,
  upsertConnection,
} from "../domain/model";
import { matchesSearch } from "../graph-engine/metrics";
import { useNetwork } from "./store";
import { Modal, Field } from "./primitives";
export function ConnectionForm({
  sourceId,
  edge,
  onClose,
}: {
  sourceId: string;
  edge?: Connection;
  onClose: () => void;
}) {
  const { t } = useTranslation(),
    s = useNetwork(),
    data = s.data!;
  const [v, setV] = useState<z.infer<typeof edgeInputSchema>>(
    edge
      ? {
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relationshipType: edge.relationshipType,
          sourcePerspective: edge.sourcePerspective,
          targetPerspective: edge.targetPerspective,
          intensity: edge.intensity,
          frequency: edge.frequency,
          importance: edge.importance,
          status: edge.status,
          startedAt: edge.startedAt,
          endedAt: edge.endedAt,
          notes: edge.notes,
        }
      : {
          sourceId,
          targetId: "",
          relationshipType: "friend",
          sourcePerspective: "friend",
          targetPerspective: "friend",
          intensity: 3,
          frequency: 3,
          importance: 3,
          status: "confirmed",
          startedAt: null,
          endedAt: null,
          notes: "",
        },
  );
  const [explicit, setExplicit] = useState({
    sourcePerspective: Boolean(edge),
    targetPerspective: Boolean(edge),
  });
  const [query, setQuery] = useState(""),
    [error, setError] = useState(false);
  const available = data.people.filter(
    (p) =>
      p.id !== sourceId &&
      (edge ||
        !data.connections.some(
          (e) =>
            [e.sourceId, e.targetId].includes(sourceId) &&
            [e.sourceId, e.targetId].includes(p.id),
        )) &&
      matchesSearch(p, query),
  );
  return (
    <Modal
      title={t(edge ? "editConnection" : "addConnection")}
      onClose={onClose}
    >
      <form
        className="form-content"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = edgeInputSchema.safeParse(v);
          if (!parsed.success) {
            setError(true);
            return;
          }
          s.mutate((d) => {
            upsertConnection(d, parsed.data);
          });
          onClose();
        }}
      >
        {!edge && (
          <>
            <Field label={t("search")}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </Field>
            <Field label={t("otherPerson")}>
              <select
                required
                value={v.targetId}
                onChange={(e) => setV({ ...v, targetId: e.target.value })}
              >
                <option value="">{t("none")}</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)} · {p.profile.lastName}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field label={t("relationship")}>
          <select
            value={v.relationshipType}
            onChange={(e) =>
              setV({
                ...v,
                relationshipType: e.target
                  .value as Connection["relationshipType"],
                ...(!explicit.sourcePerspective
                  ? {
                      sourcePerspective: e.target
                        .value as Connection["relationshipType"],
                    }
                  : {}),
                ...(!explicit.targetPerspective
                  ? {
                      targetPerspective: e.target
                        .value as Connection["relationshipType"],
                    }
                  : {}),
              })
            }
          >
            {relationshipTypes.map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          {(["intensity", "frequency", "importance"] as const).map((k) => (
            <Field key={k} label={t(k)}>
              <input
                type="range"
                min={1}
                max={5}
                value={v[k]}
                onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })}
              />
              <output>{v[k]}/5</output>
            </Field>
          ))}
          <Field label={t("status")}>
            <select
              value={v.status}
              onChange={(e) =>
                setV({ ...v, status: e.target.value as Connection["status"] })
              }
            >
              {["confirmed", "uncertain", "ended"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </Field>
          {(["sourcePerspective", "targetPerspective"] as const).map((k) => (
            <Field key={k} label={t(k)}>
              <select
                value={v[k]}
                onChange={(e) => {
                  setExplicit({ ...explicit, [k]: true });
                  setV({
                    ...v,
                    [k]: e.target.value as Connection["relationshipType"],
                  });
                }}
              >
                {relationshipTypes.map((r) => (
                  <option key={r} value={r}>
                    {t(r)}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          {(["startedAt", "endedAt"] as const).map((k) => (
            <Field key={k} label={t(k)}>
              <input
                type="date"
                value={v[k] ?? ""}
                onChange={(e) => setV({ ...v, [k]: e.target.value || null })}
              />
            </Field>
          ))}
        </div>
        <Field label={t("notes")}>
          <textarea
            value={v.notes}
            maxLength={20000}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
          />
        </Field>
        {error && (
          <p role="alert" className="error">
            {t("invalidData")}
          </p>
        )}
        <footer className="modal-actions">
          <button type="button" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="primary" type="submit">
            {t("save")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
