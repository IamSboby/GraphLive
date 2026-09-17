import { test, expect } from "@playwright/test";

test("English onboarding, automatic gender filenames and SVG flags", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Idioma", exact: true })
    .selectOption("en");
  await page.getByRole("button", { name: /Explore/ }).click();
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add person", exact: true })
    .last()
    .click();
  await page
    .getByRole("textbox", { name: "Nickname", exact: true })
    .fill("Alpha Test");
  const gender = page.getByRole("combobox", { name: "Gender (optional)" });
  const filename = page.getByRole("textbox", { name: /File convention/ });
  await expect(gender.locator("option")).toHaveCount(11);
  for (const [value, prefix] of [
    ["male", "M"],
    ["female", "F"],
    ["nonBinary", "L"],
    ["preferNotSay", "U"],
  ]) {
    await gender.selectOption(value);
    await expect(filename).toHaveValue(
      new RegExp("^" + prefix + "\\d+\\.json$"),
    );
  }
  await gender.selectOption("female");
  const initialFilename = await filename.inputValue();
  await page
    .getByRole("combobox", { name: "Add nationality" })
    .selectOption("ES");
  const flag = page.getByRole("img", { name: "Spain", exact: true });
  await expect(flag).toHaveAttribute("src", "/flags/es.svg");
  await expect
    .poll(() =>
      flag.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: "docs/screenshots/alpha-form-en.png" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await gender.selectOption("nonBinary");
  await expect(filename).toHaveValue(initialFilename);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Spain", exact: true }).last(),
  ).toBeVisible();
});
