import { test, expect } from "@playwright/test";
test("demo supports graph, CRUD, relationships, language, theme, search, filters, undo and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await expect(
    page.getByRole("img", { name: "GraphLive", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-canvas")).toHaveAttribute(
    "data-layout",
    "ready",
  );
  await page.screenshot({ path: "docs/screenshots/network.png" });
  await page
    .getByRole("button", { name: "Añadir persona", exact: true })
    .last()
    .click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Test Ada");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(28);
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Test Ada/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar personas, intereses o etiquetas…" })
    .fill("test ada");
  await page
    .getByRole("button", { name: /Test Ada/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Test Ada" })).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Ada Edited");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ada Edited" })).toBeVisible();
  await page
    .getByRole("button", { name: "Añadir conexión", exact: true })
    .click();
  await page
    .getByLabel("Persona conectada")
    .selectOption({ label: "Emily · " });
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".connection-list")).toContainText("Emily");
  await page
    .getByRole("combobox", { name: "Tema", exact: true })
    .selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Idioma", exact: true })
    .selectOption("en");
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search people, interests or tags…" })
    .fill("");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Minimum connections").fill("9999");
  await expect(page.getByText("0 visible", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("GraphLive.json");
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  expect(errors).toEqual([]);
});
test("server onboarding persists and reopens existing data", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner E2E");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const existing = page.getByRole("button", {
    name: "Abrir red existente",
    exact: true,
  });
  await expect(
    existing
      .or(page.getByRole("dialog", { name: "Tu red empieza contigo" }))
      .or(page.getByRole("img", { name: "GraphLive", exact: true })),
  ).toBeVisible();
  if (await existing.isVisible()) await existing.click();
  await expect(page).toHaveURL(/\/graph$/);
  const introduction = page.getByRole("dialog", {
    name: "Tu red empieza contigo",
  });
  if (await introduction.isVisible()) {
    await introduction
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await introduction
      .getByRole("button", { name: "Guardar mi perfil" })
      .click();
    await expect(page.locator(".guide-callout")).toBeVisible();
    await page.getByRole("button", { name: "Omitir por ahora" }).click();
    await expect(page.locator(".guide-callout")).toHaveCount(0);
  }
  await expect(
    page.getByRole("img", { name: "GraphLive", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByText(/Red encontrada:/)).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "GraphLive", exact: true }),
  ).toBeVisible();
});
test("mobile demo has usable controls and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await page
    .getByRole("button", { name: "Añadir persona", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Cerrar", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", {
      name: "Buscar personas, intereses o etiquetas…",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Buscar personas, intereses o etiquetas…",
    }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
});

test("API rejects cross-origin, malformed and stale writes and restores backups", async ({
  request,
}) => {
  const original = await (await request.get("/api/network")).json();
  const headers = { origin: "http://localhost:3100" };
  expect(
    (
      await request.put("/api/network", {
        headers: { origin: "https://untrusted.invalid" },
        data: { value: original, expectedRevision: original.revision },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.put("/api/network", {
        headers,
        data: {
          value: {
            ...original,
            people: [...original.people, original.people[0]],
          },
          expectedRevision: original.revision,
        },
      })
    ).status(),
  ).toBe(400);
  const backup = await (
    await request.post("/api/network/backups", { headers })
  ).json();
  const value = structuredClone(original);
  value.people[0].profile.nickname = "Remote E2E";
  const saved = await request.put("/api/network", {
    headers,
    data: { value, expectedRevision: original.revision },
  });
  expect(saved.ok()).toBe(true);
  const updated = await saved.json();
  expect(
    (
      await request.put("/api/network", {
        headers,
        data: { value: original, expectedRevision: original.revision },
      })
    ).status(),
  ).toBe(409);
  const prior = await (
    await request.get(
      "/api/network/backups?id=" + encodeURIComponent(backup.id),
    )
  ).json();
  expect(prior).toEqual(original);
  expect(
    (
      await request.put("/api/network", {
        headers,
        data: { value: prior, expectedRevision: updated.revision },
      })
    ).ok(),
  ).toBe(true);
});

test("import preview replaces only demo data and server backups are available", async ({
  page,
  request,
}) => {
  const snapshot = await (await request.get("/api/network")).json();
  snapshot.people[0].profile.nickname = "Imported test";
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByLabel("Importar copia", { exact: true }).setInputFiles({
    name: "GraphLive.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(snapshot)),
  });
  await expect(
    page.getByRole("heading", { name: "Revisar copia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Crear backup y restaurar" }).click();
  await expect(page.locator(".people-list .person-row")).toHaveCount(1);
  const exported = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.getByRole("button", { name: "Exportar ZIP completo" }).click();
  expect((await exported).suggestedFilename()).toBe("GraphLiveFiles.zip");
  const unchanged = await (await request.get("/api/network")).json();
  expect(unchanged.people[0].profile.nickname).not.toBe("Imported test");
});
