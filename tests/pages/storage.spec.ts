import { test, expect } from "@playwright/test";
test("Pages persists a local network, reopens it and serves graph assets without APIs", async ({
  page,
}) => {
  const apiRequests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./login/");
  await expect(
    page.getByRole("radio", { name: "Servidor privado" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "En este navegador" }),
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Local Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/GraphLive\/graph\/$/);
  await page
    .getByRole("button", { name: "Añadir persona", exact: true })
    .last()
    .click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Local Friend");
  await page
    .getByRole("combobox", { name: "Añadir nacionalidad" })
    .selectOption("FR");
  await page
    .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
    .check();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".connection-list .connection-row")).toHaveCount(1);
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-layout",
    "ready",
  );
  const flag = page.locator('img[src="/GraphLive/flags/fr.svg"]').first();
  await expect(flag).toBeVisible();
  await expect
    .poll(() =>
      flag.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const r = indexedDB.open("graphlive-local", 1);
            r.onerror = () => reject(r.error);
            r.onsuccess = () => {
              const q = r.result
                .transaction("network")
                .objectStore("network")
                .get("snapshot");
              q.onsuccess = () => {
                resolve(q.result.people.length);
                r.result.close();
              };
            };
          }),
      ),
    )
    .toBe(2);
  await page.reload();
  await expect(page).toHaveURL(/\/login\/$/);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("GraphLive.json");
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
