"use client";
import { ImagePicker } from "./image-picker";
import { useState, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  type Person,
  type Profile,
  type RelationshipType,
  profileSchema,
  relationshipTypes,
  createPerson,
  updatePerson,
  upsertConnection,
  ownerRelationship,
  personSchema,
  displayName,
} from "../domain/model";
import { genders, genderClassification } from "../domain/gender";
import { useNetwork } from "./store";
import { Modal, Field, TagInput, CountryPicker } from "./primitives";
export function PersonForm({
  person,
  onClose,
  customFields,
  onSaved,
}: {
  person?: Person;
  onClose: () => void;
  customFields: boolean;
  onSaved: (id: string, connection?: string) => void;
}) {
  const { t } = useTranslation(),
    data = useNetwork((s) => s.data)!,
    mutate = useNetwork((s) => s.mutate);
  const [imageBusy, setImageBusy] = useState(false);
  const drafts = useRef({ interests: "", tags: "" });
  const [profile, setProfile] = useState<Profile>(
    person?.profile ?? {
      firstName: "",
      lastName: "",
      nickname: "",
      birthYear: null,
      birthDate: null,
      gender: "",
      classification: "U",
      nationalities: [],
      contactMode: "mixed",
      interests: [],
      tags: [],
      notes: "",
      importance: 3,
      metAt: null,
    },
  );
  const hasOwnerConnection = Boolean(
    person &&
    data.connections.some(
      (edge) =>
        [edge.sourceId, edge.targetId].includes(person.id) &&
        [edge.sourceId, edge.targetId].includes(data.ownerId!),
    ),
  );
  const [knowsDirectly, setKnowsDirectly] = useState(false);
  const connectToOwner = person ? hasOwnerConnection : knowsDirectly;
  const [relationship, setRelationship] = useState<RelationshipType>(
      person ? ownerRelationship(data, person.id) : "friend",
    ),
    [custom, setCustom] = useState(
      JSON.stringify(person?.customFields ?? {}, null, 2),
    ),
    [error, setError] = useState("");
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));
  function submit(e: FormEvent) {
    e.preventDefault();
    if (imageBusy) return;
    const parsed = profileSchema.safeParse({
      ...profile,
      interests: [
        ...profile.interests,
        ...(drafts.current.interests.trim()
          ? [drafts.current.interests.trim()]
          : []),
      ],
      tags: [
        ...profile.tags,
        ...(drafts.current.tags.trim() ? [drafts.current.tags.trim()] : []),
      ],
    });
    if (!parsed.success) {
      setError(
        profile.firstName || profile.lastName || profile.nickname
          ? "invalidData"
          : "nameRequired",
      );
      return;
    }
    let fields: Record<string, string>;
    try {
      fields = personSchema.shape.customFields.parse(JSON.parse(custom));
    } catch {
      setError("invalidData");
      return;
    }
    let savedId = "";
    mutate((s) => {
      let p;
      if (person) {
        updatePerson(s, person.id, parsed.data);
        p = s.people.find((p) => p.id === person.id)!;
      } else p = createPerson(s, parsed.data);
      p.customFields = fields;
      savedId = p.id;
      if (p.id !== s.ownerId && connectToOwner) {
        const old = s.connections.find(
          (e) =>
            [e.sourceId, e.targetId].includes(p.id) &&
            [e.sourceId, e.targetId].includes(s.ownerId!),
        );
        upsertConnection(s, {
          sourceId: old?.sourceId ?? s.ownerId,
          targetId: old?.targetId ?? p.id,
          relationshipType: relationship,
          intensity: old?.intensity ?? 3,
          frequency: old?.frequency ?? 3,
          importance: old?.importance ?? 3,
          status: old?.status ?? "confirmed",
          notes: old?.notes ?? "",
          sourcePerspective: old?.sourcePerspective ?? null,
          targetPerspective: old?.targetPerspective ?? null,
          startedAt: old?.startedAt ?? null,
          endedAt: old?.endedAt ?? null,
        });
      }
    });
    onClose();
    if (savedId)
      onSaved(
        savedId,
        (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
          "data-connection",
        ) ?? undefined,
      );
  }
  return (
    <Modal
      title={t(person ? "editPerson" : "addPerson")}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={submit}
        className="form-content"
        aria-describedby={error ? "person-form-error" : undefined}
      >
        <ImagePicker
          kind="portrait"
          value={profile.portrait}
          onChange={(v) => set("portrait", v)}
          onBusy={setImageBusy}
        />
        <div className="form-grid">
          {(["firstName", "lastName", "nickname"] as const).map((k) => (
            <Field key={k} label={t(k)}>
              <input
                autoFocus={k === "firstName"}
                maxLength={200}
                value={profile[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
          {!person && (
            <label>
              <input
                type="checkbox"
                checked={knowsDirectly}
                onChange={(e) => setKnowsDirectly(e.target.checked)}
              />{" "}
              {t("knowsDirectly")}
            </label>
          )}
          {person?.id !== data.ownerId && connectToOwner && (
            <Field label={t("relationOwner")}>
              <select
                value={relationship}
                onChange={(e) =>
                  setRelationship(e.target.value as RelationshipType)
                }
              >
                {relationshipTypes.map((k) => (
                  <option key={k} value={k}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t("birthYear")}>
            <input
              type="number"
              min={1850}
              max={new Date().getFullYear()}
              value={profile.birthYear ?? ""}
              onChange={(e) =>
                set("birthYear", e.target.value ? Number(e.target.value) : null)
              }
            />
          </Field>
          <Field label={t("birthDate")}>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={profile.birthDate ?? ""}
              onChange={(e) => set("birthDate", e.target.value || null)}
            />
          </Field>
          <Field label={t("gender")}>
            <select
              value={profile.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {t(gender ? "gender_" + gender : "gender_unspecified")}
                </option>
              ))}
              {!genders.some((gender) => gender === profile.gender) && (
                <option value={profile.gender}>{profile.gender}</option>
              )}
            </select>
          </Field>
          <Field label={t("classification")} hint={t("classificationHelp")}>
            <input
              readOnly
              value={
                person
                  ? person.storageId + ".json"
                  : genderClassification(profile.gender) +
                    (data.counters[genderClassification(profile.gender)] + 1) +
                    ".json"
              }
            />
          </Field>
          <CountryPicker
            value={profile.nationalities}
            onChange={(v) => set("nationalities", v)}
          />
          <Field label={t("contactMode")}>
            <select
              value={profile.contactMode}
              onChange={(e) =>
                set("contactMode", e.target.value as Profile["contactMode"])
              }
            >
              {["virtual", "inPerson", "mixed"].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </Field>
          <TagInput
            label={t("interests")}
            onDraftChange={(v) => {
              drafts.current.interests = v;
            }}
            value={profile.interests}
            onChange={(v) => set("interests", v)}
            suggestions={[
              ...new Set(data.people.flatMap((p) => p.profile.interests)),
            ]}
          />
          <TagInput
            label={t("tags")}
            onDraftChange={(v) => {
              drafts.current.tags = v;
            }}
            value={profile.tags}
            onChange={(v) => set("tags", v)}
            suggestions={[
              ...new Set(data.people.flatMap((p) => p.profile.tags)),
            ]}
          />
          <Field label={t("importance")}>
            <input
              type="range"
              min={1}
              max={5}
              value={profile.importance}
              onChange={(e) => set("importance", Number(e.target.value))}
            />
            <output>{profile.importance}/5</output>
          </Field>
          <Field label={t("metAt")}>
            <input
              type="date"
              value={profile.metAt ?? ""}
              onChange={(e) => set("metAt", e.target.value || null)}
            />
          </Field>
        </div>
        <Field label={t("notes")}>
          <textarea
            value={profile.notes}
            maxLength={20000}
            rows={3}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
        {customFields && (
          <details>
            <summary>{t("customFields")}</summary>
            <textarea
              aria-label={t("customFields")}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={3}
            />
          </details>
        )}
        {error && (
          <p role="alert" className="error" id="person-form-error">
            {t(error)}
          </p>
        )}
        <section className="form-connections">
          <header>
            <h3>{t("connections")}</h3>
            <button type="submit" data-connection="new">
              + {t("addConnection")}
            </button>
          </header>
          {person &&
            data.connections
              .filter(
                (edge) =>
                  edge.sourceId === person.id || edge.targetId === person.id,
              )
              .map((edge) => {
                const other = data.people.find(
                  (p) =>
                    p.id ===
                    (edge.sourceId === person.id
                      ? edge.targetId
                      : edge.sourceId),
                )!;
                return (
                  <button
                    className="connection-row"
                    type="submit"
                    data-connection={edge.id}
                    key={edge.id}
                  >
                    {displayName(other)} · {t(edge.relationshipType)} ·{" "}
                    {edge.intensity}/5
                  </button>
                );
              })}
        </section>
        <footer className="modal-actions">
          <button type="button" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="primary" type="submit" disabled={imageBusy}>
            {t("save")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
