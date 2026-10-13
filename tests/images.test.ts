import { expect, it } from "vitest";
import {
  emptySnapshot,
  snapshotSchema,
  createPerson,
} from "../packages/domain/model";
it("accepts legacy snapshots and preserves embedded images in round trips", () => {
  const data = emptySnapshot();
  const person = createPerson(data, { nickname: "Alex" });
  expect(snapshotSchema.parse(data).people[0].profile.portrait).toBeUndefined();
  person.profile.portrait = "data:image/jpeg;base64,/9j/AA==";
  data.preferences.banner = person.profile.portrait;
  const loaded = snapshotSchema.parse(JSON.parse(JSON.stringify(data)));
  expect(loaded.people[0].profile.portrait).toBe(person.profile.portrait);
  expect(loaded.preferences.banner).toBe(data.preferences.banner);
});
it("rejects external, SVG and oversized images in imported networks", () => {
  const data = emptySnapshot();
  const person = createPerson(data, { nickname: "Alex" });
  for (const image of [
    "https://example.com/a.jpg",
    "data:image/svg+xml;base64,AAAA",
    "data:image/jpeg;base64,/9j/" + "A".repeat(120000),
  ]) {
    person.profile.portrait = image;
    expect(snapshotSchema.safeParse(data).success).toBe(false);
  }
});
