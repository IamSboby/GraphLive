import { test, expect } from "../spanish-fixture";

test("legacy network and independent game identity survive switching and reopening", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  const id = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    now = new Date().toISOString();
  const legacy = {
    schemaVersion: 1,
    revision: 1,
    ownerId: id,
    deviceId,
    people: [
      {
        schemaVersion: 1,
        id,
        storageId: "U1",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        createdByDeviceId: deviceId,
        updatedByDeviceId: deviceId,
        profile: { nickname: "Real Alex" },
        display: { manualPosition: null, positionLocked: false, hidden: false },
        customFields: {},
      },
    ],
    connections: [],
    counters: { M: 0, F: 0, L: 0, U: 1 },
    tombstones: [],
    preferences: {
      language: "es",
      introduction: "done",
      theme: "system",
      themePreset: "indigo",
      customThemes: {
        light: { accent: "#762fba" },
        dark: { accent: "#bc91ee" },
      },
    },
  };
  await page.goto("./login/");
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("graphlive-local", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("network");
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction("network", "readwrite");
        tx.objectStore("network").put(data, "snapshot");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, legacy);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/$/);
  await expect(page.locator(".network-card")).toHaveCount(1);
  await expect(page.locator(".network-card")).toContainText("Real Alex");
  await page.getByRole("button", { name: "Renombrar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre de la red", exact: true })
    .fill("Personal network");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".network-card h2")).toHaveText("Personal network");
  await page.getByTestId("new-network").click();
  await page
    .getByRole("textbox", { name: "Nombre de la red", exact: true })
    .fill("Elden Ring");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre", exact: true })
    .fill("Ranni");
  await page.getByTestId("create-network").click();
  await page
    .getByRole("button", { name: "Omitir por ahora", exact: true })
    .click();
  await expect(page.locator(".network-summary")).toContainText("1 personas");
  await page.locator(".add-fab").click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Blaidd");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  // Switch immediately, while the latest edit may still be in the save debounce.
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await expect(page.locator(".network-card")).toHaveCount(2);
  const original = page
    .locator(".network-card")
    .filter({ hasText: "Real Alex" });
  await original.getByTestId("open-network").click();
  await expect(page.locator(".network-summary")).toContainText("1 personas");
  await expect(page.locator(".people-list")).not.toContainText("Blaidd");
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await page
    .locator(".network-card")
    .filter({ hasText: "Elden Ring" })
    .getByTestId("open-network")
    .click();
  await expect(page.locator(".people-list")).toContainText("Blaidd");
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".network-card")).toHaveCount(2);
  await expect(
    page.locator(".network-card").filter({ hasText: "Elden Ring" }),
  ).toContainText("Ranni");
  await expect(
    page.locator(".network-card").filter({ hasText: "Real Alex" }),
  ).toContainText("Personal network");
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent"),
      ),
    )
    .toBe("#404045");
  await expect
    .poll(() =>
      original.evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--accent"),
      ),
    )
    .toBe("#762fba");
  const gameCard = page
    .locator(".network-card")
    .filter({ hasText: "Elden Ring" });
  await expect
    .poll(() =>
      gameCard.evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--accent"),
      ),
    )
    .toBe("#335eaa");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--accent"),
      ),
    )
    .toBe("#d4d4d8");
  await expect
    .poll(() =>
      original.evaluate((e) =>
        getComputedStyle(e).getPropertyValue("--accent"),
      ),
    )
    .toBe("#bc91ee");
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({
    path: "../../work/dashboard-desktop.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../../work/dashboard-mobile.png",
    animations: "disabled",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("textbox", { name: "Buscar redes…" }).fill("Ranni");
  await expect(page.locator(".network-card")).toHaveCount(1);
  await page.locator(".network-card").getByTestId("open-network").click();
  await expect(page.locator(".network-summary")).toContainText("2 personas");
  await expect(
    page.getByRole("button", { name: "Mis redes", exact: true }),
  ).toBeInViewport();
});
