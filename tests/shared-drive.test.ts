import { describe, expect, it, vi } from "vitest";
import { GoogleDriveRepository } from "../packages/storage-adapters/google-drive";
import { GoogleSession } from "../packages/storage-adapters/google-auth";
import { emptySnapshot, createPerson } from "../packages/domain/model";
import { ConflictError } from "../packages/sync-engine/merge";

function setup(editable = true) {
  const session = new GoogleSession();
  session.hasFileAccess = true;
  vi.spyOn(session, "accountId", "get").mockReturnValue("owner");
  let data = emptySnapshot();
  createPerson(data, { nickname: "Alex" });
  data.preferences.autoBackup = false;
  let etag = "v1";
  let redirect = false;
  const properties = [
    { key: "graphlive", value: "network", visibility: "PUBLIC" },
  ];
  const request = vi
    .spyOn(session, "request")
    .mockImplementation(async (url, init) => {
      const u = new URL(url);
      if (init?.method === "PATCH") {
        redirect = true;
        return Response.json({});
      }
      if (init?.method === "PUT") {
        expect(new Headers(init.headers).get("If-Match")).toBe(etag);
        data = JSON.parse(String(init.body));
        etag = "v" + data.revision;
        return Response.json({ id: "shared-file", etag });
      }
      if (init?.method === "POST" && url.includes("upload"))
        return Response.json({ id: "shared-file", etag });
      if (init?.method === "POST") return Response.json({ id: "folder" });
      if (u.searchParams.get("alt") === "media") return Response.json(data);
      if (u.pathname.endsWith("/shared-file"))
        return Response.json({
          id: "shared-file",
          title: "Alex.graphlive.json",
          etag,
          properties,
          capabilities: { canEdit: editable, canShare: editable },
        });
      if (u.pathname.endsWith("/original"))
        return Response.json({
          id: "original",
          title: "graphlive-network.json",
          etag,
          properties: redirect
            ? [
                {
                  key: "graphliveSharedFileId",
                  value: "shared-file",
                  visibility: "PRIVATE",
                },
              ]
            : [],
        });
      if (u.searchParams.get("spaces") === "drive")
        return Response.json({ items: [{ id: "shared-file" }] });
      return Response.json({
        items: [
          {
            id: "original",
            title: "graphlive-network.json",
            etag,
            properties: redirect
              ? [
                  {
                    key: "graphliveSharedFileId",
                    value: "shared-file",
                    visibility: "PRIVATE",
                  },
                ]
              : [],
          },
        ],
      });
    });
  return { session, request, getData: () => data };
}
describe("shared networks", () => {
  it("redirects the original network to one canonical file before inviting and deduplicates the catalog", async () => {
    const { session, request } = setup();
    const original = new GoogleDriveRepository(session);
    const scope = original.journalScope;
    expect(await original.publishShared()).toBe("shared-file");
    expect(await original.publishShared()).toBe("shared-file");
    expect(
      request.mock.calls.filter(
        ([u, o]) => u.includes("upload") && o?.method === "POST",
      ),
    ).toHaveLength(1);
    expect(request.mock.calls.some(([u]) => u.includes("permissions"))).toBe(
      false,
    );
    await original.invite("friend@example.com", "reader");
    expect(request.mock.calls.at(-1)?.[1]?.body).toBe(
      JSON.stringify({
        type: "user",
        role: "reader",
        value: "friend@example.com",
      }),
    );
    expect(await new GoogleDriveRepository(session).networkIds()).toEqual([
      "default",
    ]);
    const oldDevice = new GoogleDriveRepository(session);
    expect(oldDevice.journalScope).toBe(scope);
    const data = await oldDevice.load();
    data.preferences.networkName = "Shared name";
    await oldDevice.save(data, data.revision);
    expect(
      (await new GoogleDriveRepository(session, "shared:shared-file").load())
        .preferences.networkName,
    ).toBe("Shared name");
  });
  it("rejects writes and invitations for readers without sending mutations", async () => {
    const { session, request } = setup(false);
    const repo = new GoogleDriveRepository(session, "shared:shared-file");
    const data = await repo.load();
    expect(repo.readOnly).toBe(true);
    await expect(repo.save(data, data.revision)).rejects.toThrow(
      "sharedReadOnly",
    );
    await expect(repo.invite("friend@example.com", "writer")).rejects.toThrow(
      "drivePermission",
    );
    expect(request.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
  it("rejects stale edits and isolates backups from other networks", async () => {
    const { session, request } = setup();
    const repo = new GoogleDriveRepository(session, "shared:shared-file");
    const data = await repo.load();
    await expect(repo.save(data, data.revision + 1)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(await repo.backups()).toEqual([]);
    await expect(repo.restorePreview("original")).rejects.toThrow(
      "invalidPath",
    );
    await repo.backup();
    expect(String(request.mock.calls.at(-1)?.[1]?.body)).toContain(
      '"parents":[{"id":"appDataFolder"}]',
    );
    expect(String(request.mock.calls.at(-1)?.[1]?.body)).toContain(
      "shared-shared-file-manual-backup-",
    );
  });
  it("rejects arbitrary non-GraphLive files selected in Picker", async () => {
    const { session, request } = setup();
    request.mockResolvedValueOnce(Response.json({ id: "other", etag: "v1" }));
    await expect(
      new GoogleDriveRepository(session, "shared:other").load(),
    ).rejects.toThrow("invalidData");
  });
});
