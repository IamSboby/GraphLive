import {
  OfflineNetworks,
  type OfflineRecord,
  type ReplicaStorage,
} from "../storage-core/offline";
import { GoogleDriveRepository } from "../storage-adapters/google-drive";
import {
  GoogleSession,
  DriveRequestError,
} from "../storage-adapters/google-auth";
import { snapshotSchema } from "../domain/model";

type Host = typeof globalThis & {
  graphliveRequests: { id: number; method: string; options: unknown }[];
  graphliveDeliver: (id: number, value: unknown, error?: string) => void;
  graphliveDone: boolean;
  graphliveRetry: boolean;
  graphliveUuidPool: string[];
};
const host = globalThis as Host;
host.graphliveRequests = [];
host.graphliveDone = false;
host.graphliveRetry = false;
let sequence = 0;
const callbacks = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();
function call<T>(method: string, options: unknown = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = ++sequence;
    callbacks.set(id, { resolve: (value) => resolve(value as T), reject });
    host.graphliveRequests.push({ id, method, options });
  });
}
host.graphliveDeliver = (id, value, error) => {
  const callback = callbacks.get(id);
  callbacks.delete(id);
  if (!callback) throw Error("invalidResponse");
  if (error) callback.reject(Error(error));
  else callback.resolve(value);
};
// The isolate deliberately has no browser, filesystem or network access.
Object.assign(globalThis, {
  URLSearchParams: class {
    constructor(private entries: Record<string, string>) {}
    toString() {
      return Object.entries(this.entries)
        .map(
          ([key, value]) =>
            encodeURIComponent(key) + "=" + encodeURIComponent(value),
        )
        .join("&");
    }
  },
  crypto: {
    randomUUID: () => {
      const id = host.graphliveUuidPool.pop();
      if (!id) throw Error("offlineRetry");
      return id;
    },
  },
  structuredClone: (value: unknown) => JSON.parse(JSON.stringify(value)),
  TextEncoder: class {
    encode(value: string) {
      const bytes: number[] = [];
      for (const char of value) {
        let point = char.codePointAt(0)!;
        if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
        if (point < 0x80) bytes.push(point);
        else if (point < 0x800)
          bytes.push(0xc0 | (point >> 6), 0x80 | (point & 63));
        else if (point < 0x10000)
          bytes.push(
            0xe0 | (point >> 12),
            0x80 | ((point >> 6) & 63),
            0x80 | (point & 63),
          );
        else
          bytes.push(
            0xf0 | (point >> 18),
            0x80 | ((point >> 12) & 63),
            0x80 | ((point >> 6) & 63),
            0x80 | (point & 63),
          );
      }
      return Uint8Array.from(bytes);
    }
  },
});
const storage: ReplicaStorage = {
  get: async (key) =>
    (await call<{ value?: OfflineRecord }>("replicaGet", { key })).value,
  list: async (account) =>
    (await call<{ values: OfflineRecord[] }>("replicaList", { account }))
      .values,
  compareAndSet: async (key, expected, value) =>
    (await call<{ changed: boolean }>("replicaSet", { key, expected, value }))
      .changed,
};
class WorkerSession extends GoogleSession {
  constructor(
    private boundAccount: string,
    shared: boolean,
  ) {
    super();
    this.hasFileAccess = shared;
  }
  override get accountId() {
    return this.boundAccount;
  }
  override async request(url: string, options: RequestInit = {}) {
    const response = await call<{ status: number; body: string }>(
      "driveRequest",
      {
        account: this.boundAccount,
        url,
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body,
      },
    );
    if (response.status === 401) throw Error("driveExpired");
    if (response.status === 403 || response.status === 429)
      throw new DriveRequestError(
        "drivePermission",
        response.status,
        "unknown",
      );
    if (response.status === 404) throw Error("driveNotFound");
    if (
      (response.status < 200 || response.status >= 300) &&
      response.status !== 412
    )
      throw Error("storageError");
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      text: async () => response.body,
      json: async () => JSON.parse(response.body),
    } as Response;
  }
}
async function run() {
  const identity = await call<{ account: string; hasFileAccess: boolean }>(
    "session",
  );
  if (!identity.account) return;
  const engine = new OfflineNetworks(storage);
  const session = new WorkerSession(identity.account, identity.hasFileAccess);
  for (const record of await storage.list(identity.account)) {
    try {
      const scope =
        "drive:" +
        identity.account +
        (record.network === "default" ? "" : ":" + record.network) +
        ":" +
        record.base.ownerId;
      const pending = (
        await call<{
          values: {
            id: string;
            version: string;
            base: unknown;
            data: unknown;
          }[];
        }>("journalList", { scope })
      ).values;
      if (pending.length) {
        await engine.recover(
          record.key,
          pending.map((p) => ({
            base: snapshotSchema.parse(p.base),
            data: snapshotSchema.parse(p.data),
          })),
        );
        for (const value of pending) await call("journalRemove", { value });
      }
      const current = await engine.required(record.key);
      if (current.conflict || (!current.pending && !pending.length)) continue;
      await engine.sync(
        record.key,
        identity.account,
        new GoogleDriveRepository(session, record.network),
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "storageError";
      if (
        ![
          "driveExpired",
          "driveAccountChanged",
          "drivePermission",
          "sharedAccessLost",
          "sharedReadOnly",
          "driveNotFound",
          "invalidData",
          "tooLarge",
        ].includes(code)
      )
        host.graphliveRetry = true;
    }
  }
}
void run()
  .catch(() => {
    host.graphliveRetry = true;
  })
  .finally(() => {
    host.graphliveDone = true;
  });
