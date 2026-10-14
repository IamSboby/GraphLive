import { test, expect } from "@playwright/test";

test("new visitors see English, project links and a persistent Spanish alternative", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(/GraphLive.*Made by Sboby/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "GraphLive",
  );
  await expect(
    page.getByRole("link", { name: "Made by Sboby", exact: true }),
  ).toHaveAttribute("href", "https://github.com/IamSboby");
  await expect(
    page.getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveAttribute("href", "https://github.com/IamSboby/GraphLive");
  await page.getByRole("link", { name: "Privacy policy", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Privacy policy",
  );
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Política de privacidad",
  );
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page
    .getByRole("link", { name: "Back to GraphLive", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Language", exact: true }).click();
  await page.getByRole("option", { name: "Español", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("link", { name: "Acceder", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "../../work/home-credit-mobile.png",
    animations: "disabled",
  });
});

test("a new network inherits English for a first-time visitor", async ({
  page,
}) => {
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Your name or nickname", exact: true })
    .fill("Alex");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByTestId("new-network").click();
  await page.getByTestId("create-network").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("dialog")).toContainText(
    "Your network starts with you",
  );
});
