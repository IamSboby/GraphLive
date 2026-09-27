import { genderClassification } from "./gender";
import { z } from "zod";
import { languageCodes } from "../i18n/languages";

import {
  relationshipTypes,
  appearancePreferencesShape,
} from "../appearance/config";
export type RelationshipType = (typeof relationshipTypes)[number];
export {
  relationshipTypes,
  defaultRelationshipColors as colors,
} from "../appearance/config";
const text = z.string().trim().max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "date",
  );
const tags = z
  .array(text.min(1))
  .max(100)
  .transform((values) => {
    const unique = new Map<string, string>();
    for (const value of values)
      if (!unique.has(normalize(value))) unique.set(normalize(value), value);
    return [...unique.values()];
  });
export const profileSchema = z
  .object({
    firstName: text.default(""),
    lastName: text.default(""),
    nickname: text.default(""),
    birthYear: z
      .number()
      .int()
      .min(1850)
      .max(new Date().getUTCFullYear())
      .nullable()
      .default(null),
    birthDate: date
      .refine((v) => v <= new Date().toISOString().slice(0, 10), "date")
      .nullable()
      .default(null),
    gender: text.default(""),
    classification: z.enum(["M", "F", "L", "U"]).default("U"),
    nationalities: z
      .array(z.string().regex(/^[A-Z]{2}$/))
      .max(20)
      .default([]),
    contactMode: z.enum(["virtual", "inPerson", "mixed"]).default("mixed"),
    interests: tags.default([]),
    tags: tags.default([]),
    notes: z.string().max(20000).default(""),
    importance: z.number().int().min(1).max(5).default(3),
    metAt: date.nullable().default(null),
  })
  .strict()
  .refine(
    (p) => Boolean(p.firstName || p.lastName || p.nickname),
    "nameRequired",
  );
const metadata = {
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  revision: z.number().int().positive(),
  updatedByDeviceId: z.uuid(),
};
export const personSchema = z
  .object({
    ...metadata,
    schemaVersion: z.literal(1),
    storageId: z.string().regex(/^[MFLU][1-9]\d{0,8}$/),
    createdByDeviceId: z.uuid(),
    profile: profileSchema,
    display: z
      .object({
        manualPosition: z
          .object({
            x: z.number().finite().min(-1e7).max(1e7),
            y: z.number().finite().min(-1e7).max(1e7),
          })
          .nullable(),
        positionLocked: z.boolean(),
        hidden: z.boolean(),
      })
      .strict(),
    customFields: z
      .record(z.string().max(100), z.string().max(2000))
      .refine((v) => Object.keys(v).length <= 30),
  })
  .strict();
export const edgeInputSchema = z
  .object({
    sourceId: z.uuid(),
    targetId: z.uuid(),
    relationshipType: z.enum(relationshipTypes),
    sourcePerspective: z.enum(relationshipTypes).nullable().default(null),
    targetPerspective: z.enum(relationshipTypes).nullable().default(null),
    intensity: z.number().int().min(1).max(5).default(3),
    frequency: z.number().int().min(1).max(5).default(3),
    importance: z.number().int().min(1).max(5).default(3),
    status: z.enum(["confirmed", "uncertain", "ended"]).default("confirmed"),
    startedAt: date.nullable().default(null),
    endedAt: date.nullable().default(null),
    notes: z.string().max(20000).default(""),
  })
  .strict()
  .refine((e) => e.sourceId !== e.targetId, "selfEdge");
export const connectionSchema = edgeInputSchema
  .safeExtend({ ...metadata, canonicalKey: z.string().max(74) })
  .refine(
    (e) => e.canonicalKey === canonicalKey(e.sourceId, e.targetId),
    "canonicalKey",
  );
export const preferencesSchema = z
  .object({
    ...appearancePreferencesShape,
    language: z.enum(languageCodes).default("es"),
    theme: z.enum(["light", "dark", "system"]).default("system"),
    showLabels: z.boolean().default(true),
    showOwner: z.boolean().default(true),
    sizeMode: z
      .enum(["degree", "centrality", "importance", "combined"])
      .default("degree"),
    searchNotes: z.boolean().default(false),
    autoBackup: z.boolean().default(true),
    introduction: z.enum(["profile", "invite", "done", "skipped"]).optional(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    ownerId: z.uuid().nullable(),
    deviceId: z.uuid(),
    people: z.array(personSchema).max(10000),
    connections: z.array(connectionSchema).max(100000),
    counters: z
      .object({
        M: z.number().int().nonnegative(),
        F: z.number().int().nonnegative(),
        L: z.number().int().nonnegative(),
        U: z.number().int().nonnegative(),
      })
      .strict(),
    tombstones: z
      .array(
        z
          .object({
            entityId: z.uuid(),
            entityType: z.enum(["person", "connection"]),
            deletedAt: z.iso.datetime(),
            deletedByDeviceId: z.uuid(),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .max(100000),
    preferences: preferencesSchema,
  })
  .strict()
  .superRefine((s, ctx) => {
    const ids = new Set(s.people.map((p) => p.id)),
      files = new Set(s.people.map((p) => p.storageId)),
      keys = new Set(s.connections.map((e) => e.canonicalKey));
    const bad = (message: string) => ctx.addIssue({ code: "custom", message });
    if (ids.size !== s.people.length || files.size !== s.people.length)
      bad("duplicatePerson");
    if (
      keys.size !== s.connections.length ||
      new Set(s.connections.map((e) => e.id)).size !== s.connections.length
    )
      bad("duplicateConnection");
    if (s.ownerId !== null && !ids.has(s.ownerId)) bad("missingOwner");
    if (s.people.length > 0 && !s.ownerId) bad("missingOwner");
    for (const p of s.people)
      if (
        s.counters[p.storageId[0] as Classification] <
        Number(p.storageId.slice(1))
      )
        bad("counter");
    for (const e of s.connections)
      if (!ids.has(e.sourceId) || !ids.has(e.targetId))
        bad("danglingConnection");
    for (const t of s.tombstones)
      if (
        t.entityType === "person"
          ? ids.has(t.entityId)
          : s.connections.some((e) => e.id === t.entityId)
      )
        bad("resurrectedEntity");
  });
export type Profile = z.infer<typeof profileSchema>;
export type Person = z.infer<typeof personSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Classification = "M" | "F" | "L" | "U";
export function normalize(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
export function displayName(p: Person) {
  return p.profile.nickname || p.profile.firstName || p.profile.lastName;
}
export function canonicalKey(a: string, b: string) {
  if (a === b) throw new Error("selfEdge");
  return [a, b].sort().join("::");
}
export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 1,
    revision: 0,
    ownerId: null,
    deviceId: crypto.randomUUID(),
    people: [],
    connections: [],
    counters: { M: 0, F: 0, L: 0, U: 0 },
    tombstones: [],
    preferences: preferencesSchema.parse({}),
  };
}
export function createPerson(s: Snapshot, input: unknown): Person {
  const profile = profileSchema.parse(input),
    now = new Date().toISOString();
  profile.classification = genderClassification(profile.gender);
  const p: Person = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    storageId: `${profile.classification}${++s.counters[profile.classification]}`,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    createdByDeviceId: s.deviceId,
    updatedByDeviceId: s.deviceId,
    profile,
    display: { manualPosition: null, positionLocked: false, hidden: false },
    customFields: {},
  };
  s.people.push(p);
  if (!s.ownerId) s.ownerId = p.id;
  return p;
}
export function updatePerson(s: Snapshot, id: string, input: unknown) {
  const p = s.people.find((p) => p.id === id);
  if (!p) throw new Error("notFound");
  p.profile = profileSchema.parse(input);
  p.profile.classification = genderClassification(p.profile.gender);
  p.revision++;
  p.updatedAt = new Date().toISOString();
  p.updatedByDeviceId = s.deviceId;
}
export function upsertConnection(s: Snapshot, input: unknown) {
  const data = edgeInputSchema.parse(input);
  if (
    !s.people.some((p) => p.id === data.sourceId) ||
    !s.people.some((p) => p.id === data.targetId)
  )
    throw new Error("notFound");
  const key = canonicalKey(data.sourceId, data.targetId),
    old = s.connections.find((e) => e.canonicalKey === key),
    now = new Date().toISOString();
  const edge: Connection = {
    ...data,
    id: old?.id ?? crypto.randomUUID(),
    canonicalKey: key,
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
    revision: (old?.revision ?? 0) + 1,
    updatedByDeviceId: s.deviceId,
  };
  if (old)
    s.connections = s.connections.map((e) => (e.id === old.id ? edge : e));
  else s.connections.push(edge);
  return edge;
}
export function removeEntity(
  s: Snapshot,
  id: string,
  type: "person" | "connection",
) {
  if (type === "person" && id === s.ownerId) throw new Error("ownerProtected");
  const entity =
    type === "person"
      ? s.people.find((p) => p.id === id)
      : s.connections.find((e) => e.id === id);
  if (!entity) return;
  if (type === "person") {
    for (const e of [...s.connections])
      if (e.sourceId === id || e.targetId === id)
        removeEntity(s, e.id, "connection");
    s.people = s.people.filter((p) => p.id !== id);
  } else s.connections = s.connections.filter((e) => e.id !== id);
  s.tombstones.push({
    entityId: id,
    entityType: type,
    deletedAt: new Date().toISOString(),
    deletedByDeviceId: s.deviceId,
    revision: entity.revision + 1,
  });
}
export function ownerRelationship(s: Snapshot, id: string): RelationshipType {
  return (
    s.connections.find(
      (e) =>
        e.canonicalKey ===
        (id === s.ownerId ? "" : canonicalKey(id, s.ownerId ?? s.deviceId)),
    )?.relationshipType ?? "acquaintance"
  );
}
