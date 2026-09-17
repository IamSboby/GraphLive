import { App } from "@/packages/ui/app";
import { configuration } from "@/packages/config";
import { identity } from "@/packages/auth/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  const config = configuration();
  let authenticated = false,
    authError = false;
  if (config.auth) {
    try {
      await identity();
      authenticated = true;
    } catch (e) {
      authError = e instanceof Error && e.message === "authNotConfigured";
    }
  }
  return (
    <App config={config} authenticated={authenticated} authError={authError} />
  );
}
