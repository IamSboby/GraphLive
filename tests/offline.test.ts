import { expect, it, vi } from "vitest";
import {
  createPerson,
  emptySnapshot,
  type Snapshot,
} from "../packages/domain/model";
import {
  OfflineNetworks,
  replicaKey,
  type OfflineRecord,
  type ReplicaStorage,
} from "../packages/storage-core/offline";
import type { Repository } from "../packages/storage-core";
import { ConflictError } from "../packages/sync-engine/merge";

function setup() {
  const records = new Map<string, OfflineRecord>();
  const storage: ReplicaStorage = {
    get: async (k) => structuredClone(records.get(k)),
    list: async (a) =>
      [...records.values()]
        .filter((r) => r.account === a)
        .map((r) => structuredClone(r)),
    compareAndSet: async (k, version, r) => {
      if ((records.get(k)?.version ?? null) !== version) return false;
      if (r) records.set(k, structuredClone(r));
      else records.delete(k);
      return true;
    },
  };
  let data = emptySnapshot();
  createPerson(data, { nickname: "Owner" });
  const remote: Repository = {
    load: vi.fn(async () => structuredClone(data)),
    save: vi.fn(async (value: Snapshot, revision: number) => {
      if (data.revision !== revision) throw new ConflictError(data);
      data = { ...structuredClone(value), revision: revision + 1 };
      return structuredClone(data);
    }),
    backup: async () => "",
    backups: async () => [],
    restorePreview: async () => data,
  };
  const engine = new OfflineNetworks(storage),
    key = replicaKey("account", "network");
  return { engine, storage, remote, key, records, data: () => data };
}
it("downloads the full snapshot and recovers edits using a new engine without network", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  r.local.people[0].display.manualPosition = { x: 100, y: 200 };
  await s.engine.edit(s.key, r.local, r.local.revision);
  vi.mocked(s.remote.load).mockRejectedValue(Error("offline"));
  const recovered = await new OfflineNetworks(s.storage).required(s.key);
  expect(recovered.local.people[0].display.manualPosition).toEqual({
    x: 100,
    y: 200,
  });
  expect(recovered.pending).toBe(true);
  await expect(s.engine.remove(s.key)).rejects.toThrow("offlinePendingRemoval");
});
it("merges independent mobile and web changes using the existing web schema", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  r.local.people[0].profile.firstName = "Mobile";
  await s.engine.edit(s.key, r.local, r.local.revision);
  s.data().people[0].profile.lastName = "Web";
  s.data().revision++;
  await s.engine.sync(s.key, "account", s.remote);
  expect(s.data().people[0].profile).toMatchObject({
    firstName: "Mobile",
    lastName: "Web",
  });
  expect((await s.engine.required(s.key)).pending).toBe(false);
});
it("preserves both incompatible versions across restart without uploading", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  r.local.people[0].profile.firstName = "Mobile";
  await s.engine.edit(s.key, r.local, r.local.revision);
  s.data().people[0].profile.firstName = "Web";
  await s.engine.sync(s.key, "account", s.remote);
  const recovered = await new OfflineNetworks(s.storage).required(s.key);
  expect(recovered.local.people[0].profile.firstName).toBe("Mobile");
  expect(recovered.conflict?.remote.people[0].profile.firstName).toBe("Web");
  expect(s.remote.save).not.toHaveBeenCalled();
});
it("recovers a lost upload acknowledgement without replaying the write", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  createPerson(r.local, { nickname: "Added once" });
  await s.engine.edit(s.key, r.local, r.local.revision);
  const save = s.remote.save;
  s.remote.save = vi.fn(async (value: Snapshot, revision: number) => {
    await save(value, revision);
    throw Error("connectionLost");
  });
  await expect(s.engine.sync(s.key, "account", s.remote)).rejects.toThrow(
    "connectionLost",
  );
  s.remote.save = save;
  await s.engine.sync(s.key, "account", s.remote);
  expect(save).toHaveBeenCalledTimes(1);
  expect(s.data().people).toHaveLength(2);
  expect((await s.engine.required(s.key)).pending).toBe(false);
});
it.each(["driveExpired", "sharedAccessLost", "drivePermission"])(
  "retains pending changes on %s",
  async (error) => {
    const s = setup();
    await s.engine.download("account", "network", s.remote);
    const r = await s.engine.required(s.key);
    r.local.preferences.networkName = "Keep me";
    await s.engine.edit(s.key, r.local, r.local.revision);
    vi.mocked(s.remote.load).mockRejectedValue(Error(error));
    await expect(s.engine.sync(s.key, "account", s.remote)).rejects.toThrow(
      error,
    );
    expect((await s.engine.required(s.key)).local.preferences.networkName).toBe(
      "Keep me",
    );
    expect((await s.engine.required(s.key)).pending).toBe(true);
  },
);
it("rejects reader edits and preserves existing data when storage is full", async () => {
  const s = setup();
  Object.defineProperty(s.remote, "readOnly", { value: true });
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  await expect(s.engine.edit(s.key, r.local, 0)).rejects.toThrow(
    "sharedReadOnly",
  );
  s.records.get(s.key)!.readOnly = false;
  vi.spyOn(s.storage, "compareAndSet").mockRejectedValue(
    Error("offlineStorageFull"),
  );
  await expect(s.engine.edit(s.key, r.local, 0)).rejects.toThrow(
    "offlineStorageFull",
  );
  expect((await s.engine.required(s.key)).version).toBe(1);
});
it("does not acknowledge newer edits made while an upload is in flight", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  let r = await s.engine.required(s.key);
  r.local.people[0].profile.firstName = "First edit";
  await s.engine.edit(s.key, r.local, r.local.revision);
  const save = s.remote.save;
  let release!: () => void;
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  s.remote.save = vi.fn(async (value: Snapshot, revision: number) => {
    started();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    s.remote.save = save;
    return save(value, revision);
  });
  const sync = s.engine.sync(s.key, "account", s.remote);
  await entered;
  r = await s.engine.required(s.key);
  r.local.people[0].profile.lastName = "Newer edit";
  await s.engine.edit(s.key, r.local, r.local.revision);
  release();
  await sync;
  expect(s.data().people[0].profile).toMatchObject({
    firstName: "First edit",
    lastName: "Newer edit",
  });
  expect((await s.engine.required(s.key)).pending).toBe(false);
});
it("recovers a durable journal before syncing a network that was not reopened", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  const data = structuredClone(r.local);
  data.preferences.networkName = "Recovered journal";
  await s.engine.recover(s.key, [{ base: r.local, data }]);
  await s.engine.sync(s.key, "account", s.remote);
  expect(s.data().preferences.networkName).toBe("Recovered journal");
});
it("refuses to send one account's offline data to a different account", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  vi.mocked(s.remote.load).mockClear();
  await expect(s.engine.sync(s.key, "other-account", s.remote)).rejects.toThrow(
    "driveAccountChanged",
  );
  expect(s.remote.load).not.toHaveBeenCalled();
  expect(s.remote.save).not.toHaveBeenCalled();
});
it("retains compatible remote changes when choosing the local conflict version", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  r.local.people[0].profile.firstName = "Mobile";
  await s.engine.edit(s.key, r.local, r.local.revision);
  s.data().people[0].profile.firstName = "Web";
  s.data().people[0].profile.lastName = "Compatible";
  await s.engine.sync(s.key, "account", s.remote);
  await s.engine.resolve(s.key, "local");
  await s.engine.sync(s.key, "account", s.remote);
  expect(s.data().people[0].profile).toMatchObject({
    firstName: "Mobile",
    lastName: "Compatible",
  });
});

it("keeps compatible device edits when choosing Drive for conflicting fields", async () => {
  const s = setup();
  await s.engine.download("account", "network", s.remote);
  const r = await s.engine.required(s.key);
  r.local.people[0].profile.firstName = "Mobile";
  r.local.people[0].profile.lastName = "Compatible mobile";
  await s.engine.edit(s.key, r.local, r.local.revision);
  s.data().people[0].profile.firstName = "Web";
  await s.engine.sync(s.key, "account", s.remote);
  await s.engine.resolve(s.key, "remote");
  expect((await s.engine.required(s.key)).pending).toBe(true);
  await s.engine.sync(s.key, "account", s.remote);
  expect(s.data().people[0].profile).toMatchObject({
    firstName: "Web",
    lastName: "Compatible mobile",
  });
});
