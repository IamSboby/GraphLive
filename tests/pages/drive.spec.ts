import { test, expect } from "@playwright/test";
import type { Snapshot } from "../../packages/domain/model";

test("Drive opens, saves and reopens a network through the browser adapter", async ({
  page,
}) => {
  const files = new Map<
    string,
    { title: string; data: Snapshot; etag: string }
  >();
  await page.addInitScript(() => {
    Object.assign(window, {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (options: {
              callback: (result: object) => void;
            }) => ({
              requestAccessToken: () =>
                options.callback({
                  access_token: "test-token",
                  expires_in: 3600,
                  scope: "https://www.googleapis.com/auth/drive.appdata",
                }),
            }),
          },
        },
      },
    });
  });
  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    expect(request.headers().authorization).toBe("Bearer test-token");
    if (url.pathname.endsWith("/about")) {
      await route.fulfill({ json: { user: { permissionId: "account-1" } } });
      return;
    }
    if (request.method() === "POST") {
      const chunks = request.postData()!.split("\r\n\r\n");
      const metadata = JSON.parse(chunks[1].split("\r\n--")[0]);
      const data = JSON.parse(chunks[2].split("\r\n--")[0]);
      const id = "file-" + files.size;
      files.set(id, { title: metadata.title, data, etag: '"v1"' });
      await route.fulfill({ json: { id } });
      return;
    }
    if (url.pathname.endsWith("/files")) {
      await route.fulfill({
        json: {
          items: [...files].map(([id, f]) => ({
            id,
            title: f.title,
            etag: f.etag,
          })),
        },
      });
      return;
    }
    const id = url.pathname.split("/").at(-1)!,
      file = files.get(id)!;
    if (request.method() === "PUT") {
      expect(request.headers()["if-match"]).toBe(file.etag);
      file.data = request.postDataJSON();
      file.etag = '"v' + file.data.revision + '"';
      await route.fulfill({ json: { id } });
      return;
    }
    await route.fulfill({
      json:
        url.searchParams.get("alt") === "media"
          ? file.data
          : { id, title: file.title, etag: file.etag },
    });
  });
  await page.goto("./login/");
  await page.getByRole("radio", { name: "Google Drive", exact: true }).check();
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Drive Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/graph\/$/);
  expect(
    [...files.values()].find((f) => f.title === "graphlive-network.json")?.data
      .people,
  ).toHaveLength(1);
  await page.reload();
  await expect(page).toHaveURL(/\/login\/$/);
  await page.getByRole("radio", { name: "Google Drive", exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(page).toHaveURL(/\/graph\/$/);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-token",
  );
});
