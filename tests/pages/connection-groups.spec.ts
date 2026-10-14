import { test, expect } from "../spanish-fixture";

test("connection picker sorts people and connects an entire tag group in one undoable action", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  for (const name of ["Zara Batch", "Ana Batch", "Mario Batch"]) {
    await page.locator(".add-fab").click();
    const form = page.getByRole("dialog");
    await form
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill(name);
    await form
      .getByRole("combobox", { name: "Etiquetas", exact: true })
      .fill("Équipo Batch");
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
  }
  await page.locator(".connections-header button").click();
  const form = page.getByRole("dialog");
  const picker = form.locator("select").first();
  const labels = await picker.locator("option").allTextContents();
  const names = labels.slice(1).filter((s) => !s.startsWith("["));
  expect(names).toEqual(
    [...names].sort(
      new Intl.Collator("es", { sensitivity: "base", numeric: true }).compare,
    ),
  );
  expect(labels.at(-1)).toContain("[");
  await picker.selectOption("tag:equipo batch");
  await expect(form.locator('p[role="status"]')).toContainText("2 conexiones");
  await expect(form.locator('p[role="status"]')).toContainText(
    "Ana Batch, Zara Batch",
  );
  await form.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".connection-list .connection-row")).toHaveCount(2);
  await page.locator(".connections-header button").click();
  await expect(form.locator('option[value="tag:equipo batch"]')).toHaveCount(0);
  await form.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".connection-list .connection-row")).toHaveCount(0);
});
