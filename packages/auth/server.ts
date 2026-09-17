import { getServerSession, type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import { configuration } from "../config";
import { createHash } from "node:crypto";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            checks: ["pkce", "state"],
          }),
        ]
      : []),
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          AzureAD({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
            tenantId: process.env.AZURE_AD_TENANT_ID,
            checks: ["pkce", "state"],
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account)
        token.workspace = createHash("sha256")
          .update(account.provider + ":" + account.providerAccountId)
          .digest("hex");
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.name = String(token.workspace ?? "");
      return session;
    },
  },
  logger: {
    error(code) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "auth.failure",
          code,
        }),
      );
    },
    warn(code) {
      console.warn(
        JSON.stringify({ level: "warning", event: "auth.warning", code }),
      );
    },
    debug() {},
  },
};
export async function identity() {
  if (!configuration().auth) return "local-instance";
  if (!process.env.NEXTAUTH_SECRET || authOptions.providers.length === 0)
    throw new Error("authNotConfigured");
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) throw new Error("unauthorized");
  return session.user.name;
}
