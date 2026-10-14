import { test, expect } from "../spanish-fixture";
import type { Core } from "cytoscape";
test("view transitions preserve viewport and animated layout can be undone and redone", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  const graph = page.locator(".graph-canvas");
  await expect(graph).toHaveAttribute("data-layout", "ready");
  const positions = () =>
    graph.evaluate((el) =>
      (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy
        .nodes()
        .map((n) => ({ id: n.id(), ...n.position() })),
    );
  const before = await positions();
  const viewport = await graph.evaluate((el) => {
    const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    c.zoom(0.7);
    c.pan({ x: 111, y: 222 });
    return { zoom: c.zoom(), pan: c.pan() };
  });
  const toggle = page.locator(".view-toggle");
  await toggle.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.locator(".table-wrap")).toBeVisible();
  await toggle.getByRole("button", { name: "Red", exact: true }).click();
  await expect(graph).toBeVisible();
  expect(
    await graph.evaluate((el) => {
      const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
      return { zoom: c.zoom(), pan: c.pan() };
    }),
  ).toEqual(viewport);
  await page
    .getByRole("button", { name: "Recalcular distribución", exact: true })
    .click();
  await expect(graph).toHaveAttribute("data-layout", "animating");
  await expect(graph).toHaveAttribute("data-layout", "ready");
  const after = await positions();
  expect(after).not.toEqual(before);
  await expect(
    page.getByRole("button", { name: "Pausar distribución" }),
  ).toHaveCount(0);
  const undo = page.getByRole("button", { name: "Deshacer", exact: true }),
    redo = page.getByRole("button", { name: "Rehacer", exact: true });
  await expect(undo).toHaveCount(1);
  await expect(redo).toHaveCount(1);
  await undo.click();
  await expect.poll(positions).toEqual(before);
  await redo.click();
  await expect.poll(positions).toEqual(after);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.locator('.network-view-layer[data-active="true"]'),
  ).toHaveCSS("transition-duration", "0s");
});
