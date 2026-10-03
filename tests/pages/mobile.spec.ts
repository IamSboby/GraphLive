import { test, expect } from "@playwright/test";

test.describe("phone layout", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("full-width graph, accessible people panel and rotation", async ({
    page,
  }) => {
    await page.goto("./");
    await page
      .getByRole("button", { name: "Explorar una red ficticia" })
      .click();
    const search = page.locator(".mobile-search");
    await expect(search).toBeVisible();
    await expect(page.locator(".workspace-body > .sidebar")).toHaveCount(0);
    await expect(page.locator(".sync-state")).toBeVisible();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBe(width);
      const graph = await page.locator(".canvas-area").boundingBox();
      expect(graph!.width).toBe(width);
      for (const control of await page
        .locator(".graph-controls button, .topbar-actions button, .add-fab")
        .all()) {
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
    }
    await search.tap();
    const panel = page.getByRole("dialog", { name: "Personas", exact: true });
    await expect(panel).toBeVisible();
    await panel.getByRole("textbox").fill("Alex");
    await expect(panel.locator(".person-row").first()).toBeVisible();
    await panel.locator(".person-row").first().tap();
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".details-panel")).toBeVisible();
    await page
      .locator(".details-panel")
      .getByRole("button", { name: "Cerrar", exact: true })
      .tap();
    await search.tap();
    await panel.getByRole("textbox").fill("");
    await panel.getByRole("button", { name: "Cerrar", exact: true }).tap();
    await expect(panel).toHaveCount(0);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(search).toBeVisible();
    await expect(page.locator(".canvas-area")).toHaveCSS("width", "844px");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(844);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Centrar red", exact: true }).tap();
    await page.screenshot({ path: "../../work/phone-graph.png" });
    await search.tap();
    await panel.getByRole("textbox").fill("");
    await page.screenshot({ path: "../../work/phone-people.png" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".workspace-body > .sidebar")).toBeVisible();
  });

  test("login fits narrow screens with readable fields and full-screen forms", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("./login/");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(320);
    await expect(
      page.getByRole("button", { name: "Continuar", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox").first()).toHaveCSS(
      "font-size",
      "16px",
    );
    await page.screenshot({
      path: "../../work/phone-login.png",
      fullPage: true,
    });
    await page.goto("./");
    await page
      .getByRole("button", { name: "Explorar una red ficticia" })
      .click();
    await page.locator(".add-fab").tap();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCSS("width", "320px");
    await expect(dialog).toHaveCSS("height", "740px");
    await dialog
      .getByRole("button", { name: "Guardar", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      dialog.getByRole("button", { name: "Guardar", exact: true }),
    ).toBeInViewport();
  });
});
