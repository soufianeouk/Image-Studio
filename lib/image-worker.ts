import { processImage } from "./engine";
import type { Output } from "./model";

self.onmessage = async (
  event: MessageEvent<{ file: Blob; output: Output }>,
) => {
  try {
    self.postMessage({
      result: await processImage(event.data.file, event.data.output),
    });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Image processing failed.",
    });
  }
};
