import { test, expect } from "@playwright/test";

for (const mobile of [false, true])
  test(`animated introduction saves profile before inviting a contact (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("./login/");
    await page
      .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
      .fill("Alex");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Tu red empieza contigo" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Sobrenombre" }),
    ).toHaveValue("Alex");
    await expect(page.locator(".guide-callout")).toHaveCount(0);
    await expect(
      page.locator(".guide-step").or(page.locator(".guide-callout")),
    ).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `../../work/intro-${mobile ? "mobile" : "desktop"}-name.png`,
    });
    await dialog
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await dialog
      .getByRole("textbox", { name: "Nombre", exact: true })
      .fill("Alexandra");
    await dialog
      .getByRole("combobox", { name: "Género (opcional)", exact: true })
      .selectOption("nonBinary");
    await dialog
      .getByRole("combobox", { name: "Añadir nacionalidad" })
      .selectOption("GB");
    await page.screenshot({
      path: `../../work/intro-${mobile ? "mobile" : "desktop"}-about.png`,
    });
    await dialog.getByRole("button", { name: "Atrás", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await expect(
      dialog.getByRole("textbox", { name: "Nombre", exact: true }),
    ).toHaveValue("Alexandra");
    await dialog.getByRole("button", { name: "Guardar mi perfil" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".guide-glow")).toBeVisible();
    await page.screenshot({
      path: `../../work/intro-${mobile ? "mobile" : "desktop"}-invite.png`,
    });
    await page.locator(".guide-glow").click();
    await page
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill("Sam");
    await expect(
      page.getByRole("checkbox", {
        name: "Conozco directamente a esta persona",
      }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByText("La persona está guardada sin conexiones.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Explorar mi red" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("button", { name: "Abrir red existente", exact: true })
      .click();
    await expect(page.locator(".people-list .person-row")).toHaveCount(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await page.getByRole("button", { name: "Repetir introducción" }).click();
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await expect(
      dialog.getByRole("textbox", { name: "Nombre", exact: true }),
    ).toHaveValue("Alexandra");
    await expect(
      dialog.getByRole("combobox", { name: "Género (opcional)", exact: true }),
    ).toHaveValue("nonBinary");
    await dialog.getByRole("button", { name: "Omitir por ahora" }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

test("profile save failure stays in the questionnaire and retries; English and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("graphlive-language", "en");
    const put = IDBObjectStore.prototype.put;
    let failed = false;
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.name === "network" &&
        value?.preferences?.introduction === "invite" &&
        !failed
      ) {
        failed = true;
        throw new DOMException("Test write failure", "QuotaExceededError");
      }
      return put.call(this, value, key);
    };
  });
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Your name or nickname" })
    .fill("Jamie");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Your network starts with you",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continue", exact: true }).click();
  await dialog.getByRole("button", { name: "Save my profile" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(page.locator(".guide-callout")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save my profile" }).click();
  await expect(page.locator(".guide-glow")).toBeVisible();
  await expect(page.locator(".guide-glow")).toHaveCSS("animation-name", "none");
  await page.screenshot({ path: "../../work/intro-english-dark.png" });
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.locator(".guide-callout")).toHaveCount(0);
});
