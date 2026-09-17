import { snapshotSchema, type Snapshot } from "../domain/model";
export class ConflictError extends Error {
  constructor(public remote: Snapshot) {
    super("conflict");
  }
}
export type Conflict = {
  path: string;
  base: unknown;
  local: unknown;
  remote: unknown;
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function mergeSnapshots(
  base: Snapshot,
  local: Snapshot,
  remote: Snapshot,
): { value: Snapshot; conflicts: Conflict[] } {
  const conflicts: Conflict[] = [];
  function merge(b: unknown, l: unknown, r: unknown, path: string): unknown {
    if (equal(l, r) || equal(r, b)) return l;
    if (equal(l, b)) return r;
    if (record(b) && record(l) && record(r)) {
      return Object.fromEntries(
        [
          ...new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]),
        ].map((k) => [k, merge(b[k], l[k], r[k], `${path}.${k}`)]),
      );
    }
    if (
      ["people", "connections"].includes(path) &&
      Array.isArray(b) &&
      Array.isArray(l) &&
      Array.isArray(r)
    ) {
      const key = (v: unknown) => (v as { id: string }).id;
      const bm = new Map(b.map((v) => [key(v), v])),
        lm = new Map(l.map((v) => [key(v), v])),
        rm = new Map(r.map((v) => [key(v), v]));
      return [...new Set([...bm.keys(), ...lm.keys(), ...rm.keys()])]
        .map((id) => merge(bm.get(id), lm.get(id), rm.get(id), `${path}.${id}`))
        .filter((v) => v !== undefined);
    }
    if (
      path.endsWith(".revision") &&
      typeof l === "number" &&
      typeof r === "number"
    )
      return Math.max(l, r) + 1;
    if (path.endsWith(".updatedAt")) return new Date().toISOString();
    if (path.endsWith(".updatedByDeviceId")) return local.deviceId;
    conflicts.push({ path, base: b, local: l, remote: r });
    return l;
  }
  const value = {
    ...local,
    revision: remote.revision,
    people: merge(base.people, local.people, remote.people, "people"),
    connections: merge(
      base.connections,
      local.connections,
      remote.connections,
      "connections",
    ),
    preferences: merge(
      base.preferences,
      local.preferences,
      remote.preferences,
      "preferences",
    ),
    counters: Object.fromEntries(
      Object.keys(local.counters).map((k) => [
        k,
        Math.max(
          local.counters[k as keyof typeof local.counters],
          remote.counters[k as keyof typeof remote.counters],
        ),
      ]),
    ),
    tombstones: [
      ...new Map(
        [...local.tombstones, ...remote.tombstones].map((t) => [t.entityId, t]),
      ).values(),
    ],
  };
  const parsed = snapshotSchema.safeParse(value);
  if (!parsed.success)
    conflicts.push({
      path: "integrity",
      base: null,
      local: null,
      remote: null,
    });
  return { value: parsed.success ? parsed.data : local, conflicts };
}
export function migrate(input: unknown): Snapshot {
  return snapshotSchema.parse(input);
}
export async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ConflictError || attempts <= 1) throw e;
    await new Promise((r) => setTimeout(r, 200 * 2 ** (3 - attempts)));
    return retry(fn, attempts - 1);
  }
}
