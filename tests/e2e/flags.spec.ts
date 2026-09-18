import { test, expect } from "@playwright/test";
import type { Core, NodeSingular } from "cytoscape";

test("SVG flags retain all stripes through zoom changes and PNG export", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar una red ficticia" }).click();
  const graph = page.locator(".graph-canvas");
  await expect(graph).toHaveAttribute("data-layout", "ready");
  for (const zoom of [0.5, 1, 2, 3, 0.5, 3, 1.25]) {
    const region = await graph.evaluate((element, level) => {
      const cy = (element as HTMLElement & { _cyreg: { cy: Core } })._cyreg.cy;
      const node = cy
        .nodes()
        .filter(
          (n) =>
            n.data("flags").length === 1 &&
            n.data("flags")[0] === "/flags/fr.svg",
        )
        .first() as NodeSingular;
      cy.zoom(level);
      cy.center(node);
      const pos = node.renderedPosition();
      return {
        x: pos.x - 10 * level,
        y: pos.y + (node.height() / 2 + 49) * level,
        width: 20 * level,
        height: 15 * level,
      };
    }, zoom);
    await expect
      .poll(
        async () => {
          // Inspect the actual on-screen canvas, including its zoom texture cache.
          const png = (await graph.screenshot()).toString("base64");
          return page.evaluate(
            async ({ png, region }) => {
              const img = new Image();
              img.src = "data:image/png;base64," + png;
              await img.decode();
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d")!;
              ctx.drawImage(img, 0, 0);
              const stripes = [1 / 6, 1 / 2, 5 / 6].map((f) =>
                Array.from(
                  ctx.getImageData(
                    Math.floor(region.x + region.width * f),
                    Math.floor(region.y + region.height / 2),
                    1,
                    1,
                  ).data,
                ),
              );
              const [blue, white, red] = stripes;
              return (
                blue[0] < 60 &&
                blue[1] < 90 &&
                blue[2] > 90 &&
                white.slice(0, 3).every((c) => c > 220) &&
                red[0] > 180 &&
                red[1] < 100 &&
                red[2] < 120
              );
            },
            { png, region },
          );
        },
        {
          message: `France must retain blue, white and red at zoom ${zoom}`,
          timeout: 5000,
        },
      )
      .toBe(true);
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Captura PNG", exact: true }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe("GraphLive.png");
  expect(await exported.failure()).toBeNull();
});
