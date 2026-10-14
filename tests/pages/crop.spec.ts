import { test, expect } from "../spanish-fixture";
for (const mobile of [false, true])
  test(`photo crop confirms, cancels and frames pixels (${mobile ? "mobile" : "desktop"})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await page
      .getByRole("button", { name: "Explorar una red ficticia" })
      .click();
    await page.locator(".add-fab").click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Sobrenombre", exact: true })
      .fill("Crop Test");
    const data = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 200;
      const ctx = c.getContext("2d")!;
      for (const [i, color] of ["#ff0000", "#00ff00", "#0000ff"].entries()) {
        ctx.fillStyle = color;
        ctx.fillRect(i * 200, 0, 200, 200);
      }
      return c.toDataURL("image/png").split(",")[1];
    });
    const file = {
      name: "stripes.png",
      mimeType: "image/png",
      buffer: Buffer.from(data, "base64"),
    };
    const upload = dialog.locator('.image-picker input[type="file"]');
    await upload.setInputFiles(file);
    const crop = dialog.getByRole("group", { name: "Recortar foto" });
    await expect(crop).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Guardar", exact: true }),
    ).toBeDisabled();
    await expect(crop.getByRole("slider")).toHaveCount(0);
    const frame = crop.locator(".crop-frame");
    const canvas = crop.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    const selected = (await frame.boundingBox())!;
    await page.mouse.move(
      selected.x + selected.width / 2,
      selected.y + selected.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(box.x + 1, selected.y + selected.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await expect
      .poll(async () => (await frame.boundingBox())!.x)
      .toBeCloseTo(box.x, 0);
    const handle = crop.locator(".crop-handle-se");
    const h = (await handle.boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      h.x + h.width / 2 - selected.width / 4,
      h.y + h.height / 2 - selected.height / 4,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await frame.boundingBox())!.width)
      .toBeLessThan(selected.width * 0.85);
    await page.screenshot({
      path: `../../work/crop-${mobile ? "mobile" : "desktop"}.png`,
    });
    await crop
      .getByRole("button", { name: "Usar recorte", exact: true })
      .click();
    const preview = dialog.locator(".image-picker img");
    const original = await preview.getAttribute("src");
    const pixel = await preview.evaluate(async (el) => {
      const img = el as HTMLImageElement;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return Array.from(ctx.getImageData(128, 128, 1, 1).data);
    });
    expect(pixel[0]).toBeGreaterThan(240);
    expect(pixel[1]).toBeLessThan(10);
    expect(pixel[2]).toBeLessThan(10);
    await expect(
      dialog.getByRole("button", { name: "Guardar", exact: true }),
    ).toBeEnabled();
    await upload.setInputFiles(file);
    await crop.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(preview).toHaveAttribute("src", original!);
    await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator(".person-avatar img")).toHaveAttribute(
      "src",
      original!,
    );
  });
