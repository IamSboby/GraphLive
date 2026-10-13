import { test, expect } from "@playwright/test";
import type { Core } from "cytoscape";

test("PCW:400 typing countries requires confirmation; adaptive zoom stays anchored", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  const graph = page.locator(".graph-canvas");
  await expect(graph).toHaveAttribute("data-layout", "ready");
  await page
    .getByRole("button", { name: "Añadir persona", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  const country = dialog.getByRole("combobox", { name: "Añadir nacionalidad" });
  await country.pressSequentially("Italia");
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(0);
  await country.press("ArrowDown");
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(0);
  await country.press("Enter");
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(1);
  await country.pressSequentially("Francia");
  await country.press("Tab");
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(1);
  await country.click();
  await dialog
    .getByRole("option", { name: "Francia (FR)", exact: true })
    .click();
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(2);
  await country.fill("Alemania");
  await page.screenshot({ path: "../../work/country-picker.png" });
  await country.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".chips .flag-icon")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  const result = await graph.evaluate(async (el) => {
    const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    const rect = el.getBoundingClientRect(),
      anchor = { x: 180, y: 180 };
    const wait = () =>
      new Promise<void>((r) => requestAnimationFrame(() => r()));
    const reset = () => {
      cy.zoom(1);
      cy.pan({ x: 20, y: 30 });
    };
    const wheel = async (deltaY: number) => {
      el.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY,
          clientX: rect.left + anchor.x,
          clientY: rect.top + anchor.y,
          bubbles: true,
          cancelable: true,
        }),
      );
      await wait();
    };
    reset();
    const model = {
      x: (anchor.x - cy.pan().x) / cy.zoom(),
      y: (anchor.y - cy.pan().y) / cy.zoom(),
    };
    await wheel(-4);
    const small = cy.zoom();
    const anchorError =
      Math.abs(model.x * cy.zoom() + cy.pan().x - anchor.x) +
      Math.abs(model.y * cy.zoom() + cy.pan().y - anchor.y);
    reset();
    await wheel(-160);
    const large = cy.zoom();
    for (let i = 0; i < 20; i++) await wheel(-600);
    const max = cy.zoom();
    for (let i = 0; i < 25; i++) await wheel(600);
    return { small, large, anchorError, max, min: cy.zoom() };
  });
  expect(result.small).toBeGreaterThan(1);
  expect(result.small).toBeLessThan(1.03);
  expect(result.large).toBeGreaterThan(result.small + 0.2);
  expect(result.anchorError).toBeLessThan(0.01);
  expect(result.max).toBe(3);
  expect(result.min).toBe(0.08);
});
