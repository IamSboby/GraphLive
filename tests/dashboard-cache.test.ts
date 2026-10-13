import { it, expect } from "vitest";
import { emptySnapshot, createPerson } from "../packages/domain/model";
import { summarizeNetwork, sortNetworks } from "../packages/ui/dashboard-cache";
import { mergeSnapshots } from "../packages/sync-engine/merge";
it("dashboard summaries omit people, connections and private notes and sort by modification", () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Owner", notes: "Private notes" });
  data.preferences.lastEditedAt = "2026-10-12T12:00:00.000Z";
  const first = summarizeNetwork("a", data);
  const second = { ...first, id: "b", modifiedAt: "2027-01-01T00:00:00.000Z" };
  expect(JSON.stringify(first)).not.toContain("Private notes");
  expect(first).not.toHaveProperty("data");
  expect(first.peopleCount).toBe(1);
  expect(sortNetworks([first, second]).map((e) => e.id)).toEqual(["b", "a"]);
});
it("concurrent last-edited timestamps merge without creating a user conflict", () => {
  const base = emptySnapshot(),
    local = structuredClone(base),
    remote = structuredClone(base);
  local.preferences.lastEditedAt = "2026-10-12T12:00:00.000Z";
  remote.preferences.lastEditedAt = "2026-10-12T13:00:00.000Z";
  const result = mergeSnapshots(base, local, remote);
  expect(result.conflicts).toHaveLength(0);
  expect(result.value.preferences.lastEditedAt).toBe(
    remote.preferences.lastEditedAt,
  );
});
