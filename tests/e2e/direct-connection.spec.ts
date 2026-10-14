import { test, expect } from "../spanish-fixture";

test("owner connections require explicit opt-in and editing does not create one", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await expect(page).toHaveURL(/\/graph$/);
  for (const direct of [false, true]) {
    await page
      .getByRole("button", { name: "Añadir persona", exact: true })
      .last()
      .click();
    const checkbox = page.getByRole("checkbox", {
      name: "Conozco directamente a esta persona",
    });
    await expect(checkbox).not.toBeChecked();
    await expect(
      page.getByRole("combobox", { name: "Relación contigo" }),
    ).toHaveCount(0);
    await page
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill(direct ? "Direct contact" : "Indirect contact");
    if (direct) {
      await checkbox.check();
      await page
        .getByRole("combobox", { name: "Relación contigo" })
        .selectOption("colleague");
    }
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator(".connection-list .connection-row")).toHaveCount(
      direct ? 1 : 0,
    );
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(
      page.getByRole("combobox", { name: "Relación contigo" }),
    ).toHaveCount(direct ? 1 : 0);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator(".connection-list .connection-row")).toHaveCount(
      direct ? 1 : 0,
    );
  }
});
