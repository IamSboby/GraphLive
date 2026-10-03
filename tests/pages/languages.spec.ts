import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { languageNames, type Language } from "../../packages/i18n/languages";

for (const code of ["it", "de", "fr", "pt"] as Language[]) {
  test(`${code} translates onboarding and preserves the saved network language`, async ({
    page,
  }) => {
    const text = JSON.parse(
      readFileSync(
        new URL(`../../packages/i18n/locales/${code}.json`, import.meta.url),
        "utf8",
      ),
    ) as Record<string, string>;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./login/");
    await page.getByRole("combobox", { name: "Idioma", exact: true }).click();
    await page
      .getByRole("option", { name: languageNames[code], exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", code);
    await expect(
      page
        .getByRole("combobox", { name: text.language, exact: true })
        .locator(`svg[data-language="${code}"]`),
    ).toHaveCount(1);
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: text.language, exact: true }),
    ).toHaveAttribute("data-value", code);
    await page
      .getByRole("textbox", { name: text.ownerName, exact: true })
      .fill("Alex");
    await page
      .getByRole("button", { name: text.continue, exact: true })
      .click();
    await page.getByTestId("new-network").click();
    await page.getByTestId("create-network").click();
    await expect(
      page.getByRole("dialog", { name: text.guideTitle, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: text.guideSkip, exact: true })
      .click();
    await page
      .getByRole("button", { name: text.settings, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: text.data, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({ path: `../../work/language-${code}-settings.png` });
    await page.reload();
    await page
      .getByRole("button", { name: text.continue, exact: true })
      .click();
    await page
      .getByRole("button", { name: text.openExisting, exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: text.language, exact: true }),
    ).toHaveAttribute("data-value", code);
    await expect(page.locator("html")).toHaveAttribute("lang", code);
  });
}
