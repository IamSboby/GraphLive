import { test, expect } from "@playwright/test";
import type { Core } from "cytoscape";
test("married relationship, social profiles, year visibility and collapsing legend", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await page.locator(".add-fab").click();
  const form = page.getByRole("dialog");
  await form
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Release Alex");
  await form
    .getByRole("spinbutton", { name: "Año de nacimiento", exact: true })
    .fill("2001");
  await form
    .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
    .check();
  await form
    .getByRole("combobox", { name: "Relación contigo" })
    .selectOption("married");
  await form
    .getByRole("button", { name: "Añadir red social", exact: true })
    .click();
  await form
    .getByRole("textbox", { name: "Usuario o URL del perfil", exact: true })
    .fill("@alex");
  await form.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".social-links a")).toHaveAttribute(
    "href",
    "https://www.instagram.com/alex",
  );
  await expect(page.locator(".social-links a")).toHaveAccessibleName(
    "Instagram",
  );
  await expect(page.locator(".social-links a svg")).toBeVisible();
  await expect(page.locator(".social-links a")).toHaveText("");
  const graph = page.locator(".graph-canvas");
  const sparklePixels = () =>
    page.locator(".marriage-effects").evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
  await graph.evaluate((el) => {
    const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    const edge = c.edges("[?married]")[0];
    edge.source().position({ x: 0, y: 0 });
    edge.target().position({ x: 150, y: 0 });
    c.zoom(1);
    c.pan({ x: c.width() / 2 - 75, y: c.height() / 2 });
  });
  await expect.poll(sparklePixels).toBe(true);
  await graph.evaluate((el) => {
    (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy.zoom(0.3);
  });
  await expect.poll(sparklePixels).toBe(false);
  await graph.evaluate((el) => {
    (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy.zoom(0.8);
  });
  await expect.poll(sparklePixels).toBe(true);
  await expect(page.locator(".relation-badge")).toContainText("Casados");
  await expect(page.locator(".relation-badge")).toHaveCSS(
    "border-color",
    "rgb(225, 29, 72)",
  );
  const labels = () =>
    page
      .locator(".graph-canvas")
      .evaluate((el) =>
        (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy
          .nodes()
          .map((n) => String(n.data("label"))),
      );
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  const settings = page.getByRole("dialog");
  await settings
    .getByRole("checkbox", {
      name: "Ocultar años no definidos (N/A)",
      exact: true,
    })
    .check();
  await expect
    .poll(async () => (await labels()).some((s) => s.includes("N/A")))
    .toBe(false);
  await expect
    .poll(async () => (await labels()).some((s) => s.includes("2001")))
    .toBe(true);
  await settings
    .getByRole("checkbox", { name: "Ocultar todos los años", exact: true })
    .check();
  await expect
    .poll(async () => (await labels()).some((s) => s.includes("2001")))
    .toBe(false);
  await settings.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Leyenda", exact: true }).click();
  await expect(page.locator(".legend")).toContainText(
    "percepción de cada lado",
  );
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.locator(".legend")).toHaveAttribute("data-open", "false");
  await expect(page.locator(".legend")).toHaveCSS("visibility", "hidden");
});
test("dashboard opening reveals the network only once per session", async ({
  page,
}) => {
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("new-network").click();
  await page.getByTestId("create-network").click();
  await page.getByRole("button", { name: "Omitir por ahora" }).click();
  const positions = () =>
    page
      .locator(".graph-canvas")
      .evaluate((el) =>
        (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy
          .nodes()
          .map((n) => ({ id: n.id(), ...n.position() })),
      );
  for (const nickname of ["Alice", "Bob"]) {
    await page.locator(".add-fab").click();
    const form = page.getByRole("dialog");
    await form
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill(nickname);
    await form
      .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
      .check();
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
  }
  const saved = await positions();
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await page.getByTestId("open-network").click();
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-entry",
    "animating",
  );
  await expect
    .poll(async () =>
      (await positions()).some(
        (n, i) => Math.hypot(n.x - saved[i].x, n.y - saved[i].y) > 5,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.locator(".graph-canvas").evaluate((el) => {
        const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
        return (
          new Set(
            c.nodes().map((n) => Math.round(Number(n.style("opacity")) * 10)),
          ).size > 1
        );
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.locator(".graph-canvas").evaluate((el) => {
        const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
        return c
          .edges()
          .some(
            (e) =>
              e.style("line-style") === "dashed" &&
              parseFloat(e.style("line-dash-pattern")) > 0.1,
          );
      }),
    )
    .toBe(true);
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-entry",
    "ready",
  );
  expect(await positions()).toEqual(saved);
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await page.getByTestId("open-network").click();
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-layout",
    "ready",
  );
  await expect(page.locator(".graph-canvas")).not.toHaveAttribute(
    "data-entry",
    "animating",
  );
  expect(await positions()).toEqual(saved);
});
