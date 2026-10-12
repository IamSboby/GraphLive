"use client";
import { useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  type Connection,
  relationshipTypes,
  displayName,
  followsRelationship,
  normalize,
  edgeInputSchema,
  upsertConnection,
} from "../domain/model";
import { addMissingConnections } from "./connection-targets";
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
  const { t, i18n } = useTranslation(),
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
    sourcePerspective: !followsRelationship(edge, "source"),
    targetPerspective: !followsRelationship(edge, "target"),
  });
  const [query, setQuery] = useState(""),
    [error, setError] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const eligible = data.people.filter(
    (p) =>
      p.id !== sourceId &&
      (edge ||
        !data.connections.some(
          (e) =>
            [e.sourceId, e.targetId].includes(sourceId) &&
            [e.sourceId, e.targetId].includes(p.id),
        )),
  );
  const collator = new Intl.Collator(i18n.language, {
    sensitivity: "base",
    numeric: true,
  });
  const sorted = [...eligible].sort(
    (a, b) =>
      collator.compare(displayName(a), displayName(b)) ||
      collator.compare(a.profile.lastName, b.profile.lastName) ||
      a.id.localeCompare(b.id),
  );
  const available = sorted.filter((p) => matchesSearch(p, query));
  const groups = new Map<string, { label: string; ids: string[] }>();
  for (const person of sorted) {
    for (const tag of person.profile.tags) {
      const key = normalize(tag);
      if (!key) continue;
      const group = groups.get(key) ?? { label: tag.trim(), ids: [] };
      if (!group.ids.includes(person.id)) group.ids.push(person.id);
      groups.set(key, group);
    }
  }
  const tagOptions = [...groups.entries()]
    .sort((a, b) => collator.compare(a[1].label, b[1].label))
    .filter(
      ([key]) =>
        !query.trim() || key.includes(normalize(query)) || key === selectedTag,
    );
  const selectedGroup =
    selectedTag === null ? undefined : groups.get(selectedTag);
  return (
    <Modal
      title={t(edge ? "editConnection" : "addConnection")}
      onClose={onClose}
    >
      <form
        className="form-content"
        onSubmit={(e) => {
          e.preventDefault();
          const targets =
            !edge && selectedTag !== null
              ? (selectedGroup?.ids ?? [])
              : [v.targetId];
          const parsed = targets.map((targetId) =>
            edgeInputSchema.safeParse({
              ...v,
              targetId,
              sourcePerspectiveAutomatic: !explicit.sourcePerspective,
              targetPerspectiveAutomatic: !explicit.targetPerspective,
            }),
          );
          if (!parsed.length || parsed.some((result) => !result.success)) {
            setError(true);
            return;
          }
          s.mutate((d) => {
            for (const result of parsed) {
              if (result.success) {
                if (edge) upsertConnection(d, result.data);
                else addMissingConnections(d, [result.data]);
              }
            }
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
                value={selectedTag !== null ? "tag:" + selectedTag : v.targetId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedTag(
                    value.startsWith("tag:") ? value.slice(4) : null,
                  );
                  setV({
                    ...v,
                    targetId: value.startsWith("tag:") ? "" : value,
                  });
                  setError(false);
                }}
              >
                <option value="">{t("none")}</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)} · {p.profile.lastName}
                  </option>
                ))}
                {tagOptions.map(([key, group]) => (
                  <option key={"tag:" + key} value={"tag:" + key}>
                    [{t("connectionTag")}]: {group.label} ({group.ids.length})
                  </option>
                ))}
              </select>
            </Field>
            {selectedGroup && (
              <p role="status">
                {t("connectionGroupHelp", { count: selectedGroup.ids.length })}{" "}
                {sorted
                  .filter((p) => selectedGroup.ids.includes(p.id))
                  .map(displayName)
                  .join(", ")}
              </p>
            )}
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
