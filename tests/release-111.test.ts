import { it, expect } from "vitest";
import {
  emptySnapshot,
  createPerson,
  visibleYear,
} from "../packages/domain/model";
import { newPersonPosition } from "../packages/graph-engine/new-person-position";
import { socialUrl, socialProfileSchema } from "../packages/domain/social";
it("new tagged people are positioned near matching people without moving existing nodes", () => {
  const data = emptySnapshot(),
    a = createPerson(data, { nickname: "A", tags: ["Música"] }),
    b = createPerson(data, { nickname: "B", tags: ["Sports"] }),
    c = createPerson(data, { nickname: "C", tags: ["musica"] });
  const positions = new Map([
    [a.id, { x: 1000, y: 0 }],
    [b.id, { x: -1000, y: 0 }],
  ]);
  const before = structuredClone(positions);
  const point = newPersonPosition(c, data.people, positions, { x: 0, y: 0 });
  expect(Math.hypot(point.x - 1000, point.y)).toBeLessThan(300);
  expect(positions).toEqual(before);
});
it("year visibility keeps known years and supports birth dates", () => {
  const data = emptySnapshot(),
    p = createPerson(data, { nickname: "A" });
  expect(visibleYear(p.profile, data.preferences)).toBe("N/A");
  data.preferences.hideUnknownYears = true;
  expect(visibleYear(p.profile, data.preferences)).toBe("");
  p.profile.birthDate = "2000-01-01";
  expect(visibleYear(p.profile, data.preferences)).toBe("2000");
  data.preferences.hideYears = true;
  expect(visibleYear(p.profile, data.preferences)).toBe("");
  expect(p.profile.birthDate).toBe("2000-01-01");
});
it("social handles become safe links and executable schemes are rejected", () => {
  expect(socialUrl("Instagram", "@alex")).toBe(
    "https://www.instagram.com/alex",
  );
  expect(
    socialProfileSchema.safeParse({
      platform: "other",
      label: "Site",
      url: "javascript:alert(1)",
    }).success,
  ).toBe(false);
  expect(
    socialProfileSchema.safeParse({
      platform: "other",
      label: "Site",
      url: "https://example.com/alex",
    }).success,
  ).toBe(true);
});
