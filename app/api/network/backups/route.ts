import { repository, failure, response } from "@/packages/storage-adapters/api";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    const repo = await repository(r),
      id = new URL(r.url).searchParams.get("id");
    return response(id ? await repo.restorePreview(id) : await repo.backups());
  } catch (e) {
    return failure(e);
  }
}
export async function POST(r: Request) {
  try {
    return response({ id: await (await repository(r)).backup() });
  } catch (e) {
    return failure(e);
  }
}
