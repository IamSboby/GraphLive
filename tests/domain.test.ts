import { describe, it, expect } from "vitest";
import {
  emptySnapshot,
  createPerson,
  updatePerson,
  upsertConnection,
  removeEntity,
  snapshotSchema,
  profileSchema,
  canonicalKey,
  displayName,
  normalize,
} from "../packages/domain/model";
import {
  metrics,
  nodeSize,
  shortestPath,
  matchesSearch,
} from "../packages/graph-engine/metrics";
import { mergeSnapshots, migrate } from "../packages/sync-engine/merge";
import { es, en } from "../packages/i18n";
describe("Identities and validation", () => {
  it("allocates independent monotonically increasing IDs and immutable UUIDs", () => {
    const s = emptySnapshot();
    const p = createPerson(s, { nickname: "A", gender: "male" });
    createPerson(s, { lastName: "B", gender: "female" });
    createPerson(s, { firstName: "C", gender: "male" });
    expect(s.people.map((p) => p.storageId)).toEqual(["M1", "F1", "M2"]);
    const id = p.id;
    updatePerson(s, id, { nickname: "Other", gender: "female" });
    expect(p.id).toBe(id);
    expect(p.storageId).toBe("M1");
    expect(p.revision).toBe(2);
    expect(snapshotSchema.safeParse(s).success).toBe(true);
  });
  it.each([
    ["male", "M"],
    ["female", "F"],
    ["nonBinary", "L"],
    ["", "U"],
  ])("allocates prefix for %s", (gender, classification) => {
    const s = emptySnapshot();
    expect(
      createPerson(s, { nickname: "A", gender, classification: "U" }).storageId,
    ).toBe(classification + "1");
  });
  it("requires one name and validates bounds", () => {
    expect(profileSchema.safeParse({}).success).toBe(false);
    expect(
      profileSchema.safeParse({ nickname: " ", importance: 8 }).success,
    ).toBe(false);
    expect(profileSchema.safeParse({ lastName: "Álvarez" }).success).toBe(true);
    expect(
      profileSchema.safeParse({ firstName: "X", birthYear: 3000 }).success,
    ).toBe(false);
  });
  it("preserves displayed tags while eliminating normalized duplicates", () => {
    const p = profileSchema.parse({
      nickname: " A ",
      interests: [" Música ", "musica", "Viajes"],
    });
    expect(p.interests).toEqual(["Música", "Viajes"]);
    expect(normalize(" ÁNGEL  Pérez ")).toBe("angel perez");
  });
  it("uses nickname, name, surname fallback and accent-insensitive search", () => {
    const s = emptySnapshot(),
      p = createPerson(s, {
        firstName: "Ángel",
        lastName: "Pérez",
        nickname: "Ani",
        notes: "private phrase",
      });
    expect(displayName(p)).toBe("Ani");
    expect(matchesSearch(p, "angel")).toBe(true);
    expect(matchesSearch(p, "private")).toBe(false);
    expect(matchesSearch(p, "private", true)).toBe(true);
  });
});
describe("Canonical relationships", () => {
  it("updates one relationship from either end", () => {
    const s = emptySnapshot(),
      a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" });
    const e = upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "friend",
    });
    upsertConnection(s, {
      sourceId: b.id,
      targetId: a.id,
      relationshipType: "family",
      sourcePerspective: "family",
      targetPerspective: "friend",
    });
    expect(s.connections).toHaveLength(1);
    expect(s.connections[0].id).toBe(e.id);
    expect(canonicalKey(a.id, b.id)).toBe(canonicalKey(b.id, a.id));
    expect(metrics(s).get(a.id)?.degree).toBe(1);
    expect(metrics(s).get(b.id)?.degree).toBe(1);
  });
  it("rejects duplicates, self edges, dangling endpoints and incorrect counters", () => {
    const s = emptySnapshot(),
      a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" });
    expect(() =>
      upsertConnection(s, {
        sourceId: a.id,
        targetId: a.id,
        relationshipType: "friend",
      }),
    ).toThrow();
    expect(() =>
      upsertConnection(s, {
        sourceId: a.id,
        targetId: crypto.randomUUID(),
        relationshipType: "friend",
      }),
    ).toThrow();
    const e = upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "friend",
    });
    s.connections.push({ ...e, id: crypto.randomUUID() });
    expect(snapshotSchema.safeParse(s).success).toBe(false);
    s.connections.pop();
    s.counters.U = 0;
    expect(snapshotSchema.safeParse(s).success).toBe(false);
  });
  it("tombstones deleted persons and relationships", () => {
    const s = emptySnapshot(),
      a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" });
    upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "friend",
    });
    removeEntity(s, b.id, "person");
    expect(s.connections).toHaveLength(0);
    expect(s.tombstones).toHaveLength(2);
    expect(s.counters.U).toBe(2);
    expect(() => removeEntity(s, a.id, "person")).toThrow("ownerProtected");
    expect(snapshotSchema.safeParse(s).success).toBe(true);
  });
});
describe("Metrics", () => {
  it("bounds logarithmic size for zero and extremes", () => {
    expect(nodeSize(0, 50)).toBe(24);
    expect(nodeSize(1e9, 50)).toBe(68);
    expect(nodeSize(-5, 10)).toBe(24);
    expect(nodeSize(10, 50)).toBeGreaterThan(nodeSize(1, 50));
  });
  it("computes normalized affinity, bridges, components and shortest paths", () => {
    const s = emptySnapshot(),
      a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" }),
      c = createPerson(s, { nickname: "C" }),
      d = createPerson(s, { nickname: "D" });
    upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "bestFriend",
    });
    upsertConnection(s, {
      sourceId: b.id,
      targetId: c.id,
      relationshipType: "enemy",
    });
    const m = metrics(s);
    expect(m.get(a.id)?.affinity).toBe(100);
    expect(m.get(c.id)?.affinity).toBe(10);
    expect(m.get(b.id)?.bridges).toBe(2);
    expect(m.get(d.id)?.affinity).toBeNull();
    expect(shortestPath(s, a.id, c.id)).toEqual([a.id, b.id, c.id]);
    expect(shortestPath(s, a.id, d.id)).toEqual([]);
  });
});
describe("Synchronization", () => {
  it("merges independent fields and flags conflicting ones", () => {
    const base = emptySnapshot();
    createPerson(base, { nickname: "A" });
    const local = structuredClone(base),
      remote = structuredClone(base);
    local.people[0].profile.firstName = "L";
    remote.people[0].profile.lastName = "R";
    let merged = mergeSnapshots(base, local, remote);
    expect(merged.conflicts).toEqual([]);
    expect(merged.value.people[0].profile).toMatchObject({
      firstName: "L",
      lastName: "R",
    });
    remote.people[0].profile.firstName = "R";
    merged = mergeSnapshots(base, local, remote);
    expect(merged.conflicts.some((c) => c.path.endsWith("firstName"))).toBe(
      true,
    );
  });
  it("rejects unknown schema versions rather than destructive guessing", () => {
    expect(() => migrate({ schemaVersion: 2 })).toThrow();
    expect(migrate(emptySnapshot()).schemaVersion).toBe(1);
  });
  it("maintains translation key parity without missing strings", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(en).every(Boolean)).toBe(true);
  });
});

describe("Relationship additions and search terms", () => {
  it.each(["closeFriends", "partner", "crush"] as const)(
    "round-trips %s and calculates a finite affinity",
    (relationshipType) => {
      const s = emptySnapshot();
      const owner = createPerson(s, { nickname: "Owner" }),
        person = createPerson(s, { nickname: "Alex" });
      upsertConnection(s, {
        sourceId: owner.id,
        targetId: person.id,
        relationshipType,
      });
      const loaded = snapshotSchema.parse(JSON.parse(JSON.stringify(s)));
      expect(loaded.connections[0].relationshipType).toBe(relationshipType);
      expect(Number.isFinite(metrics(loaded).get(person.id)!.affinity)).toBe(
        true,
      );
    },
  );
  it("finds all terms across interests, tags and names regardless of accents or order", () => {
    const p = createPerson(emptySnapshot(), {
      nickname: "Alex",
      interests: ["Escalada lunar", "Música"],
      tags: ["Ázul"],
    });
    expect(matchesSearch(p, "AZUL escalada")).toBe(true);
    expect(matchesSearch(p, " musica  alex ")).toBe(true);
    expect(matchesSearch(p, "escalada missing")).toBe(false);
    expect(matchesSearch(p, "")).toBe(true);
  });
});

describe("connection perspective migration", () => {
  it.each([
    null,
    undefined,
    "",
    "no definido",
    "Sin especificar",
    "undefined",
    "not_defined",
  ])(
    "fills legacy missing perspective %s without changing explicit values",
    (value) => {
      const s = emptySnapshot();
      const a = createPerson(s, { nickname: "A" }),
        b = createPerson(s, { nickname: "B" });
      const edge = upsertConnection(s, {
        sourceId: a.id,
        targetId: b.id,
        relationshipType: "partner",
      });
      const raw = {
        ...s,
        connections: [
          { ...edge, sourcePerspective: value, targetPerspective: "crush" },
        ],
      };
      const migrated = snapshotSchema.parse(raw);
      expect(migrated.connections[0].sourcePerspective).toBe("partner");
      expect(migrated.connections[0].targetPerspective).toBe("crush");
      expect(migrated.connections[0].id).toBe(edge.id);
      expect(migrated.connections[0].sourceId).toBe(a.id);
      expect(snapshotSchema.parse(migrated)).toEqual(migrated);
    },
  );
  it("fills both sides for new connections and rejects unknown relationship values", () => {
    const s = emptySnapshot();
    const a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" });
    const e = upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "closeFriends",
    });
    expect(e.sourcePerspective).toBe("closeFriends");
    expect(e.targetPerspective).toBe("closeFriends");
    expect(() =>
      upsertConnection(s, {
        sourceId: a.id,
        targetId: b.id,
        relationshipType: "closeFriends",
        sourcePerspective: "invalid",
      }),
    ).toThrow();
  });
});
