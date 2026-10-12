import {
  type Snapshot,
  type Person,
  type RelationshipType,
  normalize,
} from "../domain/model";
export const affinityWeights: Record<RelationshipType, number> = {
  bestFriend: 100,
  closeFriends: 90,
  partner: 100,
  married: 100,
  crush: 60,
  family: 75,
  friend: 70,
  almostFriend: 45,
  colleague: 35,
  acquaintance: 20,
  awkward: -25,
  enemy: -80,
};
export function nodeSize(
  value: number,
  max: number,
  minSize = 24,
  maxSize = 68,
) {
  return (
    minSize +
    ((maxSize - minSize) * Math.log1p(Math.max(0, Math.min(value, max)))) /
      Math.log1p(Math.max(1, max))
  );
}
export function adjacency(s: Snapshot) {
  const map = new Map(s.people.map((p) => [p.id, new Set<string>()]));
  for (const e of s.connections) {
    map.get(e.sourceId)?.add(e.targetId);
    map.get(e.targetId)?.add(e.sourceId);
  }
  return map;
}
export function shortestPath(s: Snapshot, from: string, to: string) {
  const a = adjacency(s),
    parent = new Map<string, string | null>([[from, null]]),
    q = [from];
  for (let i = 0; i < q.length; i++) {
    const id = q[i];
    if (id === to) break;
    for (const n of a.get(id) ?? [])
      if (!parent.has(n)) {
        parent.set(n, id);
        q.push(n);
      }
  }
  if (!parent.has(to)) return [];
  const out: string[] = [];
  for (let x: string | null = to; x !== null; x = parent.get(x) ?? null)
    out.unshift(x);
  return out;
}
export function metrics(s: Snapshot) {
  const a = adjacency(s),
    community = new Map<string, number>();
  let group = 0;
  for (const p of s.people)
    if (!community.has(p.id)) {
      group++;
      const q = [p.id];
      community.set(p.id, group);
      for (let i = 0; i < q.length; i++)
        for (const n of a.get(q[i]) ?? [])
          if (!community.has(n)) {
            community.set(n, group);
            q.push(n);
          }
    }
  const depth = new Map<string, number>(),
    low = new Map<string, number>(),
    bridges = new Map<string, number>();
  let clock = 0;
  // Iterative Tarjan traversal avoids call-stack overflow on long chains.
  for (const p of s.people) {
    if (depth.has(p.id)) continue;
    const stack: {
      id: string;
      parent: string | null;
      neighbors: Iterator<string>;
    }[] = [];
    const enter = (id: string, parent: string | null) => {
      depth.set(id, ++clock);
      low.set(id, clock);
      stack.push({
        id,
        parent,
        neighbors: (a.get(id) ?? new Set<string>()).values(),
      });
    };
    enter(p.id, null);
    while (stack.length) {
      const f = stack[stack.length - 1],
        next = f.neighbors.next();
      if (!next.done) {
        const n = next.value;
        if (n === f.parent) continue;
        if (!depth.has(n)) enter(n, f.id);
        else low.set(f.id, Math.min(low.get(f.id)!, depth.get(n)!));
      } else {
        stack.pop();
        if (f.parent) {
          low.set(f.parent, Math.min(low.get(f.parent)!, low.get(f.id)!));
          if (low.get(f.id)! > depth.get(f.parent)!) {
            bridges.set(f.id, (bridges.get(f.id) ?? 0) + 1);
            bridges.set(f.parent, (bridges.get(f.parent) ?? 0) + 1);
          }
        }
      }
    }
  }
  const edges = new Map(
    s.people.map((p) => [p.id, [] as Snapshot["connections"]]),
  );
  for (const e of s.connections) {
    edges.get(e.sourceId)?.push(e);
    edges.get(e.targetId)?.push(e);
  }
  return new Map(
    s.people.map((p) => {
      const es = edges.get(p.id)!,
        degree = a.get(p.id)!.size,
        weight = es.reduce((n, e) => n + e.intensity, 0);
      return [
        p.id,
        {
          degree,
          centrality: degree / Math.max(1, s.people.length - 1),
          community: community.get(p.id)!,
          bridges: bridges.get(p.id) ?? 0,
          intensity: es.length
            ? es.reduce((n, e) => n + e.intensity, 0) / es.length
            : null,
          affinity: weight
            ? Math.round(
                (es.reduce(
                  (n, e) =>
                    n + affinityWeights[e.relationshipType] * e.intensity,
                  0,
                ) /
                  weight +
                  100) /
                  2,
              )
            : null,
        },
      ];
    }),
  );
}
export function matchesSearch(p: Person, query: string, notes = false) {
  const haystack = normalize(
    [
      p.profile.firstName,
      p.profile.lastName,
      p.profile.nickname,
      ...p.profile.interests,
      ...p.profile.tags,
      ...p.profile.nationalities,
      ...(notes ? [p.profile.notes] : []),
    ].join(" "),
  );
  return normalize(query)
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
