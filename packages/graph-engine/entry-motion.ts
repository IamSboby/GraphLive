import type { Core } from "cytoscape";

/** A visual introduction only: always restore the exact saved geometry. */
export function animateEntry(c: Core, complete: () => void) {
  const nodes = c.nodes().map((node) => ({
    node,
    target: { ...node.position() },
    locked: node.locked(),
    opacity: Number(node.style("opacity")),
  }));
  const center = nodes.reduce(
    (sum, { target }) => ({
      x: sum.x + target.x / nodes.length,
      y: sum.y + target.y / nodes.length,
    }),
    { x: 0, y: 0 },
  );
  const radius = Math.max(
    1,
    ...nodes.map(({ target }) =>
      Math.hypot(target.x - center.x, target.y - center.y),
    ),
  );
  const edges = c.edges().map((edge) => ({
    edge,
    opacity: Number(edge.style("opacity")),
  }));
  const revealed = new Map<string, number>();
  let frame = 0,
    start: number | undefined,
    finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    if (!c.destroyed())
      c.batch(() => {
        nodes.forEach(({ node, target, locked }) => {
          node.position(target);
          node.removeStyle("opacity text-opacity");
          if (locked) node.lock();
        });
        edges.forEach(({ edge }) => edge.removeStyle("opacity"));
      });
    complete();
  };
  c.batch(() => nodes.forEach(({ node }) => node.unlock()));
  const tick = (time: number) => {
    if (finished || c.destroyed()) return;
    start ??= time;
    const elapsed = time - start;
    c.batch(() => {
      nodes.forEach(({ node, target, opacity }, i) => {
        const dx = target.x - center.x,
          dy = target.y - center.y;
        const delay = (Math.hypot(dx, dy) / radius) * 220 + (i % 7) * 18;
        const t = Math.max(0, Math.min(1, (elapsed - delay) / 1250));
        // A damped spring lets the graph breathe before settling in place.
        const spring = 1 - Math.exp(-7 * t) * Math.cos(7 * t);
        const spread = t === 1 ? 1 : 0.035 + 0.965 * spring;
        const bend = Math.sin(t * Math.PI) * (1 - t) * 0.12;
        node.position({
          x: center.x + dx * spread - dy * bend,
          y: center.y + dy * spread + dx * bend,
        });
        const alpha = Math.min(1, t * 5);
        revealed.set(node.id(), alpha);
        node.style({
          opacity: alpha * opacity,
          "text-opacity": Math.max(0, (t - 0.4) / 0.6),
        });
      });
      edges.forEach(({ edge, opacity }) => {
        const alpha = Math.min(
          revealed.get(edge.source().id()) ?? 0,
          revealed.get(edge.target().id()) ?? 0,
        );
        edge.style("opacity", opacity * alpha * Math.min(1, elapsed / 650));
      });
    });
    if (elapsed >= 1600) finish();
    else frame = requestAnimationFrame(tick);
  };
  tick(performance.now());
  return finish;
}
