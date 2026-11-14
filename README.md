# Image Studio

A responsive, private image conversion workspace built from [PRD.md](./PRD.md). One source image becomes independently configured outputs, with reusable local presets and individual or ZIP downloads.

## Getting started

```sh
bun install
bun dev
```

Open http://localhost:3000. Upload, drop, or paste an image, or choose **Try an example**. The selected preview generates automatically after settings settle. Use **Generate all** for every enabled output, then **Export ZIP**. Output checkboxes control inclusion in generation and ZIP exports.

Each output supports dimensions (including automatic dimensions), aspect locking, five resize modes, nine crop alignments, optional upscaling, custom backgrounds, filename templates, and format-specific quality. PNG exports are lossless. JPEG uses an opaque background. The encoder checks the actual MIME type instead of silently substituting formats.

## Appearance and components

Use the sun/moon button in the header to select **Light**, **Dark**, or **System**. System is the default and follows your operating system. An explicit choice is saved on this device and applied before the page renders.

The interface uses the official shadcn/ui **base-nova** components with **Base UI** primitives, configured in `components.json`. Buttons, inputs, text areas, labels, checkboxes, selects, sliders, collapsibles, tabs, menus, dialogs, tooltips, cards, badges, avatars, separators, and notifications compose the shared components in `components/ui`. Layout and document content retain semantic HTML. Appearance is managed by `next-themes`; both palettes use semantic CSS variables in `app/globals.css`.

## Presets and privacy

Five starter presets are provided. Load with Replace or Append, or save a custom preset. The preset library supports rename, description editing, duplication, deletion, and JSON import/export. Saved presets and the separate workspace draft use validated, versioned localStorage. Unknown schema versions and malformed data are rejected safely. Export JSON to back up settings across devices or browsers.

Source images and generated files stay in browser memory. There is no image upload API, account, database, or remote image processing. Refreshing removes the source image but retains saved configurations. Browser storage restrictions or quota failures produce a visible error.

## Processing

- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui with Base UI primitives, Lucide, Zustand, Valibot, and fflate.
- Canvas rendering is isolated from React. A sequential queue uses a dedicated Web Worker and OffscreenCanvas where available, with a main-thread Canvas fallback.
- Jobs capture source and settings snapshots. Changed settings mark results stale. Cancellation terminates the active worker and cancels pending jobs. Independent failures preserve successful results.
- PNG, JPEG, WebP, and AVIF exports. AVIF uses the locally served jSquash/libavif WASM codec when native export is unavailable. Installation and builds copy its licensed runtime files into public/codecs automatically.
- AVIF input decoding depends on browser support. Native PNG/JPEG/WebP export support is checked during encoding; unsupported formats produce an explicit error.
- Limits: 30 MB source files, 40 megapixels, and 16,384 pixels per side. On browsers without workers/OffscreenCanvas, large operations may briefly occupy the main thread.
- Downloads sanitize filenames, enforce the encoded extension, resolve ZIP name collisions, skip unfinished/stale/failed outputs, and release object URLs. Canvas export strips metadata.

Core files: lib/model.ts (schemas and templates), lib/geometry.ts (resize/crop calculations), lib/engine.ts (decoding and encoding), lib/image-worker.ts (worker entry), and lib/store.ts (workspace, presets, queue, exports).

## Verification and production

```sh
bun run typecheck
bun run build
bunx playwright install chromium
bun run test
bun run start
```

Playwright starts the production server on port 3100. Tests inspect actual encoded files with Sharp and unpack ZIPs, alongside preset persistence, invalid input recovery, cancellation, browser fallback, responsive layouts, and axe accessibility checks. Screenshots and failure traces are saved under test-results/.

The app can run on any Next.js-compatible Node host. No environment variables or credentials are required. Codec WASM and JavaScript are served from the same origin.
