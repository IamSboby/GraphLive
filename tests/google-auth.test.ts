import { afterEach, expect, it, vi } from "vitest";
import { GoogleSession } from "../packages/storage-adapters/google-auth";
import { DriveRequestError } from "../packages/storage-adapters/google-auth";

it("preserves a safe Drive rejection reason without exposing the response or credentials", async () => {
  const fetch = mockGoogle();
  const session = new GoogleSession();
  await session.connect();
  fetch.mockResolvedValueOnce(
    Response.json(
      {
        error: {
          message: "private detail",
          errors: [{ reason: "appNotAuthorizedToFile" }],
        },
      },
      { status: 403 },
    ),
  );
  const error = await session
    .request("https://www.googleapis.com/drive/v2/files/example/permissions")
    .catch((e) => e);
  expect(error).toBeInstanceOf(DriveRequestError);
  expect(error.reason).toBe("appNotAuthorizedToFile");
  expect(error.message).toBe("drivePermission");
  expect(JSON.stringify(error)).not.toContain("private detail");
});
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
it("requires explicit file consent for sharing and exposes only a live Picker token", async () => {
  mockGoogle();
  const session = new GoogleSession();
  await expect(session.connect(true)).rejects.toThrow("drivePermission");
  mockGoogle(
    "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file",
  );
  await session.connect(true);
  expect(session.hasFileAccess).toBe(true);
  expect(session.pickerToken).toBe("temporary-token");
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 3600000);
  expect(() => session.pickerToken).toThrow("driveExpired");
});
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
