export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { log } = await import("./packages/security/logger");
    log("info", "app.start");
  }
}
