import { test, expect } from "../spanish-fixture";

test("new relationships, saving tags without Enter, normalized filtering and deleting with undo", async ({
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
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const [name, type, color] of [
    ["Close Friend", "closeFriends", "rgb(46, 204, 113)"],
    ["Partner", "partner", "rgb(240, 100, 115)"],
    ["Crush", "crush", "rgb(247, 168, 216)"],
  ]) {
    await page.locator(".add-fab").click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill(name);
    await dialog
      .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
      .check();
    await dialog
      .getByRole("combobox", { name: "Relación contigo" })
      .selectOption(type);
    if (type !== "crush")
      await dialog
        .getByRole("combobox", { name: "Intereses", exact: true })
        .fill(type === "closeFriends" ? "Escalada Lunar" : "escalada lunar");
    await dialog
      .getByRole("combobox", { name: "Etiquetas", exact: true })
      .fill(type === "closeFriends" ? "Ázul" : "Otro");
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator(".relation-badge")).toHaveCSS(
      "border-color",
      color,
    );
    await expect(page.locator(".details-panel .chips")).toContainText(
      type === "closeFriends"
        ? ["Escalada Lunar", "Ázul"]
        : type === "partner"
          ? ["escalada lunar", "Otro"]
          : ["Otro"],
    );
  }
  const search = page.getByRole("textbox", {
    name: "Buscar personas, intereses o etiquetas…",
  });
  await search.fill("AZUL escalada");
  await expect(page.locator(".people-list .person-row")).toHaveCount(1);
  await expect(page.locator(".people-list")).toContainText("Close Friend");
  await search.fill("ESCALADA");
  await expect(page.locator(".people-list .person-row")).toHaveCount(2);
  await search.fill("");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Intereses", exact: true })
    .selectOption("Escalada Lunar");
  await expect(page.locator(".sidebar-tools")).toContainText("2 visibles");
  await page
    .getByRole("combobox", { name: "Etiquetas", exact: true })
    .selectOption("Ázul");
  await expect(page.locator(".sidebar-tools")).toContainText("1 visibles");
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.locator(".person-row").filter({ hasText: "Close Friend" }).click();
  await page
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", { name: "Eliminar persona" });
  await expect(confirmation).toContainText("Close Friend");
  await confirmation.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await confirmation
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(3);
  await expect(page.locator(".network-summary")).toContainText("2 conexiones");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(4);
  await expect(page.locator(".network-summary")).toContainText("3 conexiones");
  await page.locator(".person-row").filter({ hasText: "Close Friend" }).click();
  await page
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await confirmation
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(3);
  await expect(page.locator(".network-summary")).toContainText("2 conexiones");
  await page.locator(".person-row").first().click();
  await expect(
    page.getByRole("button", { name: "Eliminar persona", exact: true }),
  ).toHaveCount(0);
});

test("mobile saves uncommitted tags, searches them and deletes a person", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await page.locator(".add-fab").click();
  const form = page.getByRole("dialog");
  await form
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Mobile Alex");
  await form
    .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
    .check();
  await form
    .getByRole("combobox", { name: "Relación contigo" })
    .selectOption("crush");
  await form
    .getByRole("combobox", { name: "Intereses", exact: true })
    .fill("Música Lunar");
  await form
    .getByRole("combobox", { name: "Etiquetas", exact: true })
    .fill("ÚnicoMóvil");
  await form.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".details-panel")).toContainText("ÚnicoMóvil");
  await expect(page.locator(".relation-badge")).toHaveCSS(
    "border-color",
    "rgb(247, 168, 216)",
  );
  await expect(page.locator(".details-panel")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "../../work/mobile-relationships.png" });
  await page.locator(".mobile-search").click();
  await page
    .getByRole("textbox", { name: "Buscar personas, intereses o etiquetas…" })
    .fill("unicomovil musica");
  await expect(page.locator(".people-list .person-row")).toHaveCount(1);
  await page.locator(".people-list .person-row").click();
  await page
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar persona", exact: true })
    .click();
  await expect(page.locator(".network-summary")).toContainText("28 personas");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".network-summary")).toContainText("29 personas");
});
