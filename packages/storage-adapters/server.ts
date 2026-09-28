import { parseStoredSnapshot } from "../storage-core";
import { promises as fs } from "node:fs";
import path from "node:path";
import { encodeBackup, decodeBackup } from "../security/backup";
import { log } from "../security/logger";
import { createHash, randomUUID } from "node:crypto";
import { emptySnapshot, snapshotSchema, type Snapshot } from "../domain/model";
import {
  type Repository,
  type StorageAdapter,
  safePath,
  fileTree,
} from "../storage-core";
import { ConflictError } from "../sync-engine/merge";

export class FileAdapter implements StorageAdapter {
  constructor(readonly root: string) {}
  private async resolve(p: string) {
    safePath(p);
    const dest = path.resolve(this.root, p),
      root = path.resolve(this.root);
    if (!dest.startsWith(root + path.sep)) throw new Error("invalidPath");
    let current = root;
    for (const part of p.split("/")) {
      current = path.join(current, part);
      try {
        if ((await fs.lstat(current)).isSymbolicLink())
          throw new Error("symlink");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
    return dest;
  }
  async read(p: string) {
    const dest = await this.resolve(p);
    const stat = await fs.stat(dest);
    if (
      stat.size >
      Number(process.env.MAX_SNAPSHOT_BYTES ?? 10485760) *
        (p.startsWith("backups/") ? 1.5 : 1)
    )
      throw new Error("tooLarge");
    return fs.readFile(dest, "utf8");
  }
  async write(p: string, data: string) {
    const dest = await this.resolve(p);
    await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
    const tmp = dest + "." + randomUUID() + ".tmp";
    try {
      const h = await fs.open(tmp, "wx", 0o600);
      try {
        await h.writeFile(data);
        await h.sync();
      } finally {
        await h.close();
      }
      await fs.rename(tmp, dest);
    } finally {
      await fs.rm(tmp, { force: true });
    }
  }
  async list(p: string) {
    try {
      return await fs.readdir(await this.resolve(p));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }
  async remove(p: string) {
    await fs.rm(await this.resolve(p), { force: true });
  }
  async move(from: string, to: string) {
    await fs.rename(await this.resolve(from), await this.resolve(to));
  }
  async exists(p: string) {
    try {
      await fs.stat(await this.resolve(p));
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw e;
    }
  }
  async getMetadata(p: string) {
    const st = await fs.stat(await this.resolve(p));
    return { size: st.size, modifiedAt: st.mtime.toISOString() };
  }
}
export class ServerRepository implements Repository {
  requiresMigration = false;
  readonly adapter: FileAdapter;
  constructor(root: string, userId: string) {
    this.adapter = new FileAdapter(
      path.join(
        root,
        createHash("sha256").update(userId).digest("hex"),
        "GraphLiveFiles",
      ),
    );
  }
  async load() {
    if (!(await this.adapter.exists("sync/snapshot.json"))) {
      if (
        (await this.adapter.exists("sync/index.json")) ||
        (await this.adapter.list("Identities")).length
      )
        throw new Error("missingSnapshot");
      return emptySnapshot();
    }
    return parseStoredSnapshot(
      JSON.parse(await this.adapter.read("sync/snapshot.json")),
      this,
    );
  }
  private async lock<T>(fn: () => Promise<T>): Promise<T> {
    await fs.mkdir(this.adapter.root, { recursive: true, mode: 0o700 });
    const lockPath = path.join(this.adapter.root, ".write.lock");
    let handle;
    for (let i = 0; i < 40; i++) {
      try {
        handle = await fs.open(lockPath, "wx", 0o600);
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    if (!handle) throw new Error("storageBusy");
    try {
      return await fn();
    } finally {
      await handle.close();
      await fs.rm(lockPath, { force: true });
    }
  }
  async save(input: Snapshot, expectedRevision: number) {
    return this.lock(async () => {
      const value = snapshotSchema.parse(input),
        current = await this.load();
      if (current.revision !== expectedRevision)
        throw new ConflictError(current);
      for (const old of current.people) {
        const next = value.people.find((p) => p.id === old.id);
        if (
          next &&
          (next.storageId !== old.storageId || next.createdAt !== old.createdAt)
        )
          throw new Error("immutableIdentity");
      }
      for (const k of ["M", "F", "L", "U"] as const)
        value.counters[k] = Math.max(value.counters[k], current.counters[k]);
      value.revision = current.revision + 1;
      const encoded = JSON.stringify(value);
      if (
        Buffer.byteLength(encoded) >
        Number(process.env.MAX_SNAPSHOT_BYTES ?? 10485760)
      )
        throw new Error("tooLarge");
      if (current.revision && value.preferences.autoBackup)
        await this.writeBackup(current);
      // One atomic file is the commit point; the other requested files are repairable projections.
      await this.adapter.write("sync/snapshot.json", encoded);
      await this.project(value);
      log("info", "sync.commit", {
        revision: value.revision,
        peopleCount: value.people.length,
        connectionCount: value.connections.length,
      });
      return value;
    });
  }
  async project(value: Snapshot) {
    const tree = fileTree(value);
    for (const [p, data] of Object.entries(tree))
      if (p !== "sync/snapshot.json") await this.adapter.write(p, data);
    for (const f of await this.adapter.list("Identities"))
      if (/^[MFLU]\d+\.json$/.test(f) && !tree[`Identities/${f}`])
        await this.adapter.remove(`Identities/${f}`);
  }
  private async writeBackup(s: Snapshot) {
    const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`;
    await this.adapter.write(`backups/${id}`, encodeBackup(JSON.stringify(s)));
    log("info", "backup.created", { revision: s.revision });
    const all = await this.backups();
    for (const old of all.slice(
      Math.max(1, Number(process.env.BACKUP_KEEP ?? 10)),
    ))
      await this.adapter.remove(`backups/${old}`);
    return id;
  }
  async backup() {
    return this.lock(async () => this.writeBackup(await this.load()));
  }
  async backups() {
    return (await this.adapter.list("backups"))
      .filter((s) => s.endsWith(".json"))
      .sort()
      .reverse();
  }
  async restorePreview(id: string) {
    safePath(id);
    if (id.includes("/")) throw new Error("invalidPath");
    return snapshotSchema.parse(
      JSON.parse(decodeBackup(await this.adapter.read(`backups/${id}`))),
    );
  }
}
