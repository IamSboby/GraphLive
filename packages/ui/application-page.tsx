import { App } from "@/packages/ui/app";
import { configuration } from "@/packages/config";
import { identity } from "@/packages/auth/server";
export async function ApplicationPage({
  screen,
}: {
  screen: "home" | "login" | "graph" | "dashboard";
}) {
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
    <App
      screen={screen}
      config={config}
      authenticated={authenticated}
      authError={authError}
    />
  );
}
