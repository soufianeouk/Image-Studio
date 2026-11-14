import type { Output } from "./model";

export function geometry(o: Output, sw: number, sh: number) {
  let width = o.width ?? Math.round(((o.height ?? sh) * sw) / sh);
  let height = o.height ?? Math.round((width * sh) / sw);
  if (o.resizeMode === "fit-width") height = Math.round((width * sh) / sw);
  if (o.resizeMode === "fit-height") width = Math.round((height * sw) / sh);
  if (
    (o.resizeMode === "fit-width" || o.resizeMode === "fit-height") &&
    !o.allowUpscale
  ) {
    const scale = Math.min(1, sw / width, sh / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  width = Math.max(1, width);
  height = Math.max(1, height);
  if (width > 16384 || height > 16384 || width * height > 40000000)
    throw new Error(
      "Output is too large. Use at most 16,384 pixels per side and 40 megapixels.",
    );
  let dw = width,
    dh = height;
  if (o.resizeMode !== "stretch") {
    let scale =
      o.resizeMode === "cover"
        ? Math.max(width / sw, height / sh)
        : Math.min(width / sw, height / sh);
    if (!o.allowUpscale) scale = Math.min(1, scale);
    dw = sw * scale;
    dh = sh * scale;
  } else if (!o.allowUpscale) {
    dw = Math.min(sw, width);
    dh = Math.min(sh, height);
  }
  const x = o.cropPosition.includes("left")
    ? 0
    : o.cropPosition.includes("right")
      ? 1
      : 0.5;
  const y = o.cropPosition.includes("top")
    ? 0
    : o.cropPosition.includes("bottom")
      ? 1
      : 0.5;
  return { width, height, dw, dh, dx: (width - dw) * x, dy: (height - dh) * y };
}
