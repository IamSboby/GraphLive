import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
export type LayoutInput = {
  nodes: {
    id: string;
    x: number;
    y: number;
    fixed: boolean;
    tags?: string[];
  }[];
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
  // Temporary anchors influence geometry only; they never become saved relationships.
  const groups = new Map<string, typeof input.nodes>();
  for (const node of input.nodes) {
    const tags = new Set(
      (node.tags ?? [])
        .map((tag) =>
          tag
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );
    for (const tag of tags) {
      const members = groups.get(tag) ?? [];
      members.push(node);
      groups.set(tag, members);
    }
  }
  let groupIndex = 0;
  const seeds = new Map<string, { x: number; y: number; count: number }>();
  for (const [, members] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (members.length < 2) continue;
    const angle = groupIndex * 2.39996;
    const radius =
      Math.sqrt(groupIndex + 1) * (300 + Math.sqrt(members.length) * 100);
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    let id = "layout-tag-" + groupIndex++;
    while (graph.hasNode(id)) id += "-";
    graph.addNode(id, { x, y, size: 1 });
    for (const member of members) {
      graph.addEdge(id, member.id, { weight: 3 });
      const seed = seeds.get(member.id) ?? { x: 0, y: 0, count: 0 };
      seed.x += x;
      seed.y += y;
      seed.count++;
      seeds.set(member.id, seed);
    }
  }
  for (const node of input.nodes) {
    const seed = seeds.get(node.id);
    if (seed && !node.fixed) {
      graph.setNodeAttribute(node.id, "x", seed.x / seed.count + node.x * 0.15);
      graph.setNodeAttribute(node.id, "y", seed.y / seed.count + node.y * 0.15);
    }
  }
  if (graph.order > 1)
    forceAtlas2.assign(graph, {
      iterations: groups.size ? 350 : 150,
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
    x: n.fixed ? n.x : (graph.getNodeAttribute(n.id, "x") as number),
    y: n.fixed ? n.y : (graph.getNodeAttribute(n.id, "y") as number),
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
