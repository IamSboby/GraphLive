import { snapshotSchema, type Snapshot } from "../domain/model";

export type PendingWrite = {
  id: string;
  scope: string;
  version: string;
  base: Snapshot;
  data: Snapshot;
};
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("graphlive-outbox", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("pending", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("localSaveFailed"));
  });
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("pending", mode);
    let result: T;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("localSaveFailed"));
    };
    try {
      run(tx.objectStore("pending"), (value) => {
        result = value;
      });
    } catch {
      tx.abort();
    }
  });
}
export const outbox = {
  list: (scope: string) =>
    transaction<PendingWrite[]>("readonly", (store, done) => {
      const r = store.getAll();
      r.onsuccess = () => {
        try {
          done(
            r.result
              .filter((v: PendingWrite) => v.scope === scope)
              .map((v: PendingWrite) => ({
                ...v,
                base: snapshotSchema.parse(v.base),
                data: snapshotSchema.parse(v.data),
              })),
          );
        } catch {
          store.transaction.abort();
        }
      };
    }),
  put: (value: PendingWrite) =>
    transaction<void>("readwrite", (store) => {
      store.put(value);
    }),
  remove: (value: PendingWrite) =>
    transaction<void>("readwrite", (store) => {
      const r = store.get(value.id);
      r.onsuccess = () => {
        if (r.result?.version === value.version) store.delete(value.id);
      };
    }),
};
