import { parseStoredSnapshot } from "../storage-core";
import { snapshotSchema, emptySnapshot, type Snapshot } from "../domain/model";
import { fileTree, type Repository } from "../storage-core";
import { folderIdentity } from "../storage-core/folder-identity";
import { ConflictError } from "../sync-engine/merge";
export class HttpRepository implements Repository {
  requiresMigration = false;
  readonly journalScope = "server";
  private async request(path = "", options?: RequestInit) {
    const r = await fetch("/api/network" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
      cache: "no-store",
    });
    if (r.headers.get("X-GraphLive-Migration") === "1")
      this.requiresMigration = true;
    const v = await r.json();
    if (r.status === 409)
      throw new ConflictError(snapshotSchema.parse(v.remote));
    if (!r.ok) throw new Error(v.error ?? "storageError");
    return v;
  }
  async load() {
    return snapshotSchema.parse(await this.request());
  }
  async save(value: Snapshot, expectedRevision: number) {
    return snapshotSchema.parse(
      await this.request("", {
        method: "PUT",
        body: JSON.stringify({ value, expectedRevision }),
      }),
    );
  }
  async backup() {
    return (await this.request("/backups", { method: "POST" })).id as string;
  }
  async backups() {
    return (await this.request("/backups")) as string[];
  }
  async restorePreview(id: string) {
    return snapshotSchema.parse(
      await this.request("/backups?id=" + encodeURIComponent(id)),
    );
  }
}
type WritableFile = FileSystemFileHandle & {
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
};
export type Directory = FileSystemDirectoryHandle & {
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
export async function pickDirectory() {
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (o: {
        mode: string;
        id: string;
      }) => Promise<Directory>;
    }
  ).showDirectoryPicker;
  if (!picker) throw new Error("folderUnsupported");
  return picker.call(window, { mode: "readwrite", id: "graphlive" });
}
export class LocalRepository implements Repository {
  requiresMigration = false;
  private folderId: string | undefined;
  get journalScope() {
    return this.folderId ? "folder:" + this.folderId : undefined;
  }
  private root: Promise<FileSystemDirectoryHandle>;
  constructor(
    private selected: Directory,
    readonly networkId = "default",
  ) {
    if (networkId !== "default" && !/^[a-f0-9-]{36}$/.test(networkId))
      throw new Error("invalidPath");
    this.root =
      selected.name === "GraphLiveFiles"
        ? Promise.resolve(selected)
        : selected.getDirectoryHandle("GraphLiveFiles", { create: true });
    if (networkId !== "default")
      this.root = this.root.then(async (root) =>
        (
          await root.getDirectoryHandle("networks", { create: true })
        ).getDirectoryHandle(networkId, { create: true }),
      );
  }
  async networkIds() {
    const ids = ["default"];
    try {
      const dir = await (await this.root).getDirectoryHandle("networks");
      for await (const id of (
        dir as unknown as { keys(): AsyncIterableIterator<string> }
      ).keys())
        if (/^[a-f0-9-]{36}$/.test(id)) ids.push(id);
    } catch (e) {
      if ((e as DOMException).name !== "NotFoundError") throw e;
    }
    return ids;
  }
  private async permission() {
    if (
      (await this.selected.queryPermission({ mode: "readwrite" })) !== "granted"
    )
      throw new Error("folderPermission");
  }
  private async file(p: string, create = false) {
    const parts = p.split("/");
    let dir = await this.root;
    for (const part of parts.slice(0, -1))
      dir = await dir.getDirectoryHandle(part, { create });
    return (await dir.getFileHandle(parts.at(-1)!, { create })) as WritableFile;
  }
  private async write(p: string, s: string) {
    const f = await this.file(p, true),
      w = await f.createWritable();
    await w.write(s);
    await w.close();
  }
  private async read(p: string) {
    const f = await (await this.file(p)).getFile();
    if (f.size > 10485760) throw new Error("tooLarge");
    return f.text();
  }
  async load() {
    await this.permission();
    if (!this.folderId && typeof indexedDB !== "undefined")
      this.folderId = await folderIdentity(await this.root);
    try {
      return parseStoredSnapshot(
        JSON.parse(await this.read("sync/snapshot.json")),
        this,
      );
    } catch (e) {
      if ((e as DOMException).name === "NotFoundError") {
        try {
          await this.file("sync/index.json");
          throw new Error("missingSnapshot");
        } catch (indexError) {
          if ((indexError as DOMException).name !== "NotFoundError")
            throw indexError;
        }
        return emptySnapshot();
      }
      throw e;
    }
  }
  async save(input: Snapshot, expectedRevision: number) {
    return navigator.locks.request("graphlive-folder-write", async () => {
      const current = await this.load();
      if (current.revision !== expectedRevision)
        throw new ConflictError(current);
      const value = snapshotSchema.parse({
        ...input,
        revision: current.revision + 1,
      });
      for (const k of ["M", "F", "L", "U"] as const)
        value.counters[k] = Math.max(current.counters[k], value.counters[k]);
      if (current.revision && value.preferences.autoBackup) await this.backup();
      const previous = fileTree(current);
      for (const [p, data] of Object.entries(fileTree(value)))
        if (!current.revision || this.requiresMigration || previous[p] !== data)
          await this.write(p, data);
      return value;
    });
  }
  async backup() {
    const s = await this.load(),
      id = `${Date.now()}-${crypto.randomUUID()}.json`;
    await this.write("backups/" + id, JSON.stringify(s));
    return id;
  }
  async backups() {
    try {
      const dir = await (await this.root).getDirectoryHandle("backups");
      const entries = dir as unknown as {
        keys(): AsyncIterableIterator<string>;
      };
      const ids = [];
      for await (const id of entries.keys())
        if (id.endsWith(".json")) ids.push(id);
      return ids.sort().reverse();
    } catch (e) {
      if ((e as DOMException).name === "NotFoundError") return [];
      throw e;
    }
  }
  async restorePreview(id: string) {
    if (!/^[\w.-]+\.json$/.test(id)) throw new Error("invalidPath");
    return snapshotSchema.parse(JSON.parse(await this.read("backups/" + id)));
  }
}
