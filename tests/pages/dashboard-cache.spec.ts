import { test, expect } from "@playwright/test";
test("cached dashboard cards render in edit order while discovery and snapshots are unavailable", async ({
  page,
}) => {
  await page.goto("./login/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("graphlive-dashboard", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("index");
        r.result.createObjectStore("banners");
        r.result.createObjectStore("folders");
      };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("index", "readwrite");
        tx.objectStore("index").put(
          [
            {
              id: "default",
              identity: "Alex",
              preferences: { networkName: "Older world" },
              peopleCount: 3,
              connectionCount: 2,
              modifiedAt: "2026-10-10T12:00:00Z",
            },
            {
              id: "11111111-1111-4111-8111-111111111111",
              identity: "Ranni",
              preferences: { networkName: "Recent world" },
              peopleCount: 5,
              connectionCount: 4,
              modifiedAt: "2026-10-12T12:00:00Z",
            },
          ],
          "browser",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((name: string, version?: number) =>
      name.startsWith("graphlive-local") ||
      name.startsWith("graphlive-network-")
        ? ({} as IDBOpenDBRequest)
        : open(name, version)) as typeof indexedDB.open;
  });
  await page
    .getByRole("textbox", { name: "Tu nombre o sobrenombre" })
    .fill("Owner");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".network-card h2")).toHaveText(
    ["Recent world", "Older world"],
    { timeout: 3000 },
  );
  await expect(page.locator(".network-card").first()).toContainText("Ranni");
  await expect(page.getByTestId("open-network").first()).toBeEnabled();
});
