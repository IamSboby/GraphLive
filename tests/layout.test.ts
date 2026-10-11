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

it("groups shared normalized tags without changing saved connections or fixed nodes", () => {
  const input = {
    nodes: Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      x: Math.cos(i) * 200,
      y: Math.sin(i) * 200,
      fixed: false,
      tags: [i % 2 ? " MUSIC " : "sport"],
    })),
    edges: [],
  };
  input.nodes[3].tags = ["músic"];
  const original = structuredClone(input);
  const result = computeLayout(input);
  let shared = 0,
    different = 0,
    sc = 0,
    dc = 0;
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const distance = Math.hypot(
        result[i].x - result[j].x,
        result[i].y - result[j].y,
      );
      if (i % 2 === j % 2) {
        shared += distance;
        sc++;
      } else {
        different += distance;
        dc++;
      }
    }
  expect(shared / sc).toBeLessThan(different / dc);
  expect(input).toEqual(original);
  expect(result).toHaveLength(8);
  input.nodes[0].fixed = true;
  expect(computeLayout(input)[0]).toEqual({ id: "0", x: 200, y: 0 });
});
