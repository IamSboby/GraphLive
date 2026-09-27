import { test, expect } from "@playwright/test";

test("icon menus support keyboard, outside dismissal, mobile and reduced motion", async ({
  page,
}) => {
  await page.goto("./");
  const theme = page.getByRole("combobox", { name: "Tema", exact: true });
  await theme.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("listbox", { name: "Tema", exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.locator(".selector-symbol")).toHaveCount(3);
  await expect(
    page.getByRole("option", { name: "Sistema", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(theme).toHaveAttribute("data-value", "dark");
  await expect(theme).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.click();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(theme).toBeFocused();
  await theme.click();
  await page.getByRole("heading").first().click();
  await expect(menu).toHaveCount(0);
  const language = page.getByRole("combobox", { name: "Idioma", exact: true });
  await expect(language).toHaveText("");
  await expect(language.locator('svg[data-language="es"]')).toHaveCount(1);
  await language.click();
  await expect(
    page.getByRole("listbox").locator(".selector-symbol"),
  ).toHaveCount(6);
  await expect(
    page
      .getByRole("option", { name: "Español", exact: true })
      .locator(".language-flag"),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("option", { name: "English", exact: true })
      .locator(".language-flag"),
  ).toHaveCount(1);
  await page.screenshot({
    path: "../../work/language-flags-menu.png",
    animations: "disabled",
  });
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Language", exact: true }),
  ).toHaveAttribute("data-value", "en");
  await expect(
    page
      .getByRole("combobox", { name: "Language", exact: true })
      .locator('svg[data-language="en"]'),
  ).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("combobox", { name: "Theme", exact: true }).click();
  await expect(page.locator(".icon-select-menu")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".icon-select-menu")).toHaveCSS(
    "border-radius",
    "18px",
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({ path: "../../work/menus-mobile.png" });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
