import { expect, it } from "vitest";
import { wheelZoomDelta } from "../packages/graph-engine/wheel-zoom";
it("normalizes units, accelerates rapid gestures, bounds spikes and reverses direction", () => {
  expect(wheelZoomDelta(1, 1, 800, 300)).toBe(wheelZoomDelta(16, 0, 800, 300));
  expect(wheelZoomDelta(0.1, 2, 800, 300)).toBe(
    wheelZoomDelta(80, 0, 800, 300),
  );
  expect(Math.abs(wheelZoomDelta(40, 0, 800, 16))).toBeGreaterThan(
    Math.abs(wheelZoomDelta(40, 0, 800, 300)),
  );
  expect(wheelZoomDelta(-40, 0, 800, 16)).toBe(-wheelZoomDelta(40, 0, 800, 16));
  expect(Math.abs(wheelZoomDelta(999999, 0, 800, 1))).toBeLessThanOrEqual(0.65);
  expect(wheelZoomDelta(0, 0, 800, 1)).toBeCloseTo(0);
});
