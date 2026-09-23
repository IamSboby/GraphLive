import { snapshotSchema, emptySnapshot, type Snapshot } from "../domain/model";
import { fileTree, type Repository } from "../storage-core";
import { ConflictError } from "../sync-engine/merge";
export class HttpRepository implements Repository {
  private async request(path = "", options?: RequestInit) {
    const r = await fetch("/api/network" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
      cache: "no-store",
    });
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
  private root: Promise<FileSystemDirectoryHandle>;
  constructor(private selected: Directory) {
    this.root =
      selected.name === "GraphLiveFiles"
        ? Promise.resolve(selected)
        : selected.getDirectoryHandle("GraphLiveFiles", { create: true });
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
    try {
      return snapshotSchema.parse(
        JSON.parse(await this.read("sync/snapshot.json")),
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
      for (const [p, data] of Object.entries(fileTree(value)))
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
