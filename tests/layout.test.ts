import { it, expect } from "vitest";
import { computeLayout } from "../packages/graph-engine/layout";
it("separates densely connected nodes and preserves fixed positions", () => {
  const nodes = Array.from({ length: 28 }, (_, i) => ({
    id: String(i),
    x: Math.cos(i) * 200,
    y: Math.sin(i) * 200,
    fixed: i === 0,
  }));
  const result = computeLayout({
    nodes,
    edges: nodes.slice(1).map((n) => ({ source: "0", target: n.id })),
  });
  expect(result[0].x).toBe(nodes[0].x);
  expect(result[0].y).toBe(nodes[0].y);
  for (let i = 0; i < result.length; i++)
    for (let j = i + 1; j < result.length; j++)
      expect(
        Math.hypot(result[i].x - result[j].x, result[i].y - result[j].y),
      ).toBeGreaterThan(90);
});
