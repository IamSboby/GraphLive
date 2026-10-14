import { test, expect } from "../spanish-fixture";
import type { Core } from "cytoscape";
test("relationship borders survive selection and photo visibility persists without deleting images", async ({
  page,
}) => {
  await page.goto("./login/");
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#dd4455";
    ctx.fillRect(0, 0, 32, 32);
    const portrait = canvas.toDataURL("image/jpeg");
    const ownerId = crypto.randomUUID(),
      friendId = crypto.randomUUID(),
      deviceId = crypto.randomUUID(),
      now = new Date().toISOString();
    const person = (id: string, nickname: string, storageId: string) => ({
      schemaVersion: 1,
      id,
      storageId,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      createdByDeviceId: deviceId,
      updatedByDeviceId: deviceId,
      profile: { nickname, portrait, nationalities: ["IT"] },
      display: {
        manualPosition: { x: id === ownerId ? 0 : 120, y: 0 },
        positionLocked: false,
        hidden: false,
      },
      customFields: {},
    });
    const data = {
      schemaVersion: 1,
      revision: 1,
      ownerId,
      deviceId,
      people: [person(ownerId, "Alex", "U1"), person(friendId, "Sam", "U2")],
      connections: [
        {
          id: crypto.randomUUID(),
          sourceId: ownerId,
          targetId: friendId,
          canonicalKey: [ownerId, friendId].sort().join("::"),
          relationshipType: "crush",
          sourcePerspective: "crush",
          targetPerspective: "friend",
          revision: 1,
          createdAt: now,
          updatedAt: now,
          updatedByDeviceId: deviceId,
        },
      ],
      counters: { M: 0, F: 0, L: 0, U: 2 },
      tombstones: [],
      preferences: {
        language: "es",
        introduction: "done",
        relationshipColors: { crush: "#abcdef" },
      },
    };
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("graphlive-local", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("network");
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("network", "readwrite");
        tx.objectStore("network").put(data, "snapshot");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("open-network").click();
  const node = () =>
    page.locator(".graph-canvas").evaluate((el) => {
      const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
      const n = cy
        .nodes()
        .filter((n) => !n.data("owner"))
        .first();
      return {
        border: n.style("border-color"),
        width: n.style("border-width"),
        images: n.style("background-image"),
      };
    });
  await expect.poll(async () => (await node()).border).toBe("rgb(171,205,239)");
  await page.locator(".people-list button").filter({ hasText: "Sam" }).click();
  expect((await node()).border).toBe("rgb(171,205,239)");
  expect((await node()).images).toContain("data:image/jpeg");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Mostrar fotos en los círculos",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect
    .poll(async () => (await node()).images)
    .not.toContain("data:image/jpeg");
  expect((await node()).images).toContain("it.svg");
  await expect(page.locator(".avatar-small img")).toHaveCount(2);
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByTestId("open-network").click();
  await expect
    .poll(async () => (await node()).images)
    .not.toContain("data:image/jpeg");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Mostrar fotos en los círculos",
      exact: true,
    })
    .check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect
    .poll(async () => (await node()).images)
    .toContain("data:image/jpeg");
  await page.screenshot({
    path: "../../work/relationship-photo-border.png",
    fullPage: true,
    animations: "disabled",
  });
});
