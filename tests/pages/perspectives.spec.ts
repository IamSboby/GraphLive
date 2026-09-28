import { test, expect } from "@playwright/test";
import type { Core } from "cytoscape";
import type { Snapshot } from "../../packages/domain/model";

test("perceptions inherit the main relation, paint ordered gradients and migrate legacy files", async ({
  page,
}) => {
  await page.goto("./login/");
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Omitir por ahora" }).click();
  await page.locator(".add-fab").click();
  await page
    .getByRole("textbox", { name: "Sobrenombre", exact: true })
    .fill("Alex");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page
    .getByRole("button", { name: "Añadir conexión", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const source = dialog.getByRole("combobox", {
    name: "Percepción de origen",
    exact: true,
  });
  const target = dialog.getByRole("combobox", {
    name: "Percepción de destino",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Persona conectada", exact: true })
    .selectOption({ index: 1 });
  await dialog
    .getByRole("combobox", { name: "Relación", exact: true })
    .selectOption("partner");
  await expect(source).toHaveValue("partner");
  await expect(target).toHaveValue("partner");
  await expect(source.locator('option[value=""]')).toHaveCount(0);
  await source.selectOption("bestFriend");
  await dialog
    .getByRole("combobox", { name: "Relación", exact: true })
    .selectOption("crush");
  await expect(source).toHaveValue("bestFriend");
  await expect(target).toHaveValue("crush");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  const canvas = page.locator(".graph-canvas");
  const appearance = () =>
    canvas.evaluate((el) => {
      const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
      const e = cy.edges()[0];
      return {
        sourceColor: e.data("sourceColor"),
        targetColor: e.data("targetColor"),
        fill: e.style("line-fill"),
        stops: e.style("line-gradient-stop-colors"),
      };
    });
  await expect.poll(appearance).toMatchObject({
    sourceColor: "#ffbb00",
    targetColor: "#F7A8D8",
    fill: "linear-gradient",
  });
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  expect((await appearance()).stops).toContain("255,187,0");
  expect((await appearance()).stops).toContain("247,168,216");
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await canvas.evaluate((el) => {
    const cy = (el as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
    cy.nodes().positions((_, i) => ({ x: i * 500, y: 0 }));
    cy.nodes()[0].emit("dragfree");
    cy.fit(undefined, 110);
  });
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  await page.screenshot({ path: "../../work/perspective-gradient.png" });
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("graphlive-local", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("network", "readwrite"),
            store = tx.objectStore("network"),
            get = store.get("snapshot");
          get.onsuccess = () => {
            const s = get.result;
            s.connections[0].sourcePerspective = "no definido";
            s.connections[0].targetPerspective = null;
            store.put(s, "snapshot");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        r.onerror = () => reject(r.error);
      }),
  );
  await page.reload();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir red existente", exact: true })
    .click();
  await expect(page.locator(".sync-state")).toContainText(
    "Todos los cambios guardados",
  );
  const read = () =>
    page.evaluate(
      () =>
        new Promise<Snapshot>((resolve, reject) => {
          const r = indexedDB.open("graphlive-local", 1);
          r.onsuccess = () => {
            const db = r.result,
              tx = db.transaction("network"),
              q = tx.objectStore("network").get("snapshot");
            tx.oncomplete = () => {
              db.close();
              resolve(q.result);
            };
            tx.onerror = () => reject(tx.error);
          };
          r.onerror = () => reject(r.error);
        }),
    );
  await expect
    .poll(async () => (await read()).connections[0])
    .toMatchObject({ sourcePerspective: "crush", targetPerspective: "crush" });
  await expect
    .poll(appearance)
    .toMatchObject({ sourceColor: "#F7A8D8", targetColor: "#F7A8D8" });
});
