import { test, expect } from "../spanish-fixture";
import type { Snapshot } from "../../packages/domain/model";

test("slow Drive saves leave editing enabled and durable changes recover after reload", async ({
  page,
}) => {
  let stored: Snapshot | undefined;
  let etag = '"v0"',
    blocked = false,
    writes = 0;
  let release: (() => void) | undefined;
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
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname.endsWith("/about")) {
      await route.fulfill({ json: { user: { permissionId: "slow-account" } } });
      return;
    }
    if (req.method() === "POST") {
      const chunks = req.postData()!.split("\r\n\r\n");
      const meta = JSON.parse(chunks[1].split("\r\n--")[0]);
      if (meta.title === "graphlive-network.json")
        stored = JSON.parse(chunks[2].split("\r\n--")[0]);
      await route.fulfill({
        json: { id: meta.title, title: meta.title, etag },
      });
      return;
    }
    if (req.method() === "PUT") {
      writes++;
      if (blocked) {
        await new Promise<void>((r) => {
          release = r;
        });
        await route.abort().catch(() => {});
        return;
      }
      if (req.headers()["if-match"] !== etag) {
        await route.fulfill({ status: 412 });
        return;
      }
      stored = req.postDataJSON();
      etag = '"v' + stored!.revision + '"';
      await route.fulfill({
        json: {
          id: "graphlive-network.json",
          title: "graphlive-network.json",
          etag,
        },
      });
      return;
    }
    if (url.pathname.endsWith("/files")) {
      await route.fulfill({
        json: {
          items: stored
            ? [
                {
                  id: "graphlive-network.json",
                  title: "graphlive-network.json",
                  etag,
                },
              ]
            : [],
        },
      });
      return;
    }
    await route.fulfill({
      json:
        url.searchParams.get("alt") === "media"
          ? stored
          : {
              id: "graphlive-network.json",
              title: "graphlive-network.json",
              etag,
            },
    });
  });
  await page.goto("./login/");
  await page.getByRole("radio", { name: "Google Drive", exact: true }).check();
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("new-network").click();
  await page.getByTestId("create-network").click();
  await page.getByRole("button", { name: "Omitir por ahora" }).click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  blocked = true;
  await page.locator(".add-fab").click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("First pending");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  const started = writes;
  await page.getByRole("combobox", { name: "Tema", exact: true }).click();
  await page.getByRole("option", { name: "Oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".add-fab").click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Second pending");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(3);
  await expect(page.locator(".sync-state")).toContainText(
    "Guardado en este dispositivo",
  );
  expect(writes).toBe(started);
  await page.reload();
  blocked = false;
  release!();
  await page.getByRole("radio", { name: "Google Drive", exact: true }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(3);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  expect(stored!.people.map((p) => p.profile.nickname)).toContain(
    "Second pending",
  );
  expect(stored!.preferences.theme).toBe("dark");
});
