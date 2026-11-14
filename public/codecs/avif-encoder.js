// AVIF encoding uses the Apache-2.0-licensed jSquash / Squoosh libavif codec.
import createEncoder from "./avif_enc.js";
let encoder;
export async function encode(image, quality) {
  encoder ??= createEncoder({ locateFile: name => `/codecs/${name}` });
  const module = await encoder;
  const bytes = module.encode(new Uint8Array(image.data.buffer), image.width, image.height, {
    quality, qualityAlpha: -1, denoiseLevel: 0, tileColsLog2: 0, tileRowsLog2: 0,
    speed: 8, subsample: 1, chromaDeltaQ: false, sharpness: 0, tune: 0,
    enableSharpYUV: false, bitDepth: 8, lossless: false,
  });
  if (!bytes) throw new Error("The AVIF encoder could not process this image.");
  return bytes.buffer;
}
