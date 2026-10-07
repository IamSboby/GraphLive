import type { Core } from "cytoscape";
import { test, expect } from "@playwright/test";
test("photos and banners survive saving, reopening and removal", async ({
  page,
}) => {
  const id = crypto.randomUUID(),
    deviceId = crypto.randomUUID(),
    now = new Date().toISOString();
  const data = {
    schemaVersion: 1,
    revision: 1,
    ownerId: id,
    deviceId,
    people: [
      {
        schemaVersion: 1,
        id,
        storageId: "U1",
        createdAt: now,
        updatedAt: now,
        revision: 1,
        createdByDeviceId: deviceId,
        updatedByDeviceId: deviceId,
        profile: { nickname: "Avery", nationalities: ["IT"] },
        display: {
          manualPosition: { x: 0, y: 0 },
          positionLocked: false,
          hidden: false,
        },
        customFields: {},
      },
    ],
    connections: [],
    counters: { M: 0, F: 0, L: 0, U: 1 },
    tombstones: [],
    preferences: { introduction: "done", networkName: "Photo network" },
  };
  await page.goto("./login/");
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("graphlive-local", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("network");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction("network", "readwrite");
        tx.objectStore("network").put(data, "snapshot");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, data);
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#178569";
    ctx.fillRect(0, 0, 600, 400);
    ctx.fillStyle = "#f3b632";
    ctx.beginPath();
    ctx.arc(300, 200, 100, 0, Math.PI * 2);
    ctx.fill();
    return c.toDataURL("image/png").split(",")[1];
  });
  const file = {
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  };
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("open-network").click();
  await page.locator(".people-list button").first().click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.locator(".image-picker input").setInputFiles(file);
  await expect(page.locator(".image-picker img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".person-avatar img")).toBeVisible();
  const layers = await page.locator(".graph-canvas").evaluate((el) => {
    const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    const node = cy.nodes().first();
    cy.zoom(1.5);
    cy.center();
    return {
      images: node.style("background-image"),
      clip: node.style("background-clip"),
      offset: node.style("background-offset-y"),
    };
  });
  expect(layers.images).toContain("data:image/jpeg;base64,");
  expect(layers.images).toContain("it.svg");
  expect(layers.clip).toContain("node");
  expect(layers.offset).toContain("64");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page.locator(".image-picker input").setInputFiles(file);
  await expect(page.locator(".image-picker img")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.screenshot({
    path: "../../work/person-photo-graph.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await expect(page.locator(".network-card-art img")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".network-card-art img")).toBeVisible();
  await page.screenshot({
    path: "../../work/network-banner-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByTestId("open-network").click();
  await expect(page.locator(".avatar-small img")).toBeVisible();
  await page.locator(".people-list button").first().click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("button", { name: "Quitar imagen", exact: true })
    .click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator(".person-avatar img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Quitar imagen", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.getByRole("button", { name: "Mis redes", exact: true }).click();
  await expect(page.locator(".network-card-art img")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".network-card-art img")).toHaveCount(0);
});
