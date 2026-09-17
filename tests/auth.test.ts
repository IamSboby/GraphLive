import { afterEach, it, expect, vi } from "vitest";
const fixture = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: fixture.session }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  fixture.session.mockReset();
});
it("uses an explicit shared instance when authentication is disabled", async () => {
  vi.stubEnv("AUTH_ENABLED", "false");
  const { identity } = await import("../packages/auth/server");
  expect(await identity()).toBe("local-instance");
  expect(fixture.session).not.toHaveBeenCalled();
});
it("fails closed if authentication is enabled but not configured", async () => {
  vi.stubEnv("AUTH_ENABLED", "true");
  vi.stubEnv("NEXTAUTH_SECRET", "");
  const { identity } = await import("../packages/auth/server");
  await expect(identity()).rejects.toThrow("authNotConfigured");
});
it("requires a session and isolates the authenticated identity", async () => {
  vi.stubEnv("AUTH_ENABLED", "true");
  vi.stubEnv("NEXTAUTH_SECRET", "test-fixture-only-not-a-production-secret");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
  const { identity } = await import("../packages/auth/server");
  fixture.session.mockResolvedValue(null);
  await expect(identity()).rejects.toThrow("unauthorized");
  fixture.session.mockResolvedValue({ user: { name: "fixture-workspace" } });
  expect(await identity()).toBe("fixture-workspace");
});
