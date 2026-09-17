import {
  safePath,
  type StorageAdapter,
  type StorageMetadata,
} from "../storage-core";
/** Backend-only transport. Not exposed as a production Repository: upstream has no CAS or move. */
export interface SbobyTransport {
  request(
    method: "GET" | "PUT" | "DELETE" | "POST",
    endpoint: string,
    remotePath: string,
    body?: string,
  ): Promise<Response>;
}
export class SbobyPiShareAdapter implements StorageAdapter {
  constructor(
    private transport: SbobyTransport,
    private share: string,
    private remoteRoot = "GraphLiveFiles",
  ) {
    safePath(remoteRoot);
  }
  private async request(
    method: "GET" | "PUT" | "DELETE",
    p: string,
    content = false,
    body?: string,
  ) {
    safePath(p);
    const r = await this.transport.request(
      method,
      `/v1/shares/${encodeURIComponent(this.share)}/files${content ? "/content" : ""}`,
      `${this.remoteRoot}/${p}`,
      body,
    );
    if (!r.ok) throw new Error(`sbobypishare_${r.status}`);
    return r;
  }
  async read(p: string) {
    return (await this.request("GET", p, true)).text();
  }
  async write(p: string, content: string) {
    await this.request("PUT", p, true, content);
  }
  async list(p: string) {
    const response = await (await this.request("GET", p)).json();
    const entries = Array.isArray(response) ? response : response.entries;
    if (!Array.isArray(entries)) throw new Error("invalidRemoteResponse");
    return entries.map((entry: { name: string }) => entry.name);
  }
  async remove(p: string) {
    await this.request("DELETE", p);
  }
  async move(): Promise<void> {
    throw new Error("upstreamAtomicMoveUnavailable");
  }
  async exists(p: string) {
    try {
      await this.read(p);
      return true;
    } catch (e) {
      if (e instanceof Error && e.message === "sbobypishare_404") return false;
      throw e;
    }
  }
  async getMetadata(p: string): Promise<StorageMetadata> {
    const r = await this.request("GET", p, true);
    const content = await r.arrayBuffer();
    return {
      size: content.byteLength,
      modifiedAt: r.headers.get("last-modified") ?? "",
      etag: r.headers.get("etag") ?? undefined,
    };
  }
}
/** Explicit test fixture only. Does not make network requests. */
export class MockSbobyTransport implements SbobyTransport {
  files = new Map<string, string>();
  async request(method: string, endpoint: string, p: string, body?: string) {
    if (method === "PUT") {
      this.files.set(p, body ?? "");
      return new Response(null, { status: 204 });
    }
    if (method === "DELETE") {
      this.files.delete(p);
      return new Response(null, { status: 204 });
    }
    if (endpoint.endsWith("/content"))
      return this.files.has(p)
        ? new Response(this.files.get(p))
        : new Response(null, { status: 404 });
    return Response.json({
      entries: [...this.files.keys()]
        .filter((k) => k.startsWith(p + "/"))
        .map((k) => ({ name: k.slice(p.length + 1) })),
    });
  }
}
