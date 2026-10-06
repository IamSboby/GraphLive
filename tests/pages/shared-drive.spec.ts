import { test, expect } from "@playwright/test";
import type { snapshotSchema } from "../../packages/domain/model";
import type { z } from "zod";
type StoredSnapshot = z.input<typeof snapshotSchema>;

test("Drive invitations and Picker open the canonical shared network with reader permissions", async ({
  page,
}) => {
  const ownerId = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    now = new Date().toISOString();
  const original = {
    schemaVersion: 1,
    revision: 1,
    ownerId,
    deviceId,
    people: [
      {
        schemaVersion: 1,
        id: ownerId,
        storageId: "U1",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        createdByDeviceId: deviceId,
        updatedByDeviceId: deviceId,
        profile: { nickname: "Alex" },
        display: { manualPosition: null, positionLocked: false, hidden: false },
        customFields: {},
      },
    ],
    connections: [],
    counters: { M: 0, F: 0, L: 0, U: 1 },
    tombstones: [],
    preferences: {
      networkName: "Friends",
      introduction: "done",
      autoBackup: false,
    },
  } satisfies StoredSnapshot;
  type File = {
    id: string;
    title: string;
    etag: string;
    data: StoredSnapshot;
    properties?: { key: string; value: string; visibility: string }[];
    shared?: boolean;
  };
  const files = new Map<string, File>([
    [
      "original",
      {
        id: "original",
        title: "graphlive-network.json",
        etag: "v1",
        data: original,
      },
    ],
  ]);
  let reader = false;
  const invitations: unknown[] = [];
  const removals: string[] = [];
  let invited = false;
  let revoked = false;
  const writes: string[] = [];
  await page.addInitScript(() => {
    class View {
      setMimeTypes() {
        return this;
      }
    }
    class Builder {
      callback: (v: unknown) => void = () => {};
      addView() {
        return this;
      }
      setOAuthToken() {
        return this;
      }
      setDeveloperKey() {
        return this;
      }
      setAppId() {
        return this;
      }
      setOrigin() {
        return this;
      }
      setCallback(fn: (v: unknown) => void) {
        this.callback = fn;
        return this;
      }
      build() {
        return {
          setVisible: () =>
            this.callback({ action: "picked", docs: [{ id: "shared-file" }] }),
          dispose: () => {},
        };
      }
    }
    Object.assign(window, {
      google: {
        picker: { DocsView: View, PickerBuilder: Builder },
        accounts: {
          oauth2: {
            initTokenClient: (options: {
              scope: string;
              callback: (v: unknown) => void;
            }) => ({
              requestAccessToken: () =>
                options.callback({
                  access_token: "test",
                  expires_in: 3600,
                  scope: options.scope,
                }),
            }),
          },
        },
      },
    });
  });
  await page.route("https://www.googleapis.com/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      id = url.pathname.split("/").at(-1)!;
    if (id === "about")
      return route.fulfill({
        json: { user: { permissionId: reader ? "reader" : "owner" } },
      });
    if (req.method() === "DELETE" && url.pathname.includes("/permissions/")) {
      removals.push(id);
      invited = false;
      return route.fulfill({ status: 204, body: "" });
    }
    if (req.method() === "GET" && id === "permissions") {
      return route.fulfill({
        json: {
          items: [
            {
              id: "owner",
              type: "user",
              role: "owner",
              name: "Alex Owner",
              emailAddress: "owner@example.com",
            },
            ...(invited
              ? [
                  {
                    id: "permission",
                    type: "user",
                    role: "reader",
                    name: "Morgan Friend",
                    emailAddress: "friend@example.com",
                  },
                ]
              : []),
          ],
        },
      });
    }
    if (req.method() === "POST" && id === "permissions") {
      invited = true;
      invitations.push(req.postDataJSON());
      return route.fulfill({ json: { id: "permission" } });
    }
    if (
      req.method() === "POST" &&
      url.hostname === "www.googleapis.com" &&
      url.pathname.startsWith("/upload/")
    ) {
      const parts = req.postData()!.split("\r\n\r\n");
      const meta = JSON.parse(parts[1].split("\r\n--")[0]);
      const data = JSON.parse(parts[2].split("\r\n--")[0]);
      files.set("shared-file", {
        ...meta,
        id: "shared-file",
        etag: "v1",
        data,
        shared: true,
      });
      return route.fulfill({ json: { id: "shared-file", etag: "v1" } });
    }
    if (req.method() === "POST")
      return route.fulfill({ json: { id: "folder" } });
    if (req.method() === "PATCH") {
      Object.assign(files.get(id)!, req.postDataJSON());
      return route.fulfill({ json: { id } });
    }
    if (id === "files")
      return route.fulfill({
        json: {
          items: [...files.values()]
            .filter((f) =>
              url.searchParams.get("spaces") === "drive"
                ? f.shared
                : !reader && !f.shared,
            )
            .map((f) => ({
              id: f.id,
              title: f.title,
              etag: f.etag,
              properties: f.properties,
            })),
        },
      });
    if (reader && revoked && id === "shared-file")
      return route.fulfill({ status: 404, json: {} });
    const file = files.get(id)!;
    if (req.method() === "PUT") {
      writes.push(id);
      file.data = req.postDataJSON();
      file.etag = "v" + file.data.revision;
      return route.fulfill({ json: { id, etag: file.etag } });
    }
    return route.fulfill({
      json:
        url.searchParams.get("alt") === "media"
          ? file.data
          : { ...file, capabilities: { canEdit: !reader, canShare: !reader } },
    });
  });
  async function login() {
    await page.goto("./login/");
    await page
      .getByRole("radio", { name: "Google Drive", exact: true })
      .check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
  }
  await login();
  await page
    .getByRole("button", { name: "Compartir red", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Cuenta de Google del destinatario" })
    .fill("friend@example.com");
  await page
    .getByRole("button", { name: "Enviar invitación", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Invitación enviada por Google Drive.", { exact: true }),
  ).toBeVisible();
  expect(invitations).toEqual([
    { type: "user", role: "reader", value: "friend@example.com" },
  ]);
  await expect(page.locator(".network-card")).toHaveCount(1);
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Morgan Friend", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("friend@example.com", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: "Revocar acceso de Alex Owner",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../work/sharing-access-mobile.png",
    fullPage: true,
  });
  await dialog
    .getByRole("button", {
      name: "Revocar acceso de Morgan Friend",
      exact: true,
    })
    .click();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(removals).toEqual([]);
  await dialog
    .getByRole("button", {
      name: "Revocar acceso de Morgan Friend",
      exact: true,
    })
    .click();
  await dialog
    .getByRole("button", { name: "Revocar acceso", exact: true })
    .click();
  await expect(
    dialog.getByText("Acceso individual revocado.", { exact: true }),
  ).toBeVisible();
  expect(removals).toEqual(["permission"]);
  await expect(dialog.getByText("Morgan Friend", { exact: true })).toHaveCount(
    0,
  );
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  reader = true;
  await page.reload();
  await login();
  await page
    .getByRole("button", { name: "Abrir red compartida", exact: true })
    .click();
  await expect(page.locator(".network-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Renombrar", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "../../work/shared-network-reader.png",
    fullPage: true,
  });
  await page.getByTestId("open-network").click();
  await expect(page.locator(".sync-state")).toContainText("Solo lectura");
  await expect(page.locator(".add-fab")).toBeDisabled();
  expect(writes).toEqual([]);
  const shared = files.get("shared-file")!;
  shared.data = structuredClone(shared.data);
  shared.data.preferences.networkName = "Friends Updated";
  shared.data.revision++;
  shared.etag = "remote-update";
  await expect(page.locator("body")).toContainText("Friends Updated", {
    timeout: 10000,
  });
  revoked = true;
  await expect(page.locator("body")).toContainText(
    "Ya no puedes acceder a esta red",
    { timeout: 10000 },
  );
  expect(writes).toEqual([]);
});
