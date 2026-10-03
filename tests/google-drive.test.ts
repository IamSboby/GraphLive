import { describe, expect, it, vi } from "vitest";
import { GoogleDriveRepository } from "../packages/storage-adapters/google-drive";
import { GoogleSession } from "../packages/storage-adapters/google-auth";
import { emptySnapshot } from "../packages/domain/model";
import { ConflictError } from "../packages/sync-engine/merge";
const file = { id: "network", title: "graphlive-network.json", etag: '"v1"' };
function setup() {
  const session = new GoogleSession();
  const request = vi.spyOn(session, "request");
  const repo = new GoogleDriveRepository(session);
  const json = (data: unknown) =>
    request.mockResolvedValueOnce(Response.json(data));
  const current = (revision: number) => {
    const data = { ...emptySnapshot(), revision };
    json({ items: [file] });
    json(file);
    json(data);
    return data;
  };
  return { repo, request, json, current };
}
describe("Google Drive repository", () => {
  const copies = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix}${i}`,
      title: `${prefix}backup-${Date.now() - i * 1000}-00000000-0000-0000-0000-000000000000`,
      etag: '"copy"',
    }));
  it("retains twenty automatic copies only after saving, protecting manual and legacy files", async () => {
    const { repo, request, json } = setup();
    const automatic = copies("auto-", 22);
    json({
      items: [file, ...automatic, ...copies("manual-", 2), ...copies("", 22)],
    });
    json(file);
    json(emptySnapshot());
    json({});
    request.mockResolvedValue(new Response(null, { status: 204 }));
    expect((await repo.save(emptySnapshot(), 0)).revision).toBe(1);
    const mutations = request.mock.calls.filter(([, init]) => init?.method);
    expect(mutations.map(([, init]) => init?.method)).toEqual([
      "PUT",
      "DELETE",
      "DELETE",
    ]);
    expect(mutations.slice(1).map(([url]) => url.split("/").at(-1))).toEqual([
      "auto-20",
      "auto-21",
    ]);
    expect(mutations[1][1]?.headers).toEqual({ "If-Match": '"copy"' });
  });
  it("reports failed cleanup without reporting the saved network as lost", async () => {
    const { repo, request, json } = setup();
    json({ items: [file, ...copies("auto-", 21)] });
    json(file);
    json(emptySnapshot());
    json({});
    request.mockRejectedValueOnce(Error("drivePermission"));
    expect((await repo.save(emptySnapshot(), 0)).revision).toBe(1);
    expect(repo.backupWarning).toBe("backupCleanupFailed");
  });
  it("revalidates explicit legacy cleanup and never deletes newer copies or unrelated IDs", async () => {
    const { repo, request, json } = setup();
    const items = [file, ...copies("", 23), ...copies("manual-", 2)];
    json({ items });
    expect(await repo.legacyCleanupPlan()).toEqual(["20", "21", "22"]);
    json({ items });
    request.mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await repo.cleanupLegacy(["network", "manual-0", "0", "20", "22"]),
    ).toBe(2);
    expect(
      request.mock.calls
        .filter(([, init]) => init?.method === "DELETE")
        .map(([url]) => url.split("/").at(-1)),
    ).toEqual(["20", "22"]);
  });
  it("opens an empty app space without creating files", async () => {
    const { repo, request, json } = setup();
    json({ items: [] });
    expect((await repo.load()).revision).toBe(0);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects stale revisions without uploading", async () => {
    const { repo, request, current } = setup();
    const data = current(3);
    await expect(repo.save(data, 2)).rejects.toBeInstanceOf(ConflictError);
    expect(request).toHaveBeenCalledTimes(3);
  });
  it("uses the file ETag for conditional writes", async () => {
    const { repo, request, current, json } = setup();
    const data = current(2);
    data.preferences.autoBackup = false;
    json({});
    expect((await repo.save(data, 2)).revision).toBe(3);
    expect(request.mock.calls.at(-1)?.[1]).toMatchObject({
      method: "PUT",
      headers: { "If-Match": '"v1"' },
    });
  });
  it("reuses unchanged content while revalidating ETags on every save", async () => {
    const { repo, request, current, json } = setup();
    const data = current(2);
    data.preferences.autoBackup = false;
    await repo.load();
    json(file);
    json({ ...file, etag: '"v3"' });
    const saved = await repo.save(data, 2);
    json({ ...file, etag: '"v3"' });
    json({ ...file, etag: '"v4"' });
    await repo.save(saved, 3);
    expect(
      request.mock.calls.filter(([url]) => url.includes("alt=media")),
    ).toHaveLength(1);
    expect(
      request.mock.calls
        .filter(([, init]) => init?.method === "PUT")
        .at(-1)?.[1]?.headers,
    ).toMatchObject({ "If-Match": '"v3"' });
  });
  it("returns remote changes after a concurrent write", async () => {
    const { repo, request, current } = setup();
    const data = current(2);
    data.preferences.autoBackup = false;
    request.mockResolvedValueOnce(new Response(null, { status: 412 }));
    current(3);
    await expect(repo.save(data, 2)).rejects.toMatchObject({
      remote: { revision: 3 },
    });
  });
  it("does not pick one of two simultaneously created networks", async () => {
    const { repo, json } = setup();
    json({ items: [file, { ...file, id: "second" }] });
    await expect(repo.load()).rejects.toThrow("driveDuplicate");
  });
  it("refuses a missing ETag instead of overwriting unconditionally", async () => {
    const { repo, json } = setup();
    json({ items: [file] });
    json({ ...file, etag: "" });
    await expect(repo.save(emptySnapshot(), 0)).rejects.toThrow("storageError");
  });
  it("paginates backups and rejects arbitrary restore IDs", async () => {
    const { repo, json } = setup();
    json({ items: [{ ...file, title: "backup-001" }], nextPageToken: "next" });
    json({ items: [{ ...file, id: "new", title: "backup-002" }] });
    expect(await repo.backups()).toEqual(["new", "network"]);
    json({ items: [] });
    await expect(repo.restorePreview("unrelated")).rejects.toThrow(
      "invalidPath",
    );
  });
});
it("Drive catalogs networks and scopes backup reads and cleanup to their own identity", async () => {
  const session = new GoogleSession();
  const id = crypto.randomUUID();
  const request = vi.spyOn(session, "request").mockImplementation(async () =>
    Response.json({
      items: [
        file,
        {
          id: "game",
          title: `network-${id}-graphlive-network.json`,
          etag: '"v1"',
        },
        { id: "old-copy", title: "manual-backup-1000-x", etag: '"v1"' },
        {
          id: "game-copy",
          title: `network-${id}-manual-backup-1000-x`,
          etag: '"v1"',
        },
      ],
    }),
  );
  const root = new GoogleDriveRepository(session);
  expect(await root.networkIds()).toEqual(["default", id]);
  expect(await root.backups()).toEqual(["old-copy"]);
  const game = new GoogleDriveRepository(session, id);
  expect(await game.backups()).toEqual(["game-copy"]);
  await expect(game.restorePreview("old-copy")).rejects.toThrow("invalidPath");
  expect(request.mock.calls.every(([, init]) => !init?.method)).toBe(true);
});
