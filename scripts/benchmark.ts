import {
  emptySnapshot,
  createPerson,
  upsertConnection,
  snapshotSchema,
} from "../packages/domain/model";
import { metrics } from "../packages/graph-engine/metrics";
import { computeLayout } from "../packages/graph-engine/layout";
for (const count of [500, 1000]) {
  const s = emptySnapshot();
  for (let i = 0; i < count; i++) createPerson(s, { nickname: `Person ${i}` });
  for (let i = 1; i < count; i++)
    for (let j = 1; j <= Math.min(i, 4); j++)
      upsertConnection(s, {
        sourceId: s.people[i].id,
        targetId: s.people[i - j].id,
        relationshipType: "friend",
      });
  const t = performance.now();
  snapshotSchema.parse(s);
  const validated = performance.now();
  metrics(s);
  const measured = performance.now();
  computeLayout({
    nodes: s.people.map((p, i) => ({
      id: p.id,
      x: Math.cos(i * 2.4) * Math.sqrt(i) * 75,
      y: Math.sin(i * 2.4) * Math.sqrt(i) * 75,
      fixed: false,
    })),
    edges: s.connections.map((e) => ({
      source: e.sourceId,
      target: e.targetId,
    })),
  });
  console.log(
    JSON.stringify({
      nodes: count,
      edges: s.connections.length,
      validationMs: Math.round(validated - t),
      metricsMs: Math.round(measured - validated),
      layoutMs: Math.round(performance.now() - measured),
      bytes: JSON.stringify(s).length,
    }),
  );
}
