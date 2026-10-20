import { it, expect } from "vitest";
import { rolldown } from "rolldown";
import vm from "node:vm";
import { createPerson, emptySnapshot } from "../packages/domain/model";
import {
  replicaKey,
  type OfflineRecord,
} from "../packages/storage-core/offline";

it("runs the bundled background engine without DOM, fetch or browser storage and merges web changes", async () => {
  const builder = await rolldown({
    input: "packages/sync-engine/android-worker.ts",
    platform: "neutral",
  });
  const bundle = await builder.generate({ format: "iife" });
  await builder.close();
  const base = emptySnapshot();
  createPerson(base, { nickname: "Owner" });
  base.preferences.autoBackup = false;
  const local = structuredClone(base);
  local.people[0].profile.firstName = "Mobile";
  let remote = structuredClone(base);
  remote.people[0].profile.lastName = "Web";
  remote.revision++;
  let record: OfflineRecord = {
    key: replicaKey("account", "default"),
    account: "account",
    network: "default",
    version: 1,
    base,
    local,
    pending: true,
    readOnly: false,
    lastSync: "2026-10-19T00:00:00Z",
  };
  const context = vm.createContext({
    graphliveUuidPool: [crypto.randomUUID()],
  });
  vm.runInContext((bundle.output[0] as { code: string }).code, context);
  let uploads = 0;
  for (let step = 0; step < 100; step++) {
    await new Promise((resolve) => setImmediate(resolve));
    const state = JSON.parse(
      vm.runInContext(
        "JSON.stringify({done:graphliveDone,retry:graphliveRetry,requests:graphliveRequests.splice(0)})",
        context,
      ),
    );
    if (state.done) {
      expect(state.retry).toBe(false);
      expect(uploads).toBe(1);
      expect(remote.people[0].profile).toMatchObject({
        firstName: "Mobile",
        lastName: "Web",
      });
      expect(record.pending).toBe(false);
      return;
    }
    for (const request of state.requests) {
      let result: unknown;
      const o = request.options;
      switch (request.method) {
        case "session":
          result = { account: "account", hasFileAccess: false };
          break;
        case "replicaList":
          result = { values: [record] };
          break;
        case "replicaGet":
          result = { value: record };
          break;
        case "journalList":
          result = { values: [] };
          break;
        case "replicaSet": {
          const changed = record.version === o.expected;
          if (changed) record = o.value;
          result = { changed };
          break;
        }
        case "driveRequest": {
          expect(o.account).toBe("account");
          const url = new URL(o.url);
          const file = {
            id: "canonical",
            title: "graphlive-network.json",
            etag: '"revision"',
            capabilities: { canEdit: true },
          };
          let body: unknown;
          if (o.method === "PUT") {
            expect(o.headers["If-Match"]).toBe(file.etag);
            remote = JSON.parse(o.body);
            uploads++;
            body = file;
          } else if (url.pathname.endsWith("/files")) body = { items: [file] };
          else body = url.searchParams.get("alt") === "media" ? remote : file;
          result = { status: 200, body: JSON.stringify(body) };
          break;
        }
        default:
          throw Error("Unexpected host request: " + request.method);
      }
      vm.runInContext(
        `graphliveDeliver(${request.id}, ${JSON.stringify(result)}, null)`,
        context,
      );
    }
  }
  throw Error("Background engine did not finish");
});
