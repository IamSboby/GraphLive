import { preferencesSchema, displayName, type Snapshot } from "../domain/model";
import { z } from "zod";
import type { NetworkEntry, NetworkLibrary } from "./library";
const entrySchema = z.object({
  id: z.string(),
  preferences: preferencesSchema,
  identity: z.string(),
  peopleCount: z.number(),
  connectionCount: z.number(),
  modifiedAt: z.string(),
  shared: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  ownerLabel: z.string().optional(),
  ownedByMe: z.boolean().optional(),
});
export function summarizeNetwork(
  id: string,
  data: Snapshot,
  flags: Partial<NetworkEntry> = {},
): NetworkEntry {
  const owner = data.people.find((p) => p.id === data.ownerId);
  const dates = [
    data.preferences.lastEditedAt ?? "",
    ...data.people.map((p) => p.updatedAt),
    ...data.connections.map((e) => e.updatedAt),
    ...data.tombstones.map((t) => t.deletedAt),
  ];
  return {
    id,
    preferences: data.preferences,
    identity: owner ? displayName(owner) : "",
    peopleCount: data.people.length,
    connectionCount: data.connections.length,
    modifiedAt: dates.reduce(
      (latest, date) => (date > latest ? date : latest),
      "",
    ),
    shared: flags.shared,
    readOnly: flags.readOnly,
    ownerLabel: flags.ownerLabel,
    ownedByMe: flags.ownedByMe,
  };
}
export function sortNetworks(entries: NetworkEntry[]) {
  return [...entries].sort(
    (a, b) =>
      b.modifiedAt.localeCompare(a.modifiedAt) || a.id.localeCompare(b.id),
  );
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("graphlive-dashboard", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("index");
      r.result.createObjectStore("banners");
      r.result.createObjectStore("folders");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function operation<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode),
      request = run(tx.objectStore(store));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function dashboardScope(
  library: NetworkLibrary,
): Promise<string | null> {
  if (library.provider === "browser") return "browser";
  if (library.provider === "drive")
    return library.session?.accountId
      ? "drive:" + library.session.accountId
      : null;
  if (library.directory) {
    try {
      const folders = await operation<
        { id: string; handle: FileSystemDirectoryHandle }[]
      >("folders", "readonly", (s) => s.getAll());
      for (const folder of folders)
        if (await library.directory.isSameEntry(folder.handle))
          return "folder:" + folder.id;
      const id = crypto.randomUUID();
      await operation("folders", "readwrite", (s) =>
        s.put({ id, handle: library.directory }, id),
      );
      return "folder:" + id;
    } catch {
      return null;
    }
  }
  return null;
}
export async function readDashboard(scope: string): Promise<NetworkEntry[]> {
  try {
    const raw = await operation<unknown>("index", "readonly", (s) =>
      s.get(scope),
    );
    return sortNetworks(z.array(entrySchema).parse(raw));
  } catch {
    return [];
  }
}
export async function readBanner(
  scope: string,
  id: string,
): Promise<string | undefined> {
  try {
    return await operation("banners", "readonly", (s) => s.get([scope, id]));
  } catch {
    return undefined;
  }
}
export async function cacheDashboard(scope: string, entries: NetworkEntry[]) {
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["index", "banners"], "readwrite");
      tx.objectStore("index").put(
        entries.map((e) => ({
          ...e,
          preferences: { ...e.preferences, banner: undefined },
        })),
        scope,
      );
      for (const e of entries)
        if (e.preferences.banner)
          tx.objectStore("banners").put(e.preferences.banner, [scope, e.id]);
        else tx.objectStore("banners").delete([scope, e.id]);
      const scan = tx.objectStore("banners").openCursor();
      scan.onsuccess = () => {
        const c = scan.result;
        if (!c) return;
        const key = c.key as string[];
        if (key[0] === scope && !entries.some((e) => e.id === key[1]))
          c.delete();
        c.continue();
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    /* A cache failure must never block access to the source files. */
  }
}

export async function cacheIndex(scope: string, entries: NetworkEntry[]) {
  try {
    await operation("index", "readwrite", (store) =>
      store.put(
        entries.map((e) => ({
          ...e,
          preferences: { ...e.preferences, banner: undefined },
        })),
        scope,
      ),
    );
  } catch {}
}
export async function cacheBanner(scope: string, entry: NetworkEntry) {
  try {
    if (entry.preferences.banner)
      await operation("banners", "readwrite", (store) =>
        store.put(entry.preferences.banner, [scope, entry.id]),
      );
    else
      await operation("banners", "readwrite", (store) =>
        store.delete([scope, entry.id]),
      );
  } catch {}
}
