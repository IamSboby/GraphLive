import NextAuth from "next-auth";
import { authOptions } from "@/packages/auth/server";
import { configuration } from "@/packages/config";
const handler = NextAuth(authOptions);
export async function GET(...args: Parameters<typeof handler>) {
  if (!configuration().auth) return new Response(null, { status: 404 });
  return handler(...args);
}
export async function POST(...args: Parameters<typeof handler>) {
  if (!configuration().auth) return new Response(null, { status: 404 });
  return handler(...args);
}
