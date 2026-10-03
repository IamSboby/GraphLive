import { afterEach, it, expect, vi } from "vitest";
import {
  LocalRepository,
  type Directory,
} from "../../packages/storage-adapters/browser";
import { createPerson } from "../../packages/domain/model";
class MemoryDirectory {
  name = "selected";
  dirs = new Map<string, MemoryDirectory>();
  files = new Map<string, string>();
  permission: PermissionState = "granted";
  async queryPermission() {
    return this.permission;
  }
  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    if (!this.dirs.has(name)) {
      if (!options?.create) throw new DOMException("missing", "NotFoundError");
      const d = new MemoryDirectory();
      d.name = name;
      this.dirs.set(name, d);
    }
    return this.dirs.get(name)!;
  }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (!options?.create) throw new DOMException("missing", "NotFoundError");
      this.files.set(name, "");
    }
    return {
      getFile: async () => new File([this.files.get(name)!], name),
      createWritable: async () => {
        let staged = "";
        return {
          write: async (s: string) => {
            staged = s;
          },
          close: async () => {
            this.files.set(name, staged);
          },
        };
      },
    };
  }
  async *keys() {
    yield* this.files.keys();
  }
}
afterEach(() => vi.unstubAllGlobals());
it("local folder persists/reopens, validates revisions, backs up and detects lost permission", async () => {
  vi.stubGlobal("navigator", {
    locks: {
      request: async (_name: string, fn: () => Promise<unknown>) => fn(),
    },
  });
  const dir = new MemoryDirectory(),
    repo = new LocalRepository(dir as unknown as Directory);
  const s = await repo.load();
  createPerson(s, { nickname: "Folder Person" });
  const saved = await repo.save(s, 0);
  expect(await new LocalRepository(dir as unknown as Directory).load()).toEqual(
    saved,
  );
  await expect(repo.save(s, 0)).rejects.toThrow("conflict");
  const id = await repo.backup();
  expect(await repo.restorePreview(id)).toEqual(saved);
  expect(await repo.backups()).toContain(id);
  expect(
    (await dir.getDirectoryHandle("GraphLiveFiles")).dirs.has("Identities"),
  ).toBe(true);
  dir.permission = "denied";
  await expect(repo.load()).rejects.toThrow("folderPermission");
});
it("folder networks isolate identities, snapshots and backups while retaining the legacy location", async () => {
  vi.stubGlobal("navigator", {
    locks: { request: async (_: string, fn: () => Promise<unknown>) => fn() },
  });
  const dir = new MemoryDirectory() as unknown as Directory;
  const root = new LocalRepository(dir);
  const legacy = await root.load();
  createPerson(legacy, { nickname: "Real" });
  await root.save(legacy, 0);
  const id = crypto.randomUUID();
  const game = new LocalRepository(dir, id);
  const other = await game.load();
  createPerson(other, { nickname: "Mage" });
  await game.save(other, 0);
  const copy = await game.backup();
  expect((await root.load()).people[0].profile.nickname).toBe("Real");
  expect(
    (await new LocalRepository(dir, id).load()).people[0].profile.nickname,
  ).toBe("Mage");
  expect(await game.backups()).toContain(copy);
  expect(await root.backups()).not.toContain(copy);
});
