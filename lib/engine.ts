import * as v from "valibot";
import { geometry } from "./geometry";
import { outputSchema, type Output } from "./model";

export async function decode(
  file: Blob,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* Fall back to the browser image decoder. */
    }
  }
  if (typeof document === "undefined")
    throw new Error(
      "This image could not be decoded. Try PNG, JPEG, WebP, or browser-supported AVIF.",
    );
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function processImage(file: Blob, config: Output) {
  const o = v.parse(outputSchema, config);
  const image = await decode(file);
  let canvas: HTMLCanvasElement | OffscreenCanvas | undefined;
  try {
    const g = geometry(o, image.width, image.height);
    canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(g.width, g.height)
        : Object.assign(document.createElement("canvas"), {
            width: g.width,
            height: g.height,
          });
    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("Your browser could not create an image canvas.");
    if (o.backgroundColor !== "transparent" || o.format === "jpeg") {
      ctx.fillStyle =
        o.backgroundColor === "transparent" ? "#ffffff" : o.backgroundColor;
      ctx.fillRect(0, 0, g.width, g.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, g.dx, g.dy, g.dw, g.dh);
    const mime = `image/${o.format}`;
    let blob: Blob | null =
      typeof OffscreenCanvas !== "undefined" &&
      canvas instanceof OffscreenCanvas
        ? await canvas.convertToBlob({ type: mime, quality: o.quality / 100 })
        : await new Promise<Blob | null>((resolve) =>
            (canvas as HTMLCanvasElement).toBlob(
              resolve,
              mime,
              o.quality / 100,
            ),
          );
    if (blob?.type !== mime && o.format === "avif") {
      const codecPath = "/codecs/avif-encoder.js";
      const { encode } = await import(
        /* webpackIgnore: true */ /* turbopackIgnore: true */ codecPath
      );
      blob = new Blob(
        [await encode(ctx.getImageData(0, 0, g.width, g.height), o.quality)],
        { type: mime },
      );
    }
    if (!blob || blob.type !== mime)
      throw new Error(
        `${o.format.toUpperCase()} encoding is unavailable in this browser. Choose another format.`,
      );
    return { blob, width: g.width, height: g.height };
  } finally {
    if ("close" in image) image.close();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
