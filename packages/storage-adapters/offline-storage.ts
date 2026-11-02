import type { OfflineRecord, ReplicaStorage } from "../storage-core/offline";
import { androidCall, isAndroid } from "./android-bridge";

async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("graphlive-offline", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("networks", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error("localSaveFailed"));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore, done: (v: T) => void) => void,
) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("networks", mode);
    let value: T;
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        Error(
          tx.error?.name === "QuotaExceededError"
            ? "offlineStorageFull"
            : "localSaveFailed",
        ),
      );
    };
    try {
      run(tx.objectStore("networks"), (v) => {
        value = v;
      });
    } catch {
      tx.abort();
    }
  });
}
export const browserReplicaStorage: ReplicaStorage = {
  get: (key) =>
    transaction("readonly", (s, done) => {
      const q = s.get(key);
      q.onsuccess = () => done(q.result);
    }),
  list: (account) =>
    transaction("readonly", (s, done) => {
      const q = s.getAll();
      q.onsuccess = () =>
        done(q.result.filter((r: OfflineRecord) => r.account === account));
    }),
  compareAndSet: (key, expected, value) =>
    transaction("readwrite", (s, done) => {
      const q = s.get(key);
      q.onsuccess = () => {
        if ((q.result?.version ?? null) !== expected) {
          done(false);
          return;
        }
        if (value) s.put(value);
        else s.delete(key);
        done(true);
      };
    }),
};
export const replicaStorage: ReplicaStorage = {
  get: async (key) =>
    isAndroid()
      ? (await androidCall<{ value?: OfflineRecord }>("replicaGet", { key }))
          .value
      : browserReplicaStorage.get(key),
  list: async (account) =>
    isAndroid()
      ? (
          await androidCall<{ values: OfflineRecord[] }>("replicaList", {
            account,
          })
        ).values
      : browserReplicaStorage.list(account),
  compareAndSet: async (key, expected, value) =>
    isAndroid()
      ? (
          await androidCall<{ changed: boolean }>("replicaSet", {
            key,
            expected,
            value,
          })
        ).changed
      : browserReplicaStorage.compareAndSet(key, expected, value),
};
