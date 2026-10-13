import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
for (const zip of [false, true])
  test(`dashboard imports a new ${zip ? "ZIP" : "JSON"} network`, async ({
    page,
  }) => {
    await page.goto("./login/");
    await page
      .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
      .fill("Owner");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    const ownerId = crypto.randomUUID(),
      deviceId = crypto.randomUUID(),
      now = new Date().toISOString();
    const data = {
      schemaVersion: 1,
      revision: 0,
      ownerId,
      deviceId,
      people: [
        {
          schemaVersion: 1,
          id: ownerId,
          storageId: "U1",
          createdAt: now,
          updatedAt: now,
          revision: 1,
          createdByDeviceId: deviceId,
          updatedByDeviceId: deviceId,
          profile: { nickname: "Imported Alex" },
          display: {
            manualPosition: null,
            positionLocked: false,
            hidden: false,
          },
          customFields: {},
        },
      ],
      connections: [],
      counters: { M: 0, F: 0, L: 0, U: 1 },
      tombstones: [],
      preferences: { networkName: "Imported world", introduction: "done" },
    };
    const buffer = zip
      ? Buffer.from(
          zipSync({
            "GraphLiveFiles/sync/snapshot.json": strToU8(JSON.stringify(data)),
          }),
        )
      : Buffer.from(JSON.stringify(data));
    await page.locator('input[type="file"]').setInputFiles({
      name: zip ? "network.zip" : "network.json",
      mimeType: zip ? "application/zip" : "application/json",
      buffer,
    });
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("textbox")).toHaveValue("Imported world");
    await dialog
      .getByRole("button", { name: "Importar copia", exact: true })
      .click();
    await expect(page.locator(".network-card h2")).toHaveText("Imported world");
    await expect(page.locator(".network-card")).toContainText("Imported Alex");
  });
