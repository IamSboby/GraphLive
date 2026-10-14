import { test, expect } from "../spanish-fixture";
import type { Snapshot } from "../../packages/domain/model";
import type { Core } from "cytoscape";
test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
});
test("mobile pinch zooms the graph without zooming the page", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  const graph = page.locator(".graph-canvas");
  await expect(graph).toHaveAttribute("data-layout", "ready");
  await graph.evaluate((el) => {
    const c = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    c.zoom(0.6);
    c.pan({ x: 150, y: 240 });
  });
  const zoom = () =>
    graph.evaluate((el) =>
      (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy.zoom(),
    );
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 145, y: 380, id: 1 },
      { x: 245, y: 380, id: 2 },
    ],
  });
  for (let d = 10; d <= 60; d += 10)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 145 - d, y: 380, id: 1 },
        { x: 245 + d, y: 380, id: 2 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(zoom).toBeGreaterThan(0.8);
  const enlarged = await zoom();
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 85, y: 380, id: 1 },
      { x: 305, y: 380, id: 2 },
    ],
  });
  for (let d = 10; d <= 60; d += 10)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 85 + d, y: 380, id: 1 },
        { x: 305 - d, y: 380, id: 2 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(zoom).toBeLessThan(enlarged);
  expect(await page.evaluate(() => visualViewport?.scale)).toBe(1);
});
test("mobile introduction offers camera and new contacts save tag entries and relationship metrics", async ({
  page,
}) => {
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Alex");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("new-network").click();
  await page.getByTestId("create-network").click();
  const intro = page.getByRole("dialog", { name: "Tu red empieza contigo" });
  await intro.getByRole("button", { name: "Continuar", exact: true }).click();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#192586";
    ctx.fillRect(0, 0, 32, 32);
    return c.toDataURL("image/png").split(",")[1];
  });
  const [camera] = await Promise.all([
    page.waitForEvent("filechooser"),
    intro.getByRole("button", { name: "Hacer foto", exact: true }).click(),
  ]);
  await expect(intro.locator('input[type="file"]')).toHaveAttribute(
    "capture",
    "user",
  );
  await camera.setFiles({
    name: "camera.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(
    intro.getByRole("button", { name: "Guardar mi perfil" }),
  ).toBeDisabled();
  await intro
    .getByRole("button", { name: "Usar recorte", exact: true })
    .click();
  await intro.getByRole("button", { name: "Guardar mi perfil" }).click();
  await page.locator(".add-fab").click();
  const form = page.getByRole("dialog");
  await form
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Sam");
  for (const label of ["Intereses", "Etiquetas"]) {
    const input = form.getByRole("combobox", { name: label, exact: true });
    await expect(input).toHaveAttribute("enterkeyhint", "done");
    await input.fill("Música");
    await input.press("Enter");
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await input.fill("Deporte");
    await form
      .getByRole("button", { name: `Añadir ${label}`, exact: true })
      .click();
    await expect(input).toHaveValue("");
  }
  await form
    .getByRole("checkbox", { name: "Conozco directamente a esta persona" })
    .check();
  await form.getByRole("slider", { name: "Intensidad", exact: true }).fill("5");
  await form.getByRole("slider", { name: "Frecuencia", exact: true }).fill("1");
  await form.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Explorar mi red" }).click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  const dbName = await page.evaluate(
    async () =>
      (await indexedDB.databases()).find((db) =>
        db.name?.startsWith("graphlive-network-"),
      )?.name ?? "graphlive-local",
  );
  const saved = await page.evaluate(
    async (name) =>
      new Promise<Snapshot[]>((resolve, reject) => {
        const r = indexedDB.open(name, 1);
        r.onsuccess = () => {
          const db = r.result;
          const q = db.transaction("network").objectStore("network").getAll();
          q.onsuccess = () => {
            db.close();
            resolve(q.result);
          };
          q.onerror = () => reject(q.error);
        };
        r.onerror = () => reject(r.error);
      }),
    dbName,
  );
  const snapshot = saved.find((s) =>
    s?.people?.some((p) => p.profile.nickname === "Sam"),
  );
  expect(
    snapshot!.people.find((p) => p.id === snapshot!.ownerId)!.profile.portrait,
  ).toMatch(/^data:image\/jpeg/);
  expect(snapshot!.connections[0]).toMatchObject({
    intensity: 5,
    frequency: 1,
  });
  expect(
    snapshot!.people.find((p) => p.profile.nickname === "Sam")!.profile,
  ).toMatchObject({
    interests: ["Música", "Deporte"],
    tags: ["Música", "Deporte"],
  });
});
