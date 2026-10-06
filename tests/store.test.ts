import { it, expect, vi, afterEach } from "vitest";
import { outbox } from "../packages/storage-core/outbox";
import { ConflictError } from "../packages/sync-engine/merge";
afterEach(() => {
  useNetwork.getState().close();
  vi.restoreAllMocks();
});
import { useNetwork } from "../packages/ui/store";
import {
  emptySnapshot,
  createPerson,
  type Snapshot,
} from "../packages/domain/model";
import type { Repository } from "../packages/storage-core";
it("does not replay pending edits, migrate or mutate a read-only shared network", async () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Shared Alex" });
  const list = vi.spyOn(outbox, "list");
  const save = vi.fn();
  const repo: Repository = {
    readOnly: true,
    requiresMigration: true,
    journalScope: "shared:test",
    load: async () => data,
    save,
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  useNetwork.getState().mutate((d) => {
    d.preferences.networkName = "Not allowed";
  });
  await useNetwork.getState().persist();
  expect(useNetwork.getState().data?.preferences.networkName).toBeUndefined();
  expect(useNetwork.getState().dirty).toBe(false);
  expect(list).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
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
  await expect.poll(() => count).toBe(1);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.lastName = "Last";
  });
  await expect.poll(() => count).toBe(1);
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
it("coalesces rapid edits into one write", async () => {
  let count = 0;
  const data = emptySnapshot();
  createPerson(data, { nickname: "Owner" });
  const repo: Repository = {
    load: async () => data,
    save: async (value) => {
      count++;
      return { ...value, revision: 1 };
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  for (const theme of ["dark", "light", "system"] as const)
    useNetwork.getState().mutate((s) => {
      s.preferences.theme = theme;
    });
  await expect.poll(() => useNetwork.getState().dirty).toBe(false);
  expect(count).toBe(1);
});
it("ignores an old repository response after another network is opened", async () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Old" });
  let release!: (s: Snapshot) => void;
  const repo: Repository = {
    load: async () => data,
    save: () =>
      new Promise((r) => {
        release = r;
      }),
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  useNetwork.getState().mutate((s) => {
    s.preferences.theme = "dark";
  });
  const pending = useNetwork.getState().persist();
  await expect.poll(() => Boolean(release)).toBe(true);
  const other = emptySnapshot();
  createPerson(other, { nickname: "New" });
  await useNetwork.getState().open(other, null, true);
  release({ ...data, revision: 2 });
  await pending;
  expect(useNetwork.getState().data!.people[0].profile.nickname).toBe("New");
  expect(useNetwork.getState().base!.revision).toBe(0);
});
it("allows undo while a save is in flight and persists the latest state", async () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Owner" });
  let release!: () => void;
  let calls = 0;
  let stored = data;
  const repo: Repository = {
    load: async () => stored,
    save: async (value, revision) => {
      if (++calls === 1)
        await new Promise<void>((r) => {
          release = r;
        });
      stored = { ...value, revision: revision + 1 };
      return stored;
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  useNetwork.getState().mutate((s) => {
    s.preferences.theme = "dark";
  });
  const pending = useNetwork.getState().persist();
  await expect.poll(() => Boolean(release)).toBe(true);
  useNetwork.getState().undo();
  expect(useNetwork.getState().data!.preferences.theme).toBe(
    data.preferences.theme,
  );
  release();
  await pending;
  expect(stored.preferences.theme).toBe(data.preferences.theme);
  expect(useNetwork.getState().dirty).toBe(false);
});
it("merges a remote update with edits made during the conflicting upload", async () => {
  const base = emptySnapshot();
  createPerson(base, { nickname: "Owner" });
  let rejectSave!: (e: Error) => void;
  let calls = 0;
  let stored = base;
  const repo: Repository = {
    load: async () => stored,
    save: async (value, revision) => {
      if (++calls === 1)
        return new Promise<Snapshot>((_, reject) => {
          rejectSave = reject;
        });
      stored = { ...value, revision: revision + 1 };
      return stored;
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => base,
  };
  await useNetwork.getState().open(base, repo);
  useNetwork.getState().mutate((s) => {
    s.preferences.theme = "dark";
  });
  const pending = useNetwork.getState().persist();
  await expect.poll(() => Boolean(rejectSave)).toBe(true);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.firstName = "Local";
  });
  const remote = structuredClone(base);
  remote.revision = 1;
  remote.people[0].profile.lastName = "Remote";
  rejectSave(new ConflictError(remote));
  await pending;
  expect(stored.preferences.theme).toBe("dark");
  expect(stored.people[0].profile).toMatchObject({
    firstName: "Local",
    lastName: "Remote",
  });
});
it("recovers scoped durable edits and keeps them if the destination fails", async () => {
  const base = emptySnapshot();
  createPerson(base, { nickname: "Owner" });
  const draft = structuredClone(base);
  draft.preferences.theme = "dark";
  const list = vi.spyOn(outbox, "list").mockResolvedValue([
    {
      id: "old",
      scope: "account:" + base.ownerId,
      version: "1",
      base,
      data: draft,
    },
  ]);
  const put = vi.spyOn(outbox, "put").mockResolvedValue();
  const remove = vi.spyOn(outbox, "remove").mockResolvedValue();
  const repo: Repository = {
    journalScope: "account",
    load: async () => base,
    save: async () => {
      throw Error("driveExpired");
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => base,
  };
  await useNetwork.getState().open(base, repo);
  await useNetwork.getState().persist();
  expect(list).toHaveBeenCalledWith("account:" + base.ownerId);
  expect(useNetwork.getState().data!.preferences.theme).toBe("dark");
  expect(useNetwork.getState().localSaved).toBe(true);
  expect(useNetwork.getState().dirty).toBe(true);
  expect(put.mock.calls.at(-1)![0].data.preferences.theme).toBe("dark");
  expect(remove.mock.calls.every(([v]) => v.id === "old")).toBe(true);
});
it("does not claim local durability when the outbox is full", async () => {
  const base = emptySnapshot();
  createPerson(base, { nickname: "Owner" });
  vi.spyOn(outbox, "list").mockResolvedValue([]);
  vi.spyOn(outbox, "put").mockRejectedValue(Error("QuotaExceededError"));
  const save = vi.fn(async (value: Snapshot) => value);
  const repo: Repository = {
    journalScope: "account",
    load: async () => base,
    save,
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => base,
  };
  await useNetwork.getState().open(base, repo);
  useNetwork.getState().mutate((s) => {
    s.preferences.theme = "dark";
  });
  await useNetwork.getState().persist();
  expect(useNetwork.getState().localSaved).toBe(false);
  expect(useNetwork.getState().localError).toBe("localSaveFailed");
  expect(save).not.toHaveBeenCalled();
  expect(useNetwork.getState().data!.preferences.theme).toBe("dark");
});
it("switching checkpoints the latest identity without waiting for a remote save", async () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Real identity" });
  const put = vi.spyOn(outbox, "put").mockResolvedValue();
  vi.spyOn(outbox, "list").mockResolvedValue([]);
  vi.spyOn(outbox, "remove").mockResolvedValue();
  let stored = data,
    first = true;
  let release!: (data: Snapshot) => void;
  const repo: Repository = {
    journalScope: "drive:account:personal",
    load: async () => stored,
    save: async (value, revision) => {
      if (first) {
        first = false;
        return new Promise((resolve) => {
          release = (saved) => {
            stored = saved;
            resolve(saved);
          };
        });
      }
      stored = { ...value, revision: revision + 1 };
      return stored;
    },
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.nickname = "Updated identity";
  });
  const flight = useNetwork.getState().persist();
  await expect.poll(() => Boolean(release)).toBe(true);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.lastName = "Pending";
  });
  expect(await useNetwork.getState().prepareSwitch()).toBe(true);
  expect(put.mock.calls.at(-1)![0].data.people[0].profile.lastName).toBe(
    "Pending",
  );
  expect(put.mock.calls.at(-1)![0].scope).toBe(
    "drive:account:personal:" + data.ownerId,
  );
  const game = emptySnapshot();
  createPerson(game, { nickname: "Mage" });
  await useNetwork
    .getState()
    .open(game, { ...repo, journalScope: "drive:account:game" });
  release({ ...data, revision: 1 });
  await flight;
  await expect.poll(() => stored.people[0].profile.lastName).toBe("Pending");
  expect(useNetwork.getState().data!.people[0].profile.nickname).toBe("Mage");
});
it("finishes a switched network whose remote debounce has not started", async () => {
  const data = emptySnapshot();
  createPerson(data, { nickname: "Owner" });
  vi.spyOn(outbox, "put").mockResolvedValue();
  vi.spyOn(outbox, "list").mockResolvedValue([]);
  vi.spyOn(outbox, "remove").mockResolvedValue();
  const save = vi.fn(async (value: Snapshot) => ({ ...value, revision: 1 }));
  const repo: Repository = {
    journalScope: "network-one",
    load: async () => data,
    save,
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  await useNetwork.getState().open(data, repo);
  useNetwork.getState().mutate((s) => {
    s.people[0].profile.nickname = "Before switching";
  });
  expect(await useNetwork.getState().prepareSwitch()).toBe(true);
  const other = emptySnapshot();
  createPerson(other, { nickname: "Game" });
  await useNetwork
    .getState()
    .open(other, { ...repo, journalScope: "network-two" });
  await expect.poll(() => save.mock.calls.length).toBe(1);
  expect(save.mock.calls[0][0].people[0].profile.nickname).toBe(
    "Before switching",
  );
  expect(useNetwork.getState().data!.people[0].profile.nickname).toBe("Game");
});

it("does not overlap refreshes or replace an edit made while loading a remote update", async () => {
  const initial = emptySnapshot();
  createPerson(initial, { nickname: "Alex" });
  let release: (value: Snapshot) => void = () => {};
  const load = vi.fn(
    () =>
      new Promise<Snapshot>((resolve) => {
        release = resolve;
      }),
  );
  const repo: Repository = {
    shared: true,
    load,
    save: async (value) => value,
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => initial,
  };
  await useNetwork.getState().open(initial, repo);
  const first = useNetwork.getState().refresh();
  await useNetwork.getState().refresh();
  expect(load).toHaveBeenCalledTimes(1);
  useNetwork.getState().mutate((d) => {
    d.preferences.networkName = "Local edit";
  });
  release({ ...structuredClone(initial), revision: 1 });
  await first;
  expect(useNetwork.getState().data?.preferences.networkName).toBe(
    "Local edit",
  );
  expect(useNetwork.getState().dirty).toBe(true);
});
