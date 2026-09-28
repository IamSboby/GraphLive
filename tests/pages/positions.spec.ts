import { test, expect } from "@playwright/test";
import type { Core } from "cytoscape";

test("positions survive adding people, explicit layout, dragging and reopening; connection search includes tags and interests", async ({
  page,
}) => {
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir por ahora" }).click();
  const canvas = page.locator(".graph-canvas");
  await expect(canvas).toHaveAttribute("data-layout", "ready");
  const positions = () =>
    canvas.evaluate((el) =>
      (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy
        .nodes()
        .map((n) => ({ id: n.id(), ...n.position() })),
    );
  for (const name of ["Alice", "Bob"]) {
    const before = await positions();
    await page.locator(".add-fab").click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill(name);
    await dialog
      .getByRole("combobox", { name: "Etiquetas", exact: true })
      .fill(name === "Bob" ? "Ázul" : "Otro");
    await dialog
      .getByRole("combobox", { name: "Intereses", exact: true })
      .fill(name === "Bob" ? "Escalada Lunar" : "Piano");
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    expect((await positions()).slice(0, before.length)).toEqual(before);
  }
  await page.locator(".person-row").filter({ hasText: "Alice" }).click();
  await page
    .getByRole("button", { name: "Añadir conexión", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  for (const query of ["AZUL", "escalada", "  AZUL lunar  ", "Bob"]) {
    await dialog
      .getByRole("textbox", {
        name: "Buscar personas, intereses o etiquetas…",
        exact: true,
      })
      .fill(query);
    await expect(
      dialog
        .getByRole("combobox", { name: "Persona conectada", exact: true })
        .locator("option"),
    ).toHaveCount(2);
    await expect(
      dialog.getByRole("combobox", { name: "Persona conectada", exact: true }),
    ).toContainText("Bob");
  }
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Recalcular distribución", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-layout", "ready");
  await canvas.evaluate((el) => {
    const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    const n = cy.nodes()[1];
    n.emit("grab");
    n.position({ x: 321, y: -123 });
    n.emit("dragfree");
  });
  const before = await positions();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-layout", "ready");
  expect(await positions()).toEqual(before);
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
});
