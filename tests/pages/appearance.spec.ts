import { test, expect } from "@playwright/test";
import type { Core } from "cytoscape";

test("appearance editor validates imports and persists portable colors and themes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Alex");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir por ahora" }).click();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByText("Personalizar colores y temas", { exact: true }).click();
  const editor = page.locator(".appearance-settings");
  await editor.locator('input[type="color"]').first().fill("#123456");
  await editor
    .getByRole("combobox", { name: "Estilo visual" })
    .selectOption("forest");
  await editor.getByLabel("Importar colores", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(editor.getByRole("alert")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await editor
    .getByRole("button", { name: "Exportar colores", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("relationship-colors.json");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);
  expect(JSON.parse(exported.toString()).colors.bestFriend).toBe("#123456");
  await editor.getByLabel("Importar colores", { exact: true }).setInputFiles({
    name: "colors.json",
    mimeType: "application/json",
    buffer: exported,
  });
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await editor.getByRole("button", { name: "Aplicar apariencia" }).click();
  await expect(
    editor.getByRole("button", { name: "Aplicar apariencia" }),
  ).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim(),
      ),
    )
    .toBe("#f3f8f5");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "../../work/appearance-mobile.png" });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.reload();
  // Reopening browser storage preserves the appearance with the network.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim(),
      ),
    )
    .toBe("#f3f8f5");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim(),
      ),
    )
    .toBe("#101b18");
  await page.setViewportSize({ width: 1280, height: 850 });
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-layout",
    "ready",
  );
  expect(
    await page.locator(".graph-canvas").evaluate((element) => {
      const cy = (element as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
      return cy.nodes("[?owner]").style("background-fill");
    }),
  ).toBe("linear-gradient");
  await page.screenshot({ path: "../../work/appearance-graph-dark.png" });
  expect(errors).toEqual([]);
});
