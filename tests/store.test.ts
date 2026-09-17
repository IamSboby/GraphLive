import { it, expect } from "vitest";
import { useNetwork } from "../packages/ui/store";
import {
  emptySnapshot,
  createPerson,
  type Snapshot,
} from "../packages/domain/model";
import type { Repository } from "../packages/storage-core";
it("queues edits made while a save is in flight without dropping data", async () => {
  let persisted = emptySnapshot();
  createPerson(persisted, { nickname: "Owner" });
  let release: () => void = () => {};
  let count = 0;
  const repo: Repository = {
    load: async () => persisted,
    save: async (value: Snapshot, revision: number) => {
      if (++count === 1)
        await new Promise<void>((r) => {
          release = r;
        });
      persisted = { ...structuredClone(value), revision: revision + 1 };
      return persisted;
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => persisted,
  };
  useNetwork.getState().open(persisted, repo);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.firstName = "First";
  });
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.lastName = "Last";
  });
  release();
  await expect.poll(() => useNetwork.getState().dirty).toBe(false);
  expect(persisted.people[0].profile).toMatchObject({
    firstName: "First",
    lastName: "Last",
  });
  expect(persisted.revision).toBe(2);
});
