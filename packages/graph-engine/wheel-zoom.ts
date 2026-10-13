// Convert wheel units to pixels and accelerate sustained gestures.
export function wheelZoomDelta(
  delta: number,
  mode: number,
  height: number,
  elapsed: number,
) {
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? height : 1);
  if (!Number.isFinite(pixels)) return 0;
  const magnitude = Math.min(Math.abs(pixels), 600);
  const intensity = 1 + Math.min(magnitude / 160, 1.5);
  const speed = 1 + Math.max(0, 1 - elapsed / 160) * 0.75;
  return (
    -Math.sign(pixels) * Math.min(0.65, magnitude * 0.0012 * intensity * speed)
  );
}
