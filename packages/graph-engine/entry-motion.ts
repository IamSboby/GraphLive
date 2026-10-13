import type { Core } from "cytoscape";

/** Independent visual entrances; never persist intermediate geometry. */
export function animateEntry(c: Core, complete: () => void) {
  const nodes = c.nodes().map((node, i) => ({
    node,
    target: { ...node.position() },
    locked: node.locked(),
    opacity: Number(node.style("opacity")),
    width: node.width(),
    height: node.height(),
    delay: i === 0 ? 0 : 100 + ((i * 0.618034) % 1) * 750,
    duration: 600 + (i % 5) * 45,
    angle: i * 2.39996,
  }));
  const timings = new Map(nodes.map((n) => [n.node.id(), n]));
  const edges = c.edges().map((edge, i) => ({
    edge,
    opacity: Number(edge.style("opacity")),
    delay:
      Math.max(
        timings.get(edge.source().id())!.delay,
        timings.get(edge.target().id())!.delay,
      ) +
      250 +
      (i % 5) * 40,
  }));
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
          node.removeStyle("opacity text-opacity width height");
          if (locked) node.lock();
        });
        edges.forEach(({ edge }) =>
          edge.removeStyle(
            "opacity line-style line-dash-pattern line-dash-offset underlay-opacity",
          ),
        );
      });
    complete();
  };
  c.batch(() => nodes.forEach(({ node }) => node.unlock()));
  const tick = (time: number) => {
    if (finished || c.destroyed()) return;
    start ??= time;
    const elapsed = time - start;
    c.batch(() => {
      nodes.forEach(
        (
          { node, target, opacity, width, height, delay, duration, angle },
          i,
        ) => {
          const t = Math.max(0, Math.min(1, (elapsed - delay) / duration));
          const spring = t === 1 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(7 * t);
          const distance = (65 + (i % 4) * 20) * (1 - spring);
          node.position({
            x: target.x + Math.cos(angle) * distance,
            y: target.y + Math.sin(angle) * distance,
          });
          const size = 0.3 + 0.7 * spring;
          node.style({
            opacity: Math.min(1, t * 4) * opacity,
            width: width * size,
            height: height * size,
            "text-opacity": Math.max(0, (t - 0.4) / 0.6),
          });
        },
      );
      edges.forEach(({ edge, opacity, delay }) => {
        const t = Math.max(0, Math.min(1, (elapsed - delay) / 650));
        const a = edge.source().position(),
          b = edge.target().position();
        const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
        edge.style({
          opacity: opacity * Math.min(1, t * 5),
          "line-style": "dashed",
          "line-dash-pattern": [Math.max(0.1, length * t), length * 2 + 1],
          "line-dash-offset": 0,
          "underlay-opacity": 0,
        });
      });
    });
    if (elapsed >= 2050) finish();
    else frame = requestAnimationFrame(tick);
  };
  tick(performance.now());
  return finish;
}
