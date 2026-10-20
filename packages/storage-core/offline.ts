import { snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from ".";
import {
  ConflictError,
  mergeSnapshots,
  type Conflict,
} from "../sync-engine/merge";

export type OfflineRecord = {
  key: string;
  account: string;
  network: string;
  version: number;
  base: Snapshot;
  local: Snapshot;
  pending: boolean;
  readOnly: boolean;
  lastSync: string;
  error?: string;
  conflict?: { remote: Snapshot; fields: Conflict[] };
};
/** Implementations must commit atomically and resolve only after durable commit. */
export interface ReplicaStorage {
  get(key: string): Promise<OfflineRecord | undefined>;
  list(account: string): Promise<OfflineRecord[]>;
  compareAndSet(
    key: string,
    expected: number | null,
    value: OfflineRecord | null,
  ): Promise<boolean>;
}
export const replicaKey = (account: string, network: string) =>
  JSON.stringify([account, network]);
export const replicaBytes = (r: OfflineRecord) =>
  new TextEncoder().encode(JSON.stringify(r)).length;
// Revision belongs to the transport; all other fields remain part of the comparison.
const same = (a: Snapshot, b: Snapshot) =>
  JSON.stringify({ ...a, revision: 0 }) ===
  JSON.stringify({ ...b, revision: 0 });

export class OfflineNetworks {
  private flights = new Map<string, Promise<void>>();
  constructor(readonly storage: ReplicaStorage) {}
  async download(account: string, network: string, remote: Repository) {
    if (!account) throw Error("driveExpired");
    const key = replicaKey(account, network);
    if (await this.storage.get(key)) return;
    const local = snapshotSchema.parse(await remote.load());
    if (!local.ownerId) throw Error("invalidData");
    await this.storage.compareAndSet(key, null, {
      key,
      account,
      network,
      version: 1,
      base: local,
      local,
      pending: false,
      readOnly: remote.readOnly === true,
      lastSync: new Date().toISOString(),
    });
  }
  async edit(key: string, input: Snapshot, expectedRevision: number) {
    for (;;) {
      const r = await this.required(key);
      if (r.readOnly) throw Error("sharedReadOnly");
      if (r.conflict) throw Error("resolveBeforeSwitch");
      if (r.local.revision !== expectedRevision)
        throw new ConflictError(r.local);
      const local = snapshotSchema.parse({
        ...input,
        revision: expectedRevision + 1,
      });
      if (local.ownerId !== r.base.ownerId) throw Error("invalidData");
      if (
        await this.storage.compareAndSet(key, r.version, {
          ...r,
          version: r.version + 1,
          local,
          pending: true,
          error: undefined,
        })
      )
        return local;
    }
  }
  async remove(key: string) {
    for (;;) {
      const r = await this.storage.get(key);
      if (!r) return;
      // The caller must export/resolve and synchronize first. No implicit discard.
      if (r.pending || r.conflict || this.flights.has(key))
        throw Error("offlinePendingRemoval");
      if (await this.storage.compareAndSet(key, r.version, null)) return;
    }
  }
  async required(key: string) {
    const r = await this.storage.get(key);
    if (!r) throw Error("offlineMissing");
    return r;
  }
  async recover(key: string, entries: { base: Snapshot; data: Snapshot }[]) {
    if (!entries.length) return;
    await this.update(key, (r) => {
      let local = r.local;
      const conflicts: Conflict[] = [];
      for (const entry of entries) {
        const merged = mergeSnapshots(entry.base, entry.data, local);
        local = merged.value;
        conflicts.push(...merged.conflicts);
      }
      return {
        ...r,
        local: { ...local, revision: r.local.revision + 1 },
        pending: true,
        conflict: conflicts.length
          ? { remote: r.local, fields: conflicts }
          : r.conflict,
      };
    });
  }
  private async update(key: string, fn: (r: OfflineRecord) => OfflineRecord) {
    for (;;) {
      const r = await this.required(key);
      const next = fn(r);
      if (
        await this.storage.compareAndSet(key, r.version, {
          ...next,
          version: r.version + 1,
        })
      )
        return;
    }
  }
  syncing(key: string) {
    return this.flights.has(key);
  }
  sync(key: string, account: string, remote: Repository): Promise<void> {
    const existing = this.flights.get(key);
    if (existing) return existing;
    const flight = this.runSync(key, account, remote).finally(() =>
      this.flights.delete(key),
    );
    this.flights.set(key, flight);
    return flight;
  }
  private async runSync(key: string, account: string, remote: Repository) {
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const r = await this.required(key);
        if (r.account !== account) throw Error("driveAccountChanged");
        if (r.conflict) return;
        const latest = await remote.load();
        if (latest.ownerId !== r.base.ownerId) throw Error("invalidData");
        if (remote.readOnly && r.pending) {
          await this.update(key, (value) => ({ ...value, readOnly: true }));
          throw Error("sharedReadOnly");
        }
        const merged = mergeSnapshots(r.base, r.local, latest);
        if (merged.conflicts.length) {
          // Keep base, local, and remote, including deleted values, across restart.
          await this.update(key, (value) => ({
            ...value,
            conflict: {
              remote: latest,
              fields: mergeSnapshots(value.base, value.local, latest).conflicts,
            },
            error: "offlineConflict",
          }));
          return;
        }
        let saved = latest;
        try {
          // A lost HTTP acknowledgement is recovered by comparing with remote first.
          if (r.pending && !same(merged.value, latest))
            saved = await remote.save(merged.value, latest.revision);
        } catch (e) {
          if (e instanceof ConflictError) continue;
          throw e;
        }
        await this.update(key, (current) => {
          const newer = current.version !== r.version;
          const rebased = newer
            ? mergeSnapshots(r.local, current.local, saved)
            : { value: saved, conflicts: [] };
          return {
            ...current,
            base: saved,
            local: {
              ...rebased.value,
              revision: same(rebased.value, current.local)
                ? current.local.revision
                : current.local.revision + 1,
            },
            pending: newer && !same(rebased.value, saved),
            readOnly: remote.readOnly === true,
            error: undefined,
            conflict: rebased.conflicts.length
              ? { remote: saved, fields: rebased.conflicts }
              : undefined,
            lastSync: new Date().toISOString(),
          };
        });
        if (!(await this.required(key)).pending) return;
      }
      throw Error("offlineRetry");
    } catch (e) {
      await this.update(key, (r) => ({
        ...r,
        error: e instanceof Error ? e.message : "storageError",
        readOnly:
          r.readOnly ||
          (e instanceof Error &&
            ["sharedAccessLost", "sharedReadOnly", "driveNotFound"].includes(
              e.message,
            )),
      }));
      throw e;
    }
  }
  async resolve(key: string, choice: "local" | "remote") {
    await this.update(key, (r) => {
      if (!r.conflict) return r;
      if (r.readOnly && choice === "local") throw Error("sharedReadOnly");
      const remote = r.conflict.remote;
      const resolved =
        choice === "local"
          ? mergeSnapshots(r.base, r.local, remote).value
          : mergeSnapshots(r.base, remote, r.local).value;
      return {
        ...r,
        base: remote,
        local: {
          ...resolved,
          revision: r.local.revision + 1,
        },
        pending: !same(resolved, remote),
        conflict: undefined,
        error: undefined,
      };
    });
  }
}
