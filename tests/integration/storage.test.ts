import { afterEach, describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ServerRepository,
  FileAdapter,
} from "../../packages/storage-adapters/server";
import {
  emptySnapshot,
  createPerson,
  upsertConnection,
  removeEntity,
} from "../../packages/domain/model";
import { ConflictError } from "../../packages/sync-engine/merge";
import {
  SbobyPiShareAdapter,
  MockSbobyTransport,
} from "../../packages/storage-adapters/sbobypishare";
const dirs: string[] = [];
async function root() {
  const p = await fs.mkdtemp(path.join(os.tmpdir(), "graphlive-test-"));
  dirs.push(p);
  return p;
}
afterEach(async () => {
  for (const p of dirs.splice(0))
    await fs.rm(p, { recursive: true, force: true });
});
describe("Server persistence", () => {
  it("persists all requested files, reopens, backs up and restores", async () => {
    const p = await root(),
      repo = new ServerRepository(p, "test");
    const s = emptySnapshot(),
      a = createPerson(s, { nickname: "A" }),
      b = createPerson(s, { nickname: "B" });
    upsertConnection(s, {
      sourceId: a.id,
      targetId: b.id,
      relationshipType: "friend",
    });
    const saved = await repo.save(s, 0);
    expect(saved.revision).toBe(1);
    expect(await new ServerRepository(p, "test").load()).toEqual(saved);
    expect(await repo.adapter.exists("Identities/U1.json")).toBe(true);
    expect(await repo.adapter.exists("sync/connections.json")).toBe(true);
    const backup = await repo.backup();
    removeEntity(saved, b.id, "person");
    const deleted = await repo.save(saved, 1);
    expect(deleted.connections).toHaveLength(0);
    const restored = await repo.save(await repo.restorePreview(backup), 2);
    expect(restored.people).toHaveLength(2);
    expect(restored.connections).toHaveLength(1);
    expect(await new ServerRepository(p, "different").load()).toMatchObject({
      people: [],
    });
  });
  it("rejects stale and concurrent writes instead of overwriting", async () => {
    const repo = new ServerRepository(await root(), "test"),
      s = emptySnapshot();
    createPerson(s, { nickname: "A" });
    await repo.save(s, 0);
    await expect(repo.save(s, 0)).rejects.toBeInstanceOf(ConflictError);
    const next = await repo.load();
    const results = await Promise.allSettled([
      repo.save(next, 1),
      repo.save(next, 1),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.load()).revision).toBe(2);
  });
  it("keeps UUID physical filenames immutable and counters monotonic", async () => {
    const repo = new ServerRepository(await root(), "test"),
      s = emptySnapshot();
    createPerson(s, { nickname: "A" });
    const saved = await repo.save(s, 0);
    saved.people[0].storageId = "F1";
    saved.counters.F = 1;
    await expect(repo.save(saved, 1)).rejects.toThrow("immutableIdentity");
  });
  it("blocks traversal and handles filesystem metadata", async () => {
    const adapter = new FileAdapter(await root());
    for (const p of ["../secret", "/secret", "C:/data", "a\\b", "a/../b"])
      await expect(adapter.read(p)).rejects.toThrow();
    await adapter.write("sync/test.json", "ok");
    expect((await adapter.getMetadata("sync/test.json")).size).toBe(2);
    await adapter.move("sync/test.json", "sync/moved.json");
    expect(await adapter.exists("sync/moved.json")).toBe(true);
    await adapter.remove("sync/moved.json");
    expect(await adapter.exists("sync/moved.json")).toBe(false);
  });
  it("does not erase corrupted state on load", async () => {
    const repo = new ServerRepository(await root(), "test");
    await repo.adapter.write("sync/snapshot.json", "{broken");
    await expect(repo.load()).rejects.toThrow();
    expect(await repo.adapter.read("sync/snapshot.json")).toBe("{broken");
  });
});
describe("SbobyPiShare contract mock", () => {
  it("implements confirmed endpoints and refuses unsupported atomic move", async () => {
    const transport = new MockSbobyTransport(),
      adapter = new SbobyPiShareAdapter(transport, "docs");
    await adapter.write("sync/file.json", "hello");
    expect(await adapter.read("sync/file.json")).toBe("hello");
    expect(await adapter.list("sync")).toEqual(["file.json"]);
    await expect(adapter.move()).rejects.toThrow(
      "upstreamAtomicMoveUnavailable",
    );
    await adapter.remove("sync/file.json");
    expect(await adapter.exists("sync/file.json")).toBe(false);
  });
});
