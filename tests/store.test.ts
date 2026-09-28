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
it("automatic position persistence does not consume undo or discard redo", () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Owner" });
  useNetwork.getState().open(data, null, true);
  useNetwork.getState().mutate((s) => {
    createPerson(s, { nickname: "Friend" });
  });
  useNetwork.getState().mutate((s) => {
    s.people[1].display.manualPosition = { x: 200, y: 100 };
  }, false);
  useNetwork.getState().undo();
  expect(useNetwork.getState().data!.people).toHaveLength(1);
  useNetwork.getState().mutate((s) => {
    s.people[0].display.manualPosition = { x: 0, y: 0 };
  }, false);
  useNetwork.getState().redo();
  expect(useNetwork.getState().data!.people).toHaveLength(2);
  expect(useNetwork.getState().data!.people[1].display.manualPosition).toEqual({
    x: 200,
    y: 100,
  });
});
