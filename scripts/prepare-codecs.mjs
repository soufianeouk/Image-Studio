import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/codecs", { recursive: true });
for (const name of ["avif_enc.js", "avif_enc.wasm"])
  copyFileSync(
    `node_modules/@jsquash/avif/codec/enc/${name}`,
    `public/codecs/${name}`,
  );
copyFileSync(
  "node_modules/@jsquash/avif/LICENSE",
  "public/codecs/AVIF-LICENSE.txt",
);
