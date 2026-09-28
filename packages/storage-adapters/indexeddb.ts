import { parseStoredSnapshot } from "../storage-core";
import { emptySnapshot, snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { ConflictError } from "../sync-engine/merge";

/** One transaction protects revision checks and writes across browser tabs. */
export class BrowserRepository implements Repository {
  requiresMigration = false;
  readonly journalScope = "browser";
  private pruneBackups(store: IDBObjectStore) {
    const request = store.getAllKeys();
    request.onsuccess = () => {
      const keys = request.result
        .map(String)
        .filter((key) => key.startsWith("backup-"))
        .sort()
        .reverse();
      for (const key of keys.slice(10)) store.delete(key);
    };
  }
  private async database() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("graphlive-local", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("network");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("storageError"));
    });
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    run: (
      store: IDBObjectStore,
      result: (value: T) => void,
      fail: (error: unknown) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.database();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("network", mode);
      let value: T, failure: unknown;
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(failure ?? new Error("storageError"));
      };
      const fail = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      try {
        run(
          tx.objectStore("network"),
          (v) => {
            value = v;
          },
          fail,
        );
      } catch (e) {
        fail(e);
      }
    });
  }
  async load(): Promise<Snapshot> {
    return this.transaction("readonly", (store, done, fail) => {
      const r = store.get("snapshot");
      r.onsuccess = () => {
        try {
          done(
            r.result ? parseStoredSnapshot(r.result, this) : emptySnapshot(),
          );
        } catch (e) {
          fail(e);
        }
      };
    });
  }
  async save(input: Snapshot, expectedRevision: number): Promise<Snapshot> {
    return this.transaction("readwrite", (store, done, fail) => {
      const r = store.get("snapshot");
      r.onsuccess = () => {
        try {
          const current = r.result
            ? snapshotSchema.parse(r.result)
            : emptySnapshot();
          if (current.revision !== expectedRevision)
            throw new ConflictError(current);
          const value = snapshotSchema.parse({
            ...input,
            revision: current.revision + 1,
          });
          for (const k of ["M", "F", "L", "U"] as const)
            value.counters[k] = Math.max(
              value.counters[k],
              current.counters[k],
            );
          if (new TextEncoder().encode(JSON.stringify(value)).length > 10485760)
            throw new Error("tooLarge");
          if (current.revision && value.preferences.autoBackup)
            store.put(
              current,
              "backup-" + Date.now() + "-" + crypto.randomUUID(),
            );
          store.put(value, "snapshot");
          this.pruneBackups(store);
          done(value);
        } catch (e) {
          fail(e);
        }
      };
    });
  }
  async backup(): Promise<string> {
    return this.transaction("readwrite", (store, done, fail) => {
      const r = store.get("snapshot");
      r.onsuccess = () => {
        try {
          const id = "backup-" + Date.now() + "-" + crypto.randomUUID();
          store.put(
            r.result ? snapshotSchema.parse(r.result) : emptySnapshot(),
            id,
          );
          done(id);
          this.pruneBackups(store);
        } catch (e) {
          fail(e);
        }
      };
    });
  }
  async backups(): Promise<string[]> {
    return this.transaction("readonly", (store, done) => {
      const r = store.getAllKeys();
      r.onsuccess = () =>
        done(
          r.result
            .map(String)
            .filter((k) => k.startsWith("backup-"))
            .sort()
            .reverse(),
        );
    });
  }
  async restorePreview(id: string): Promise<Snapshot> {
    if (!/^backup-[\w-]+$/.test(id)) throw new Error("invalidPath");
    return this.transaction("readonly", (store, done, fail) => {
      const r = store.get(id);
      r.onsuccess = () => {
        try {
          done(snapshotSchema.parse(r.result));
        } catch (e) {
          fail(e);
        }
      };
    });
  }
}
