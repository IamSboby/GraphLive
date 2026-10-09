import { test, expect } from "@playwright/test";
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
    const horizontal = crop.getByRole("slider", {
      name: "Posición horizontal",
    });
    await horizontal.fill("0");
    const pixel = () =>
      crop
        .locator("canvas")
        .evaluate((el) =>
          Array.from(
            (el as HTMLCanvasElement)
              .getContext("2d")!
              .getImageData(128, 128, 1, 1).data,
          ),
        );
    await expect.poll(pixel).toEqual([255, 0, 0, 255]);
    await crop.getByRole("slider", { name: "Ampliación" }).fill("2");
    await expect.poll(pixel).toEqual([255, 0, 0, 255]);
    await crop.getByRole("button", { name: "Centrar", exact: true }).click();
    await expect.poll(pixel).toEqual([0, 255, 0, 255]);
    const canvas = crop.locator("canvas");
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
    await expect.poll(pixel).toEqual([255, 0, 0, 255]);
    await page.screenshot({
      path: `../../work/crop-${mobile ? "mobile" : "desktop"}.png`,
    });
    await crop
      .getByRole("button", { name: "Usar recorte", exact: true })
      .click();
    const preview = dialog.locator(".image-picker img");
    const original = await preview.getAttribute("src");
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
