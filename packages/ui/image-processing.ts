export async function prepareImage(file: File, kind: "portrait" | "banner") {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("imageInvalid");
  if (file.size > 10 * 1024 * 1024) throw new Error("imageTooLarge");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("imageInvalid");
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error("imageTooLarge");
    const canvas = document.createElement("canvas");
    canvas.width = kind === "portrait" ? 256 : 960;
    canvas.height = kind === "portrait" ? 256 : 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("imageInvalid");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(
      canvas.width / bitmap.width,
      canvas.height / bitmap.height,
    );
    ctx.drawImage(
      bitmap,
      (canvas.width - bitmap.width * scale) / 2,
      (canvas.height - bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    const limit = kind === "portrait" ? 120000 : 300000;
    for (const quality of [0.85, 0.7, 0.5, 0.3]) {
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= limit) return result;
    }
    throw new Error("imageTooLarge");
  } finally {
    bitmap.close();
  }
}
