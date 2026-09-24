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
