import { test, expect } from "@playwright/test";

test("home, login and graph have separate routes and the brand preserves the open network", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/home.png",
    animations: "disabled",
  });
  await expect(
    page.getByRole("textbox", { name: "Tu nombre o sobrenombre" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Acceder", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({
    path: "docs/screenshots/login.png",
    animations: "disabled",
  });
  await expect(
    page.getByRole("textbox", { name: "Tu nombre o sobrenombre" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "GraphLive", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.locator(".people-list .person-row")).toHaveCount(28);
  await page.getByRole("link", { name: "GraphLive", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByRole("link", { name: "Volver a mi red", exact: true })
    .click();
  await expect(page).toHaveURL(/\/graph$/);
  await expect(page.locator(".people-list .person-row")).toHaveCount(28);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".setup-card")).toHaveCSS("animation-name", "none");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
