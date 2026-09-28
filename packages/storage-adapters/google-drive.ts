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
type DriveFile = { id: string; title: string; etag: string };
export class GoogleDriveRepository implements Repository {
  constructor(readonly session = new GoogleSession()) {}
  get journalScope() {
    return this.session.accountId
      ? "drive:" + this.session.accountId
      : undefined;
  }
  backupWarning: string | null = null;
  private backupNames = new Map<string, string>();
  private inventoryCache: { files: DriveFile[]; until: number } | null = null;
  private snapshotCache: { id: string; etag: string; data: Snapshot } | null =
    null;
  private async files() {
    const files: DriveFile[] = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({
        spaces: "appDataFolder",
        q: "trashed = false",
        maxResults: "1000",
        fields: "items(id,title,etag),nextPageToken",
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
    return snapshotSchema.parse(JSON.parse(text));
  }
  private async current() {
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
        api + "/" + encodeURIComponent(file.id) + "?fields=id,title,etag",
      )
    ).json();
    if (!metadata.etag) throw new Error("storageError");
    const cached = this.snapshotCache;
    const data =
      cached?.id === file.id && cached.etag === metadata.etag
        ? cached.data
        : await this.read(file.id);
    this.snapshotCache = { id: file.id, etag: metadata.etag, data };
    return { data, file: metadata, inventory };
  }
  async load() {
    return (await this.current()).data;
  }
  private async create(title: string, data: Snapshot) {
    const boundary = "graphlive_" + crypto.randomUUID();
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ title, mimeType: "application/json", parents: [{ id: "appDataFolder" }] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
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
    const { data, file, inventory } = await this.current();
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
}
