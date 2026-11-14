import * as v from "valibot";

const dimension = v.nullable(
  v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(16384)),
);
export const outputSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  enabled: v.boolean(),
  filenameTemplate: v.pipe(v.string(), v.minLength(1), v.maxLength(250)),
  width: dimension,
  height: dimension,
  keepAspectRatio: v.boolean(),
  allowUpscale: v.boolean(),
  resizeMode: v.picklist([
    "contain",
    "cover",
    "stretch",
    "fit-width",
    "fit-height",
  ]),
  format: v.picklist(["png", "jpeg", "webp", "avif"]),
  quality: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
  backgroundColor: v.union([
    v.literal("transparent"),
    v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i)),
  ]),
  cropPosition: v.picklist([
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]),
  stripMetadata: v.literal(true),
});
export type Output = v.InferOutput<typeof outputSchema>;
export const presetSchema = v.object({
  id: v.string(),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
  description: v.optional(v.pipe(v.string(), v.maxLength(500))),
  version: v.literal(1),
  outputs: v.pipe(v.array(outputSchema), v.minLength(1), v.maxLength(200)),
  createdAt: v.string(),
  updatedAt: v.string(),
});
export type Preset = v.InferOutput<typeof presetSchema>;
export type Source = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
};
export type Result = {
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  hash: string;
  sourceId: string;
  blob?: Blob;
  url?: string;
  width?: number;
  height?: number;
  filename?: string;
  error?: string;
};
export const uid = () => crypto.randomUUID();
export const makeOutput = (changes: Partial<Output> = {}): Output => ({
  id: uid(),
  name: "New output",
  enabled: true,
  filenameTemplate: "{originalName}-{outputName}.{ext}",
  width: 1200,
  height: 800,
  keepAspectRatio: false,
  allowUpscale: true,
  resizeMode: "cover",
  format: "webp",
  quality: 85,
  backgroundColor: "transparent",
  cropPosition: "center",
  stripMetadata: true,
  ...changes,
});
const template = (
  id: string,
  name: string,
  description: string,
  outputs: Partial<Output>[],
): Preset => ({
  id,
  name,
  description,
  version: 1,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  outputs: outputs.map((o, i) => makeOutput({ ...o, id: `${id}-${i}` })),
});
// Stable IDs make server and browser rendering deterministic.
export const builtins: Preset[] = [
  template(
    "website",
    "Website essentials",
    "A versatile starting point for your next website.",
    [
      { name: "Website hero", width: 1920, height: 1080, format: "webp" },
      {
        name: "Social share",
        width: 1200,
        height: 630,
        format: "jpeg",
        quality: 90,
        backgroundColor: "#ffffff",
      },
      { name: "Thumbnail", width: 400, height: 400, format: "png" },
    ],
  ),
  template(
    "social",
    "Social media",
    "Customizable sizes for posts, stories, and covers.",
    [
      { name: "Square post", width: 1080, height: 1080, format: "jpeg" },
      { name: "Portrait story", width: 1080, height: 1920, format: "jpeg" },
      { name: "Landscape cover", width: 1500, height: 500, format: "webp" },
    ],
  ),
  template(
    "icons",
    "App icons",
    "A small collection of crisp, transparent app icons.",
    [
      {
        name: "Favicon",
        width: 32,
        height: 32,
        format: "png",
        resizeMode: "contain",
      },
      {
        name: "Touch icon",
        width: 180,
        height: 180,
        format: "png",
        resizeMode: "contain",
      },
      {
        name: "App icon",
        width: 512,
        height: 512,
        format: "png",
        resizeMode: "contain",
      },
    ],
  ),
  template(
    "blog",
    "Blog thumbnails",
    "Flexible landscape and square editorial images.",
    [
      { name: "Article cover", width: 1600, height: 900 },
      { name: "Article thumbnail", width: 600, height: 400 },
    ],
  ),
  template(
    "wallpapers",
    "Wallpapers",
    "Desktop and mobile backgrounds, ready to customize.",
    [
      { name: "Desktop", width: 2560, height: 1440, format: "jpeg" },
      { name: "Mobile", width: 1170, height: 2532, format: "jpeg" },
    ],
  ),
];
export const hashOutput = (o: Output) => JSON.stringify(o);
export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1048576).toFixed(2)} MB`;
export const originalName = (name: string) => name.replace(/\.[^.]+$/, "");
export function sanitize(name: string) {
  const clean = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\.{2,}/g, "-")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 180);
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)
    ? `_${clean}`
    : clean || "image";
}
export function filename(
  o: Output,
  source: string,
  width: number,
  height: number,
  index: number,
) {
  const ext = o.format === "jpeg" ? "jpg" : o.format;
  const vars: Record<string, string> = {
    originalName: originalName(source),
    outputName: o.name.toLowerCase().replace(/\s+/g, "-"),
    width: String(width),
    height: String(height),
    format: o.format,
    ext,
    index: String(index + 1),
  };
  let name = o.filenameTemplate.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  name = sanitize(name).replace(/\.(png|jpe?g|webp|avif)$/i, "");
  return `${name}.${ext}`;
}
export function parsePresets(data: unknown): Preset[] {
  return v.parse(
    v.pipe(v.array(presetSchema), v.minLength(1)),
    Array.isArray(data) ? data : [data],
  );
}
