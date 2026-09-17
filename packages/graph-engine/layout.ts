import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
export type LayoutInput = {
  nodes: { id: string; x: number; y: number; fixed: boolean }[];
  edges: { source: string; target: string }[];
};
export function computeLayout(input: LayoutInput) {
  const graph = new Graph();
  for (const n of input.nodes)
    graph.addNode(n.id, { x: n.x, y: n.y, fixed: n.fixed, size: 55 });
  for (const e of input.edges)
    if (
      graph.hasNode(e.source) &&
      graph.hasNode(e.target) &&
      !graph.hasEdge(e.source, e.target)
    )
      graph.addEdge(e.source, e.target, { weight: 1 });
  if (graph.order > 1)
    forceAtlas2.assign(graph, {
      iterations: 150,
      settings: {
        ...forceAtlas2.inferSettings(graph),
        barnesHutOptimize: true,
        adjustSizes: true,
        gravity: 0.5,
        scalingRatio: 30,
        slowDown: 5,
      },
    });
  const nodes = input.nodes.map((n) => ({
    ...n,
    x: graph.getNodeAttribute(n.id, "x") as number,
    y: graph.getNodeAttribute(n.id, "y") as number,
  }));
  const clearance = 115;
  for (let pass = 0; pass < 20; pass++) {
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i],
        key = `${Math.floor(n.x / clearance)},${Math.floor(n.y / clearance)}`;
      const list = buckets.get(key) ?? [];
      list.push(i);
      buckets.set(key, list);
    }
    let adjusted = false;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i],
        gx = Math.floor(a.x / clearance),
        gy = Math.floor(a.y / clearance);
      for (let x = gx - 1; x <= gx + 1; x++)
        for (let y = gy - 1; y <= gy + 1; y++)
          for (const j of buckets.get(`${x},${y}`) ?? []) {
            if (j <= i) continue;
            const b = nodes[j];
            if (a.fixed && b.fixed) continue;
            let dx = b.x - a.x,
              dy = b.y - a.y,
              distance = Math.hypot(dx, dy);
            if (distance >= clearance) continue;
            if (distance < 0.001) {
              dx = 1;
              dy = 0;
              distance = 1;
            }
            const shift = (clearance - distance) / (a.fixed || b.fixed ? 1 : 2);
            if (!a.fixed) {
              a.x -= (dx / distance) * shift;
              a.y -= (dy / distance) * shift;
            }
            if (!b.fixed) {
              b.x += (dx / distance) * shift;
              b.y += (dy / distance) * shift;
            }
            adjusted = true;
          }
    }
    if (!adjusted) break;
  }
  return nodes.map(({ id, x, y }) => ({ id, x, y }));
}
