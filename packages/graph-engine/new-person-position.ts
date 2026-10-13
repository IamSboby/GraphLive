import { normalize, type Person } from "../domain/model";
type Point = { x: number; y: number };
/** Seed new nodes near their shared-tag centroid, keeping all existing positions. */
export function newPersonPosition(
  person: Person,
  people: Person[],
  positions: Map<string, Point>,
  fallback: Point,
): Point {
  const tags = new Set(person.profile.tags.map(normalize));
  const occupied = people
    .filter((p) => p.id !== person.id)
    .flatMap((p) => {
      const point = positions.get(p.id) ?? p.display.manualPosition;
      return point
        ? [
            {
              point,
              weight: p.profile.tags.filter((t) => tags.has(normalize(t)))
                .length,
            },
          ]
        : [];
    });
  const weight = occupied.reduce((sum, p) => sum + p.weight, 0);
  const center = weight
    ? {
        x: occupied.reduce((sum, p) => sum + p.point.x * p.weight, 0) / weight,
        y: occupied.reduce((sum, p) => sum + p.point.y * p.weight, 0) / weight,
      }
    : fallback;
  for (let i = 0; i < 400; i++) {
    const radius = i === 0 ? 0 : 115 * Math.sqrt(i),
      angle = i * 2.39996;
    const candidate = {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
    if (
      occupied.every(
        (p) =>
          Math.hypot(candidate.x - p.point.x, candidate.y - p.point.y) >= 110,
      )
    )
      return candidate;
  }
  return { x: center.x + 2400, y: center.y };
}
