import { afterEach, expect, it, vi } from "vitest";
import { GoogleSession } from "../packages/storage-adapters/google-auth";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("times out when the browser never returns from the Google popup", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: () => ({ requestAccessToken: () => {} }),
        },
      },
    },
  });
  const connection = new GoogleSession().connect();
  const rejected = expect(connection).rejects.toThrow("driveCancelled");
  await vi.advanceTimersByTimeAsync(90000);
  await rejected;
});
function mockGoogle(scope = "https://www.googleapis.com/auth/drive.appdata") {
  vi.stubGlobal("window", {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            callback: (response: object) => void;
          }) => ({
            requestAccessToken: () =>
              options.callback({
                access_token: "temporary-token",
                expires_in: 3600,
                scope,
              }),
          }),
        },
      },
    },
  });
  const fetch = vi
    .fn()
    .mockResolvedValue(Response.json({ user: { permissionId: "first" } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
it("does not send a token when consent omitted the requested permission", async () => {
  const fetch = mockGoogle("openid");
  await expect(new GoogleSession().connect()).rejects.toThrow(
    "drivePermission",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects a different account during reconnection", async () => {
  const fetch = mockGoogle();
  const session = new GoogleSession();
  await session.connect();
  fetch.mockResolvedValueOnce(
    Response.json({ user: { permissionId: "second" } }),
  );
  await expect(session.connect()).rejects.toThrow("driveAccountChanged");
});
it("keeps expired sessions from sending requests and refuses unrelated destinations", async () => {
  const fetch = mockGoogle();
  const session = new GoogleSession();
  await session.connect();
  await expect(session.request("https://example.com/")).rejects.toThrow(
    "invalidPath",
  );
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3600000);
  await expect(
    session.request("https://www.googleapis.com/drive/v2/files"),
  ).rejects.toThrow("driveExpired");
  expect(fetch).toHaveBeenCalledTimes(1);
});
