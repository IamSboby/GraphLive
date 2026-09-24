import { emptySnapshot, snapshotSchema, type Snapshot } from "../domain/model";
import type { Repository } from "../storage-core";
import { ConflictError } from "../sync-engine/merge";
import { GoogleSession } from "./google-auth";
const api = "https://www.googleapis.com/drive/v2/files";
const upload = "https://www.googleapis.com/upload/drive/v2/files";
type DriveFile = { id: string; title: string; etag: string };
export class GoogleDriveRepository implements Repository {
  constructor(readonly session = new GoogleSession()) {}
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
    const files = (await this.files()).filter(
      (f) => f.title === "graphlive-network.json",
    );
    if (files.length > 1) throw new Error("driveDuplicate");
    const file = files[0];
    if (!file) return { data: emptySnapshot(), file: undefined };
    // Read metadata first: an intervening write makes the conditional update fail.
    const metadata: DriveFile = await (
      await this.session.request(
        api + "/" + encodeURIComponent(file.id) + "?fields=id,title,etag",
      )
    ).json();
    if (!metadata.etag) throw new Error("storageError");
    return { data: await this.read(file.id), file: metadata };
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
    const { data, file } = await this.current();
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
      if (next.preferences.autoBackup)
        await this.create(
          "backup-" + Date.now() + "-" + crypto.randomUUID(),
          data,
        );
      const result = await this.session.request(
        upload + "/" + encodeURIComponent(file.id) + "?uploadType=media",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "If-Match": file.etag,
          },
          body,
        },
      );
      if (result.status === 412) throw new ConflictError(await this.load());
    } else {
      await this.create("graphlive-network.json", next);
      // Simultaneous first-time initialization never silently selects one network.
      await this.current();
    }
    return next;
  }
  async backup() {
    const file = await this.create(
      "backup-" + Date.now() + "-" + crypto.randomUUID(),
      await this.load(),
    );
    return file.id;
  }
  async backups() {
    return (await this.files())
      .filter((f) => f.title.startsWith("backup-"))
      .sort((a, b) => b.title.localeCompare(a.title))
      .map((f) => f.id);
  }
  async restorePreview(id: string) {
    if (!(await this.backups()).includes(id)) throw new Error("invalidPath");
    return this.read(id);
  }
}
