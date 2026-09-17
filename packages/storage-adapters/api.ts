import { NextResponse } from "next/server";
import path from "node:path";
import { identity } from "../auth/server";
import { configuration } from "../config";
import { ServerRepository } from "./server";
import { ConflictError } from "../sync-engine/merge";
const rates = new Map<string, { count: number; start: number }>();
export async function repository(request: Request) {
  if (!configuration().server) throw new Error("disabled");
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin;
    if (origin !== expected) throw new Error("forbidden");
  }
  const user = await identity(),
    now = Date.now();
  if (rates.size > 10000)
    for (const [key, v] of rates) if (now - v.start > 60000) rates.delete(key);
  const rate = rates.get(user);
  if (rate && now - rate.start < 60000) {
    if (++rate.count > 120) throw new Error("rateLimit");
  } else rates.set(user, { count: 1, start: now });
  return new ServerRepository(
    path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR ?? "data"),
    user,
  );
}
export async function readBody(request: Request) {
  const max = Number(process.env.MAX_SNAPSHOT_BYTES ?? 10485760);
  if (Number(request.headers.get("content-length")) > max)
    throw new Error("tooLarge");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalidData");
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("tooLarge");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function failure(error: unknown) {
  if (error instanceof ConflictError)
    return NextResponse.json(
      { error: "conflict", remote: error.remote },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  const code = error instanceof Error ? error.message : "";
  const known: Record<string, number> = {
    unauthorized: 401,
    authNotConfigured: 503,
    disabled: 404,
    forbidden: 403,
    rateLimit: 429,
    tooLarge: 413,
    storageBusy: 503,
    immutableIdentity: 400,
  };
  const status = known[code] ?? 400;
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "storage.failure",
      operationId: crypto.randomUUID(),
      status,
    }),
  );
  return NextResponse.json(
    { error: code in known ? code : "storageError" },
    { status },
  );
}
export const response = (value: unknown) =>
  NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
