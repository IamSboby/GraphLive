import {
  repository,
  readBody,
  failure,
  response,
} from "@/packages/storage-adapters/api";
import { snapshotSchema } from "@/packages/domain/model";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    return response(await (await repository(r)).load());
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(r: Request) {
  try {
    const repo = await repository(r),
      body = z
        .object({
          expectedRevision: z.number().int().nonnegative(),
          value: snapshotSchema,
        })
        .strict()
        .parse(await readBody(r));
    return response(await repo.save(body.value, body.expectedRevision));
  } catch (e) {
    return failure(e);
  }
}
