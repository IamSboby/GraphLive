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
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await page.getByTestId("open-network").click();
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-entry",
    "animating",
  );
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-entry",
    "ready",
  );
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
});
