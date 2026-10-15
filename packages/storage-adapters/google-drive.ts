import { parseStoredSnapshot } from "../storage-core";
import {
  backupPolicy,
  backupTime,
  isAutomaticBackup,
  isLegacyBackup,
  needsAutomaticBackup,
} from "../storage-core/backup-policy";
import { emptySnapshot, snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { ConflictError } from "../sync-engine/merge";
import { GoogleSession } from "./google-auth";
const api = "https://www.googleapis.com/drive/v2/files";
const upload = "https://www.googleapis.com/upload/drive/v2/files";
type DriveFile = {
  id: string;
  title: string;
  etag: string;
  properties?: { key: string; value: string; visibility: string }[];
  capabilities?: { canEdit?: boolean; canShare?: boolean };
  parents?: { id: string }[];
  owners?: { displayName?: string; emailAddress?: string }[];
  ownedByMe?: boolean;
};
const sharedId = (id: string) => /^[-\w]+$/.test(id) && id.length <= 200;
const property = (f: DriveFile, key: string) =>
  f.properties?.find((p) => p.key === key)?.value;
const fields =
  "id,title,etag,properties,ownedByMe,capabilities(canEdit,canShare),parents(id),owners(displayName,emailAddress)";
export type DriveMember = {
  id: string;
  name?: string;
  emailAddress?: string;
  role: string;
  type: string;
  deleted?: boolean;
  permissionDetails?: { inherited?: boolean }[];
};
export type NetworkAccess = {
  members: DriveMember[];
  canShare: boolean;
  fileId: string;
};
export class GoogleDriveRepository implements Repository {
  requiresMigration = false;
  readOnly = false;
  ownerLabel = "";
  ownedByMe = false;
  private sharedFileId = "";
  get shared() {
    return Boolean(this.sharedFileId);
  }
  constructor(
    readonly session = new GoogleSession(),
    readonly networkId = "default",
  ) {
    if (networkId.startsWith("shared:") && sharedId(networkId.slice(7))) {
      this.sharedFileId = networkId.slice(7);
      this.readOnly = true;
    } else if (networkId !== "default" && !/^[a-f0-9-]{36}$/.test(networkId))
      throw new Error("invalidPath");
  }
  private get prefix() {
    if (this.sharedFileId) return "shared-" + this.sharedFileId + "-";
    return this.networkId === "default"
      ? ""
      : "network-" + this.networkId + "-";
  }
  async networkIds() {
    const ids = new Set<string>();
    const redirected = new Set<string>();
    for (const f of await this.allFiles()) {
      const target = property(f, "graphliveSharedFileId");
      if (target && !this.session.hasFileAccess)
        throw new Error("driveSharingPermission");
      if (f.title === "graphlive-network.json") ids.add("default");
      const match = /^network-([a-f0-9-]{36})-graphlive-network\.json$/.exec(
        f.title,
      );
      if (match) ids.add(match[1]);
      if (target) redirected.add(target);
    }
    if (this.session.hasFileAccess) {
      let pageToken = "";
      do {
        const query = new URLSearchParams({
          spaces: "drive",
          q: "trashed = false and ((properties has { key='graphlive' and value='network' and visibility='PUBLIC' } and properties has { key='graphlivePublished' and value='true' and visibility='PUBLIC' }) or (sharedWithMe = true and mimeType = 'application/json'))",
          fields: "items(id,title,properties),nextPageToken",
          maxResults: "1000",
          pageToken,
        });
        const page = await (
          await this.session.request(api + "?" + query)
        ).json();
        for (const f of page.items ?? [])
          if (
            !redirected.has(f.id) &&
            ((property(f, "graphlive") === "network" &&
              property(f, "graphlivePublished") === "true") ||
              /\.graphlive\.json$/i.test(f.title ?? ""))
          )
            ids.add("shared:" + f.id);
        pageToken = page.nextPageToken ?? "";
      } while (pageToken);
    }
    return [...ids];
  }
  private async files() {
    const files = await this.allFiles();
    return files
      .filter((f) =>
        this.prefix
          ? f.title.startsWith(this.prefix)
          : !f.title.startsWith("network-") && !f.title.startsWith("shared-"),
      )
      .map((f) => ({ ...f, title: f.title.slice(this.prefix.length) }));
  }
  get journalScope() {
    return this.session.accountId
      ? "drive:" +
          this.session.accountId +
          (this.networkId === "default" ? "" : ":" + this.networkId)
      : undefined;
  }
  backupWarning: string | null = null;
  private backupNames = new Map<string, string>();
  private inventoryCache: { files: DriveFile[]; until: number } | null = null;
  private snapshotCache: { id: string; etag: string; data: Snapshot } | null =
    null;
  private async allFiles() {
    const files: DriveFile[] = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({
        spaces: "appDataFolder",
        q: "trashed = false",
        maxResults: "1000",
        fields: "items(id,title,etag,properties),nextPageToken",
        pageToken,
      });
      const page = await (await this.session.request(api + "?" + query)).json();
      files.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return files;
  }
  private async read(id: string) {
    const response = await this.session.request(
      api + "/" + encodeURIComponent(id) + "?alt=media",
    );
    const text = await response.text();
    if (new TextEncoder().encode(text).length > 10485760)
      throw new Error("tooLarge");
    try {
      return parseStoredSnapshot(JSON.parse(text), this);
    } catch {
      throw new Error("invalidData");
    }
  }
  private async current(): Promise<{
    data: Snapshot;
    file: DriveFile | undefined;
    inventory: DriveFile[];
  }> {
    if (this.sharedFileId) {
      if (!this.session.hasFileAccess)
        throw new Error("driveSharingPermission");
      const file: DriveFile = await (
        await this.session.request(
          api +
            "/" +
            encodeURIComponent(this.sharedFileId) +
            "?fields=" +
            fields,
        )
      ).json();
      if (
        !file.etag ||
        (property(file, "graphlive") !== "network" &&
          !/\.graphlive\.json$/i.test(file.title ?? ""))
      )
        throw new Error("invalidData");
      this.readOnly = file.capabilities?.canEdit !== true;
      this.ownedByMe = file.ownedByMe === true;
      this.ownerLabel =
        file.owners
          ?.map((p) =>
            p.displayName && p.emailAddress
              ? p.displayName + " · " + p.emailAddress
              : p.displayName || p.emailAddress,
          )
          .filter(Boolean)
          .join(", ") || "";
      const cached = this.snapshotCache;
      const data =
        cached?.id === file.id && cached.etag === file.etag
          ? cached.data
          : await this.read(file.id);
      this.snapshotCache = { id: file.id, etag: file.etag, data };
      // Backups are private to each participant, never part of the shared folder.
      const inventory =
        this.inventoryCache && Date.now() < this.inventoryCache.until
          ? this.inventoryCache.files
          : await this.files();
      this.inventoryCache = {
        files: inventory,
        until:
          this.inventoryCache?.files === inventory
            ? this.inventoryCache.until
            : Date.now() + 60000,
      };
      return { file, data, inventory };
    }
    const inventory =
      this.inventoryCache && Date.now() < this.inventoryCache.until
        ? this.inventoryCache.files
        : await this.files();
    this.inventoryCache = {
      files: inventory,
      until:
        this.inventoryCache?.files === inventory
          ? this.inventoryCache.until
          : Date.now() + 60000,
    };
    const files = inventory.filter((f) => f.title === "graphlive-network.json");
    if (files.length > 1) throw new Error("driveDuplicate");
    const file = files[0];
    if (!file) return { data: emptySnapshot(), file: undefined, inventory };
    // Read metadata first: an intervening write makes the conditional update fail.
    const metadata: DriveFile = await (
      await this.session.request(
        api + "/" + encodeURIComponent(file.id) + "?fields=" + fields,
      )
    ).json();
    const target = property(metadata, "graphliveSharedFileId");
    if (target) {
      if (!sharedId(target)) throw new Error("invalidData");
      this.sharedFileId = target;
      this.inventoryCache = null;
      this.snapshotCache = null;
      return this.current();
    }
    if (!metadata.etag) throw new Error("storageError");
    const cached = this.snapshotCache;
    const data =
      cached?.id === file.id && cached.etag === metadata.etag
        ? cached.data
        : await this.read(file.id);
    this.snapshotCache = { id: file.id, etag: metadata.etag, data };
    return { data, file: metadata, inventory };
  }
  private async checkedCurrent() {
    try {
      return await this.current();
    } catch (error) {
      if (
        this.shared &&
        error instanceof Error &&
        ["drivePermission", "driveNotFound"].includes(error.message)
      ) {
        this.readOnly = true;
        throw new Error("sharedAccessLost");
      }
      throw error;
    }
  }
  async load() {
    return (await this.checkedCurrent()).data;
  }
  private async create(title: string, data: Snapshot) {
    const boundary = "graphlive_" + crypto.randomUUID();
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ title: this.prefix + title, mimeType: "application/json", parents: [{ id: "appDataFolder" }] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
    return (await (
      await this.session.request(
        upload + "?uploadType=multipart&fields=id,title,etag",
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      )
    ).json()) as DriveFile;
  }
  async save(input: Snapshot, expectedRevision: number) {
    const { data, file, inventory } = await this.checkedCurrent();
    if (this.readOnly) throw new Error("sharedReadOnly");
    if (data.revision !== expectedRevision) throw new ConflictError(data);
    const next = snapshotSchema.parse({
      ...input,
      revision: expectedRevision + 1,
    });
    for (const key of ["M", "F", "L", "U"] as const)
      next.counters[key] = Math.max(next.counters[key], data.counters[key]);
    const body = JSON.stringify(next);
    if (new TextEncoder().encode(body).length > 10485760)
      throw new Error("tooLarge");
    if (file) {
      if (
        next.preferences.autoBackup &&
        needsAutomaticBackup(inventory.map((f) => f.title))
      ) {
        const title = "auto-backup-" + Date.now() + "-" + crypto.randomUUID();
        const created = await this.create(title, data);
        inventory.push({ ...created, title });
      }
      const result = await this.session.request(
        upload +
          "/" +
          encodeURIComponent(file.id) +
          "?uploadType=media&fields=id,title,etag",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "If-Match": file.etag,
          },
          body,
        },
      );
      if (result.status === 412) {
        this.snapshotCache = null;
        this.inventoryCache = null;
        throw new ConflictError(await this.load());
      }
      const updated: DriveFile = await result.json();
      this.snapshotCache = updated.etag
        ? { id: file.id, etag: updated.etag, data: next }
        : null;
    } else {
      await this.create("graphlive-network.json", next);
      this.inventoryCache = null;
      // Simultaneous first-time initialization never silently selects one network.
      await this.current();
    }
    try {
      await this.removeBackups(
        inventory
          .filter((f) => isAutomaticBackup(f.title))
          .sort((a, b) => b.title.localeCompare(a.title))
          .slice(backupPolicy.automaticLimit),
      );
      this.backupWarning = null;
    } catch {
      this.backupWarning = "backupCleanupFailed";
    }
    return next;
  }
  async backup() {
    const file = await this.create(
      "manual-backup-" + Date.now() + "-" + crypto.randomUUID(),
      await this.load(),
    );
    return file.id;
  }
  async backups() {
    const files = (await this.files())
      .filter((f) => /^(?:(?:auto|manual)-)?backup-/.test(f.title))
      .sort(
        (a, b) =>
          backupTime(b.title) - backupTime(a.title) ||
          b.title.localeCompare(a.title),
      );
    this.backupNames = new Map(files.map((f) => [f.id, f.title]));
    return files.map((f) => f.id);
  }
  backupInfo(id: string) {
    const title = this.backupNames.get(id) ?? "";
    return {
      timestamp: backupTime(title),
      kind: title.startsWith("auto-")
        ? "backupAuto"
        : title.startsWith("manual-")
          ? "backupManual"
          : "backupLegacy",
    };
  }
  async legacyCleanupPlan() {
    return (await this.files())
      .filter((f) => isLegacyBackup(f.title))
      .sort((a, b) => b.title.localeCompare(a.title))
      .slice(backupPolicy.legacyKeep)
      .map((f) => f.id);
  }
  async cleanupLegacy(ids: string[]) {
    const eligible = (await this.files())
      .filter((f) => isLegacyBackup(f.title))
      .sort((a, b) => b.title.localeCompare(a.title))
      .slice(backupPolicy.legacyKeep)
      .filter((f) => ids.includes(f.id));
    await this.removeBackups(eligible);
    return eligible.length;
  }
  private async removeBackups(files: DriveFile[]) {
    for (const file of files) {
      if (
        !file.etag ||
        !(isAutomaticBackup(file.title) || isLegacyBackup(file.title))
      )
        throw Error("backupCleanupFailed");
      const result = await this.session.request(
        api + "/" + encodeURIComponent(file.id),
        { method: "DELETE", headers: { "If-Match": file.etag } },
      );
      if (!result.ok) throw Error("backupCleanupFailed");
      if (this.inventoryCache)
        this.inventoryCache.files = this.inventoryCache.files.filter(
          (f) => f.id !== file.id,
        );
    }
  }
  async restorePreview(id: string) {
    if (!(await this.backups()).includes(id)) throw new Error("invalidPath");
    return this.read(id);
  }
  async publishShared() {
    if (!this.session.hasFileAccess) throw new Error("driveSharingPermission");
    const { data, file } = await this.current();
    if (this.sharedFileId) {
      if (file && property(file, "graphlivePublished") !== "true")
        await this.finishPublication(this.sharedFileId);
      return this.sharedFileId;
    }
    if (!file) throw new Error("missingSnapshot");
    const folder = await (
      await this.session.request(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.preferences.networkName || "GraphLive",
          mimeType: "application/vnd.google-apps.folder",
        }),
      })
    ).json();
    const boundary = "graphlive_" + crypto.randomUUID();
    const metadata = {
      title: (data.preferences.networkName || "GraphLive") + ".graphlive.json",
      mimeType: "application/json",
      parents: [{ id: folder.id }],
      properties: [
        { key: "graphlive", value: "network", visibility: "PUBLIC" },
      ],
    };
    const body = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
    const created: DriveFile = await (
      await this.session.request(
        upload + "?uploadType=multipart&fields=id,title,etag",
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      )
    ).json();
    // Commit the redirect conditionally before inviting anyone. A concurrent edit
    // invalidates this conversion rather than leaving an outdated shared network.
    const linked = await this.session.request(
      api + "/" + encodeURIComponent(file.id),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": file.etag },
        body: JSON.stringify({
          properties: [
            {
              key: "graphliveSharedFileId",
              value: created.id,
              visibility: "PRIVATE",
            },
          ],
        }),
      },
    );
    if (linked.status === 412) {
      await this.session.request(
        api + "/" + encodeURIComponent(folder.id) + "/trash",
        { method: "POST" },
      );
      this.snapshotCache = null;
      this.inventoryCache = null;
      throw new ConflictError(await this.load());
    }
    this.sharedFileId = created.id;
    this.inventoryCache = null;
    this.snapshotCache = null;
    await this.finishPublication(created.id);
    return created.id;
  }
  private async finishPublication(id: string) {
    // Only completed conversions appear in the shared catalog. Retrying after
    // a network interruption reuses the committed redirect.
    await this.session.request(api + "/" + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: [
          { key: "graphlive", value: "network", visibility: "PUBLIC" },
          { key: "graphlivePublished", value: "true", visibility: "PUBLIC" },
        ],
      }),
    });
  }
  async syncSharedTitle() {
    const { data, file } = await this.checkedCurrent();
    const title =
      (data.preferences.networkName || "GraphLive") + ".graphlive.json";
    if (this.shared && file && !this.readOnly && file.title !== title) {
      await this.session.request(api + "/" + encodeURIComponent(file.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    }
  }
  async access(): Promise<NetworkAccess> {
    const { file } = await this.checkedCurrent();
    if (!this.shared || !file)
      return { members: [], canShare: true, fileId: "" };
    const members: DriveMember[] = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({
        fields:
          "items(id,name,emailAddress,role,type,deleted,permissionDetails(inherited)),nextPageToken",
        maxResults: "100",
        pageToken,
      });
      const page = await (
        await this.session.request(
          api + "/" + encodeURIComponent(file.id) + "/permissions?" + query,
        )
      ).json();
      members.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return {
      members: members.filter((p) => !p.deleted),
      canShare: file.capabilities?.canShare === true,
      fileId: file.id,
    };
  }
  canRevoke(member: DriveMember) {
    return (
      member.type === "user" &&
      member.role !== "owner" &&
      member.id !== this.session.accountId &&
      !member.permissionDetails?.some((detail) => detail.inherited)
    );
  }
  async revoke(permissionId: string) {
    const access = await this.access();
    const member = access.members.find((p) => p.id === permissionId);
    if (!access.canShare || !member || !this.canRevoke(member))
      throw new Error("drivePermission");
    await this.session.request(
      api +
        "/" +
        encodeURIComponent(access.fileId) +
        "/permissions/" +
        encodeURIComponent(permissionId),
      { method: "DELETE" },
    );
  }
  async invite(email: string, role: "reader" | "writer") {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !["reader", "writer"].includes(role)
    )
      throw new Error("invalidData");
    const { file } = await this.current();
    if (!this.sharedFileId || !file?.capabilities?.canShare)
      throw new Error("drivePermission");
    // The invitation covers only this network file. Other files and private
    // backups in either account are outside this permission.
    await this.session.request(
      api +
        "/" +
        encodeURIComponent(file.id) +
        "/permissions?sendNotificationEmails=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", role, value: email.trim() }),
      },
    );
  }
}
