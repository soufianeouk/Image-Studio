import { create } from "zustand";
import * as v from "valibot";
import { zipSync } from "fflate";
import {
  builtins,
  filename,
  hashOutput,
  makeOutput,
  originalName,
  outputSchema,
  parsePresets,
  presetSchema,
  sanitize,
  uid,
  type Output,
  type Preset,
  type Result,
  type Source,
} from "./model";
import { decode, processImage } from "./engine";

const PRESETS_KEY = "image-studio.presets.v1";
const DRAFT_KEY = "image-studio.draft.v1";
let worker: Worker | undefined;
let cancelWorker: (() => void) | undefined;
let job = 0;
let upload = 0;
const clearResult = (r?: Result) => {
  if (r?.url) URL.revokeObjectURL(r.url);
};
const initial = builtins[0].outputs.map((o) => ({ ...o }));
type Studio = {
  outputs: Output[];
  selectedId: string;
  source: Source | null;
  results: Record<string, Result>;
  presets: Preset[];
  activePreset: string;
  dirty: boolean;
  busy: boolean;
  loading: boolean;
  initialized: boolean;
  notice: { text: string; error: boolean } | null;
  notify: (text: string, error?: boolean) => void;
  initialize: () => void;
  setSource: (file: File) => Promise<void>;
  removeSource: () => void;
  update: (id: string, changes: Partial<Output>) => void;
  select: (id: string) => void;
  add: () => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  reset: (id: string) => void;
  generate: (ids?: string[], quiet?: boolean) => Promise<void>;
  cancel: () => void;
  applyPreset: (preset: Preset, append?: boolean) => void;
  savePreset: (name: string, description: string, id?: string) => boolean;
  editPreset: (id: string, name: string, description: string) => void;
  deletePreset: (id: string) => void;
  importPresets: (text: string) => void;
};
function persistDraft() {
  const s = useStudio.getState();
  if (!v.safeParse(v.array(outputSchema), s.outputs).success) return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        outputs: s.outputs,
        activePreset: s.activePreset,
        dirty: s.dirty,
      }),
    );
  } catch {
    s.notify(
      "Browser storage is unavailable. Your work will remain available in this tab.",
      true,
    );
  }
}
function persistPresets(presets: Preset[]) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    return true;
  } catch {
    useStudio
      .getState()
      .notify(
        "Could not save to browser storage. Export your presets as JSON to keep a copy.",
        true,
      );
    return false;
  }
}
export const useStudio = create<Studio>((set, get) => ({
  outputs: initial,
  selectedId: initial[0].id,
  source: null,
  results: {},
  presets: [],
  activePreset: "website",
  dirty: false,
  busy: false,
  loading: false,
  initialized: false,
  notice: null,
  notify: (text, error = false) => set({ notice: { text, error } }),
  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          presets:
            Array.isArray(data) && data.length === 0 ? [] : parsePresets(data),
        });
      }
    } catch {
      get().notify(
        "Saved presets could not be read. You can still create or import presets.",
        true,
      );
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version !== 1) throw new Error("Unsupported draft version");
        const outputs = v.parse(
          v.pipe(v.array(outputSchema), v.maxLength(200)),
          data.outputs,
        );
        set({
          outputs,
          selectedId: outputs[0]?.id ?? "",
          activePreset:
            typeof data.activePreset === "string"
              ? data.activePreset
              : "website",
          dirty: !!data.dirty,
        });
      }
    } catch {
      get().notify(
        "The saved draft was incompatible. A fresh workspace is ready.",
        true,
      );
    }
  },
  setSource: async (file) => {
    const token = ++upload;
    set({ loading: true });
    try {
      if (file.size > 30 * 1024 * 1024)
        throw new Error("Choose an image smaller than 30 MB.");
      const b = new Uint8Array(await file.slice(0, 48).arrayBuffer());
      const ascii = new TextDecoder().decode(b);
      const valid =
        (b[0] === 0x89 && ascii.slice(1, 4) === "PNG") ||
        (b[0] === 0xff && b[1] === 0xd8) ||
        (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") ||
        (ascii.slice(4, 8) === "ftyp" && /avif|avis/.test(ascii));
      if (!valid)
        throw new Error(
          "Choose a PNG, JPEG, WebP, or AVIF image. This file type is not supported.",
        );
      const image = await decode(file);
      const width = image.width,
        height = image.height;
      if ("close" in image) image.close();
      if (
        !width ||
        !height ||
        width > 16384 ||
        height > 16384 ||
        width * height > 40000000
      )
        throw new Error(
          "Choose an image up to 40 megapixels and 16,384 pixels per side.",
        );
      if (token !== upload) return;
      get().cancel();
      const old = get();
      if (old.source) URL.revokeObjectURL(old.source.url);
      Object.values(old.results).forEach(clearResult);
      set({
        source: {
          id: uid(),
          file,
          url: URL.createObjectURL(file),
          width,
          height,
        },
        results: {},
        notice: null,
      });
    } catch (error) {
      if (token === upload)
        get().notify(
          error instanceof Error
            ? error.message
            : "This image could not be opened.",
          true,
        );
    } finally {
      if (token === upload) set({ loading: false });
    }
  },
  removeSource: () => {
    ++upload;
    get().cancel();
    const s = get();
    if (s.source) URL.revokeObjectURL(s.source.url);
    Object.values(s.results).forEach(clearResult);
    set({ source: null, results: {}, loading: false });
  },
  update: (id, changes) => {
    set((s) => ({
      outputs: s.outputs.map((o) => (o.id === id ? { ...o, ...changes } : o)),
      dirty: true,
    }));
    persistDraft();
  },
  select: (selectedId) => set({ selectedId }),
  add: () => {
    const o = makeOutput({ name: `Output ${get().outputs.length + 1}` });
    set((s) => ({ outputs: [...s.outputs, o], selectedId: o.id, dirty: true }));
    persistDraft();
  },
  duplicate: (id) => {
    const o = get().outputs.find((o) => o.id === id);
    if (!o) return;
    const copy = { ...o, id: uid(), name: `${o.name.slice(0, 90)} copy` };
    set((s) => {
      const outputs = [...s.outputs];
      outputs.splice(outputs.findIndex((o) => o.id === id) + 1, 0, copy);
      return { outputs, selectedId: copy.id, dirty: true };
    });
    persistDraft();
  },
  remove: (id) => {
    clearResult(get().results[id]);
    set((s) => {
      const outputs = s.outputs.filter((o) => o.id !== id);
      const results = { ...s.results };
      delete results[id];
      return {
        outputs,
        results,
        selectedId: s.selectedId === id ? (outputs[0]?.id ?? "") : s.selectedId,
        dirty: true,
      };
    });
    persistDraft();
  },
  move: (id, direction) => {
    const outputs = [...get().outputs];
    const i = outputs.findIndex((o) => o.id === id),
      j = i + direction;
    if (i < 0 || j < 0 || j >= outputs.length) return;
    [outputs[i], outputs[j]] = [outputs[j], outputs[i]];
    const results = { ...get().results };
    for (const output of outputs) {
      if (output.filenameTemplate.includes("{index}")) {
        clearResult(results[output.id]);
        delete results[output.id];
      }
    }
    set({ outputs, results, dirty: true });
    persistDraft();
  },
  reset: (id) => {
    const o = get().outputs.find((o) => o.id === id);
    if (o) get().update(id, makeOutput({ id, name: o.name }));
  },
  cancel: () => {
    ++job;
    worker?.terminate();
    worker = undefined;
    cancelWorker?.();
    cancelWorker = undefined;
    set((s) => ({
      busy: false,
      results: Object.fromEntries(
        Object.entries(s.results).map(([id, r]) => [
          id,
          r.status === "queued" || r.status === "processing"
            ? { ...r, status: "cancelled" as const }
            : r,
        ]),
      ),
    }));
  },
  generate: async (ids, quiet = false) => {
    const state = get();
    if (!state.source || state.busy) return;
    const source = state.source;
    const outputs = state.outputs
      .filter((o) => (ids ? ids.includes(o.id) : o.enabled))
      .map((o) => ({ ...o }));
    if (!outputs.length) return;
    const token = ++job;
    const results = { ...state.results };
    for (const o of outputs) {
      clearResult(results[o.id]);
      results[o.id] = {
        status: "queued",
        hash: hashOutput(o),
        sourceId: source.id,
      };
    }
    set({ busy: true, results });
    let completed = 0,
      failed = 0;
    for (const o of outputs) {
      if (token !== job) break;
      if (!get().outputs.some((current) => current.id === o.id)) continue;
      const base: Result = {
        status: "processing",
        hash: hashOutput(o),
        sourceId: source.id,
      };
      set((s) => ({ results: { ...s.results, [o.id]: base } }));
      try {
        let result: Awaited<ReturnType<typeof processImage>>;
        if (
          typeof Worker !== "undefined" &&
          typeof OffscreenCanvas !== "undefined" &&
          typeof createImageBitmap === "function"
        ) {
          result = await new Promise((resolve, reject) => {
            worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
              type: "module",
            });
            cancelWorker = () => reject(new Error("Cancelled"));
            worker.onmessage = (event) =>
              event.data.error
                ? reject(new Error(event.data.error))
                : resolve(event.data.result);
            worker.onerror = () =>
              reject(
                new Error(
                  "The image worker stopped. Try a smaller image or another format.",
                ),
              );
            worker.postMessage({ file: source.file, output: o });
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 0));
          result = await processImage(source.file, o);
        }
        if (token !== job) break;
        if (!get().outputs.some((current) => current.id === o.id)) continue;
        const url = URL.createObjectURL(result.blob);
        set((s) => ({
          results: {
            ...s.results,
            [o.id]: {
              ...base,
              ...result,
              url,
              filename: filename(
                o,
                source.file.name,
                result.width,
                result.height,
                state.outputs.findIndex((item) => item.id === o.id),
              ),
              status: "completed",
            },
          },
        }));
        completed++;
      } catch (error) {
        if (token !== job) break;
        failed++;
        if (get().outputs.some((current) => current.id === o.id))
          set((s) => ({
            results: {
              ...s.results,
              [o.id]: {
                ...base,
                status: "failed",
                error:
                  error instanceof Error ? error.message : "Processing failed.",
              },
            },
          }));
      } finally {
        if (token === job) {
          worker?.terminate();
          worker = undefined;
          cancelWorker = undefined;
        }
      }
    }
    if (token === job) {
      set({ busy: false });
      if (!quiet || failed)
        get().notify(
          `${completed} output${completed === 1 ? "" : "s"} generated${failed ? `; ${failed} failed. Successful files are ready to download.` : ". Ready when you are."}`,
          failed > 0,
        );
    }
  },
  applyPreset: (preset, append = false) => {
    get().cancel();
    const outputs = preset.outputs.map((o) => ({ ...o, id: uid() }));
    if (!append) Object.values(get().results).forEach(clearResult);
    set((s) => ({
      outputs: append ? [...s.outputs, ...outputs] : outputs,
      selectedId: outputs[0]?.id ?? "",
      activePreset: append ? s.activePreset : preset.id,
      dirty: append,
      results: append ? s.results : {},
    }));
    persistDraft();
    get().notify(
      `${preset.name} ${append ? "added to" : "loaded into"} your workspace.`,
    );
  },
  savePreset: (name, description, id) => {
    const now = new Date().toISOString();
    const existing = get().presets.find((p) => p.id === id);
    const parsed = v.safeParse(presetSchema, {
      id: existing?.id ?? uid(),
      name,
      description,
      version: 1,
      outputs: get().outputs,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    if (!parsed.success) {
      get().notify(
        "Give your preset a name and check that all output settings are valid.",
        true,
      );
      return false;
    }
    const presets = existing
      ? get().presets.map((p) => (p.id === existing.id ? parsed.output : p))
      : [...get().presets, parsed.output];
    if (!persistPresets(presets)) return false;
    set({ presets, activePreset: parsed.output.id, dirty: false });
    persistDraft();
    get().notify(`“${parsed.output.name}” saved on this device.`);
    return true;
  },
  editPreset: (id, name, description) => {
    const presets = get().presets.map((p) =>
      p.id === id
        ? { ...p, name, description, updatedAt: new Date().toISOString() }
        : p,
    );
    if (!v.safeParse(v.array(presetSchema), presets).success) {
      get().notify("Enter a preset name of 1–100 characters.", true);
      return;
    }
    if (persistPresets(presets)) set({ presets });
  },
  deletePreset: (id) => {
    const presets = get().presets.filter((p) => p.id !== id);
    if (persistPresets(presets)) {
      set({ presets, dirty: get().activePreset === id || get().dirty });
      get().notify("Preset deleted.");
    }
  },
  importPresets: (text) => {
    try {
      const imported = parsePresets(JSON.parse(text)).map((p) => ({
        ...p,
        id: uid(),
        outputs: p.outputs.map((o) => ({ ...o, id: uid() })),
      }));
      const presets = [...get().presets, ...imported];
      if (persistPresets(presets)) {
        set({ presets });
        get().notify(
          `${imported.length} preset${imported.length === 1 ? "" : "s"} imported.`,
        );
      }
    } catch {
      get().notify(
        "This is not a valid version 1 preset. Check its dimensions, format, quality, and required fields.",
        true,
      );
    }
  },
}));

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const extension = name.match(/\.[a-z0-9]{1,6}$/i)?.[0] ?? "";
  a.download = extension
    ? sanitize(name.slice(0, -extension.length)).slice(
        0,
        180 - extension.length,
      ) + extension
    : sanitize(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}
export function downloadOutput(id: string) {
  const s = useStudio.getState(),
    result = s.results[id],
    output = s.outputs.find((o) => o.id === id);
  if (!result?.blob || !output || !isCurrent(result, output, s.source)) return;
  download(result.blob, result.filename ?? "image.png");
}
export function isCurrent(
  result: Result | undefined,
  output: Output,
  source: Source | null,
) {
  return (
    !!source &&
    result?.status === "completed" &&
    result.hash === hashOutput(output) &&
    result.sourceId === source.id &&
    result.filename ===
      filename(
        output,
        source.file.name,
        result.width!,
        result.height!,
        useStudio.getState().outputs.findIndex((o) => o.id === output.id),
      )
  );
}
export async function exportZip() {
  const s = useStudio.getState();
  const ready = s.outputs.filter(
    (o) => o.enabled && isCurrent(s.results[o.id], o, s.source),
  );
  if (!ready.length) {
    s.notify("Generate at least one enabled output before exporting.", true);
    return;
  }
  try {
    const files: Record<string, Uint8Array> = Object.create(null);
    for (const o of ready) {
      const r = s.results[o.id];
      const name = r.filename!;
      let unique = name,
        n = 2;
      while (Object.hasOwn(files, unique))
        unique = name.replace(/(\.[^.]+)$/, `-${n++}$1`);
      files[unique] = new Uint8Array(await r.blob!.arrayBuffer());
    }
    const archive = zipSync(files, { level: 0 });
    download(
      new Blob([new Uint8Array(archive)], { type: "application/zip" }),
      `${sanitize(originalName(s.source!.file.name))}-outputs.zip`,
    );
    const skipped = s.outputs.filter((o) => o.enabled).length - ready.length;
    s.notify(
      `Exported ${ready.length} files${skipped ? `; ${skipped} unfinished or outdated outputs were excluded` : ""}.`,
    );
  } catch {
    s.notify(
      "The ZIP could not be created. Try downloading the files individually.",
      true,
    );
  }
}
