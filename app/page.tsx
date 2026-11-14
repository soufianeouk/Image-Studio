"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type ComponentProps,
} from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileImage,
  FolderOpen,
  Grid2X2,
  HelpCircle,
  ImagePlus,
  Layers,
  Leaf,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Unlink2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as v from "valibot";
import { Dialog } from "@/components/studio-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { OptionSelect } from "@/components/option-select";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { createDemo } from "@/lib/demo";
import { geometry } from "@/lib/geometry";
import {
  builtins,
  filename,
  formatBytes,
  hashOutput,
  outputSchema,
  type Output,
  type Preset,
} from "@/lib/model";
import {
  download,
  downloadOutput,
  exportZip,
  isCurrent,
  useStudio,
} from "@/lib/store";

function ActionButton({
  children,
  className = "",
  variant = "secondary",
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Button
      variant={
        variant === "primary"
          ? "default"
          : variant === "secondary"
            ? "outline"
            : "ghost"
      }
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="plain"
            className="icon-button"
            aria-label={label}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
function Tag({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={`tag ${className}`}>
      {children}
    </Badge>
  );
}
function SectionLabel({
  children,
  count,
  aside,
}: {
  children: ReactNode;
  count?: number;
  aside?: ReactNode;
}) {
  return (
    <div className="section-label">
      <h2>
        {children}
        {count !== undefined && (
          <Badge variant="secondary" className="count">
            {String(count).padStart(2, "0")}
          </Badge>
        )}
      </h2>
      {aside}
    </div>
  );
}
function Landscape() {
  return (
    <svg
      viewBox="0 0 320 220"
      className="landscape"
      fill="none"
      aria-hidden="true"
    >
      <rect x="28" y="22" width="264" height="176" rx="10" fill="#eef0e6" />
      <circle cx="225" cy="73" r="24" fill="#d2dbba" />
      <path
        d="M28 161 109 73 193 169 238 119 292 174v14a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10z"
        fill="#becbb1"
      />
      <path d="m28 178 93-53 86 73H38a10 10 0 0 1-10-10z" fill="#92aa8a" />
      <rect
        x="17"
        y="11"
        width="286"
        height="198"
        rx="17"
        stroke="#d5dbca"
        strokeDasharray="5 5"
      />
      <path
        d="M152 11h16M152 209h16M17 102v16M303 102v16"
        stroke="#8a9e79"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SourcePanel() {
  const s = useStudio();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const source = s.source;
  return (
    <section className="source-section">
      <SectionLabel>Source image</SectionLabel>
      <Card className="source-card">
        <Input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          aria-label="Upload source image"
          onChange={(e) => {
            if (e.target.files?.[0]) void s.setSource(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div
          className={`drop-zone ${drag ? "dragging" : ""} ${source ? "has-source" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files[0])
              void s.setSource(e.dataTransfer.files[0]);
          }}
        >
          {source ? (
            <>
              <div className="source-image checker">
                <img src={source.url} alt={`Original: ${source.file.name}`} />
              </div>
              <div className="source-file">
                <span className="file-icon">
                  <FileImage size={18} />
                </span>
                <div>
                  <strong title={source.file.name}>{source.file.name}</strong>
                  <span>
                    {source.width.toLocaleString()} ×{" "}
                    {source.height.toLocaleString()} px <i>·</i>{" "}
                    {formatBytes(source.file.size)}
                  </span>
                </div>
              </div>
              <div className="source-actions">
                <ActionButton onClick={() => input.current?.click()}>
                  <RefreshCw size={13} />
                  Replace image
                </ActionButton>
                <IconButton
                  label="Remove source image"
                  onClick={s.removeSource}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </>
          ) : (
            <Button
              variant="ghost"
              size="plain"
              className="upload-target"
              onClick={() => input.current?.click()}
              disabled={s.loading}
            >
              <span className="upload-icon">
                {s.loading ? (
                  <LoaderCircle size={26} className="spin" />
                ) : (
                  <ImagePlus size={26} strokeWidth={1.5} />
                )}
              </span>
              <strong>
                {s.loading ? "Opening your image…" : "Start with an image"}
              </strong>
              <span>
                Drop it here, or <b>browse files</b>
              </span>
              <small>PNG, JPG, WebP, AVIF · up to 30 MB</small>
            </Button>
          )}
        </div>
        {!source && (
          <div className="demo-row">
            <span>Just exploring?</span>
            <Button
              variant="ghost"
              size="plain"
              onClick={async () => {
                try {
                  await s.setSource(await createDemo());
                } catch {
                  s.notify("The example could not be loaded.", true);
                }
              }}
            >
              Try an example <ArrowRight size={12} />
            </Button>
          </div>
        )}
        <div className="local-note">
          <LockKeyhole size={12} />
          <span>Your image stays on your device.</span>
        </div>
      </Card>
      <PresetSidebar />
      <div className="little-tip">
        <span className="tip-icon">
          <Sparkles size={16} />
        </span>
        <div>
          <strong>One setup. Endless possibilities.</strong>
          <p>
            Save your outputs as a preset.
            <br />
            Drop in a new image. Do it all again.
          </p>
        </div>
      </div>
    </section>
  );
}

function PresetSidebar() {
  const s = useStudio();
  const [pending, setPending] = useState<Preset | null>(null);
  const [manage, setManage] = useState(false);
  const apply = (preset: Preset) => {
    if (s.dirty || s.outputs.length > 0) setPending(preset);
    else s.applyPreset(preset);
  };
  return (
    <>
      <div className="preset-heading">
        <SectionLabel>Presets</SectionLabel>
        <Button
          variant="ghost"
          size="plain"
          className="text-link"
          onClick={() => setManage(true)}
        >
          Manage <SlidersHorizontal size={12} />
        </Button>
      </div>
      <div className="preset-list">
        {builtins.map((p, i) => (
          <Button
            variant="ghost"
            size="plain"
            key={p.id}
            className={`preset-item ${s.activePreset === p.id ? "active" : ""}`}
            onClick={() => apply(p)}
          >
            <span className="preset-icon">
              {i === 0 ? (
                <Layers size={16} />
              ) : i === 1 ? (
                <Grid2X2 size={16} />
              ) : i === 2 ? (
                <ScanLine size={16} />
              ) : i === 3 ? (
                <FileImage size={16} />
              ) : (
                <Maximize2 size={16} />
              )}
            </span>
            <span>{p.name}</span>
            <span className="preset-number">{p.outputs.length}</span>
            {s.activePreset === p.id && <span className="active-dot" />}
          </Button>
        ))}
        {s.presets.length > 0 && (
          <div className="list-caption">YOUR PRESETS</div>
        )}
        {s.presets.map((p) => (
          <Button
            variant="ghost"
            size="plain"
            key={p.id}
            className={`preset-item ${s.activePreset === p.id ? "active" : ""}`}
            onClick={() => apply(p)}
          >
            <FolderOpen size={16} />
            <span>{p.name}</span>
            <span className="preset-number">{p.outputs.length}</span>
          </Button>
        ))}
      </div>
      <div className="preset-hint">A starting point. Make it your own.</div>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={`Load ${pending?.name ?? "preset"}`}
        description={
          s.dirty
            ? "You have unsaved output changes. Replacing will discard those changes; your source image will stay."
            : "Choose how to add these output settings to your workspace."
        }
      >
        <div className="preset-detail">
          {pending?.description}
          <div className="preset-detail-tags">
            {pending?.outputs.map((o) => (
              <Tag key={o.id}>
                {o.name} · {o.width} × {o.height}
              </Tag>
            ))}
          </div>
        </div>
        <div className="dialog-actions">
          <ActionButton onClick={() => setPending(null)}>Cancel</ActionButton>
          <ActionButton
            onClick={() => {
              if (pending) s.applyPreset(pending, true);
              setPending(null);
            }}
          >
            Append outputs
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={() => {
              if (pending) s.applyPreset(pending);
              setPending(null);
            }}
          >
            Replace outputs
          </ActionButton>
        </div>
      </Dialog>
      <PresetManager open={manage} onOpenChange={setManage} />
    </>
  );
}

function PresetManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const s = useStudio();
  const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<Preset | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Your preset library"
        description="Reusable workflows, saved in this browser. Export a copy to take them with you."
        wide
      >
        <div className="manager-toolbar">
          <span>{s.presets.length} saved presets</span>
          <div>
            <ActionButton onClick={() => file.current?.click()}>
              <Upload size={14} />
              Import JSON
            </ActionButton>
            <ActionButton
              disabled={!s.presets.length}
              onClick={() =>
                download(
                  new Blob([JSON.stringify(s.presets, null, 2)], {
                    type: "application/json",
                  }),
                  "image-studio-presets.json",
                )
              }
            >
              <Download size={14} />
              Export all
            </ActionButton>
          </div>
        </div>
        <Input
          ref={file}
          className="sr-only"
          aria-label="Import presets JSON"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              if (f.size > 2097152)
                s.notify("Choose a preset JSON file smaller than 2 MB.", true);
              else s.importPresets(await f.text());
            }
            e.target.value = "";
          }}
        />
        {!s.presets.length && (
          <Card className="manager-empty">
            <FolderOpen size={36} strokeWidth={1} />
            <h3>A home for your workflows</h3>
            <p>Use “Save preset” to keep your current outputs here.</p>
          </Card>
        )}
        <div className="managed-presets">
          {s.presets.map((p) => (
            <Card key={p.id} className="managed-preset">
              <div>
                <strong>{p.name}</strong>
                <p>{p.description || "No description"}</p>
                <small>
                  {p.outputs.length} outputs · Updated{" "}
                  {new Date(p.updatedAt).toLocaleDateString()}
                </small>
              </div>
              <div className="managed-actions">
                <ActionButton
                  onClick={() => {
                    setEdit(p);
                    setName(p.name);
                    setDescription(p.description ?? "");
                  }}
                >
                  Edit
                </ActionButton>
                <IconButton
                  label={`Export ${p.name}`}
                  onClick={() =>
                    download(
                      new Blob([JSON.stringify(p, null, 2)], {
                        type: "application/json",
                      }),
                      `${p.name}.json`,
                    )
                  }
                >
                  <Download size={15} />
                </IconButton>
                <IconButton
                  label={`Duplicate preset ${p.name}`}
                  onClick={() =>
                    s.importPresets(
                      JSON.stringify({
                        ...p,
                        name: `${p.name.slice(0, 90)} copy`,
                      }),
                    )
                  }
                >
                  <Copy size={15} />
                </IconButton>
                <IconButton
                  label={`Delete preset ${p.name}`}
                  onClick={() => setDeleting(p.id)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
        <div className="dialog-footnote">
          <ShieldCheck size={14} />
          Presets contain settings only. Your images are never saved.
        </div>
      </Dialog>
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!o) setEdit(null);
        }}
        title="Edit preset details"
        description="Changes here update the saved preset, keeping its output settings."
      >
        <Label className="field">
          Preset name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </Label>
        <Label className="field">
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </Label>
        <div className="dialog-actions">
          <ActionButton onClick={() => setEdit(null)}>Cancel</ActionButton>
          <ActionButton
            variant="primary"
            disabled={!name.trim()}
            onClick={() => {
              if (edit) s.editPreset(edit.id, name.trim(), description);
              setEdit(null);
            }}
          >
            Save changes
          </ActionButton>
        </div>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete this preset?"
        description="This removes the saved preset from this browser. Your current workspace will remain available."
      >
        <div className="dialog-actions">
          <ActionButton onClick={() => setDeleting(null)}>
            Keep preset
          </ActionButton>
          <ActionButton
            className="danger"
            onClick={() => {
              if (deleting) s.deletePreset(deleting);
              setDeleting(null);
            }}
          >
            Delete preset
          </ActionButton>
        </div>
      </Dialog>
    </>
  );
}

function OutputCard({ output: o, index }: { output: Output; index: number }) {
  const s = useStudio();
  const selected = s.selectedId === o.id;
  const r = s.results[o.id];

  const update = (changes: Partial<Output>) => s.update(o.id, changes);
  const valid = v.safeParse(outputSchema, o).success;
  const current = isCurrent(r, o, s.source);
  const resize = (key: "width" | "height", value: string) => {
    const n = value === "" ? null : Number(value);
    const changes: Partial<Output> = { [key]: n };
    if (o.keepAspectRatio && n && n > 0) {
      const ratio =
        o.width && o.height
          ? o.width / o.height
          : s.source
            ? s.source.width / s.source.height
            : 1;
      if (key === "width") changes.height = Math.max(1, Math.round(n / ratio));
      else changes.width = Math.max(1, Math.round(n * ratio));
    }
    update(changes);
  };
  let dims = `${o.width ?? "Auto"} × ${o.height ?? "Auto"}`;
  try {
    if (s.source && valid) {
      const g = geometry(o, s.source.width, s.source.height);
      dims = `${g.width} × ${g.height}`;
    }
  } catch {
    dims = "Check dimensions";
  }
  const actions = [
    { name: "Duplicate", Icon: Copy, action: () => s.duplicate(o.id) },
    { name: "Move up", Icon: ArrowUp, action: () => s.move(o.id, -1) },
    { name: "Move down", Icon: ArrowDown, action: () => s.move(o.id, 1) },
    { name: "Reset settings", Icon: RotateCcw, action: () => s.reset(o.id) },
    { name: "Delete output", Icon: Trash2, action: () => s.remove(o.id) },
  ];
  return (
    <Card
      className={`output-card ${selected ? "selected" : ""} ${!o.enabled ? "output-disabled" : ""}`}
    >
      <div className="output-card-head">
        <Checkbox
          className="output-check"
          checked={o.enabled}
          aria-label={`Enable ${o.name}`}
          onCheckedChange={(checked) => update({ enabled: checked })}
        />
        <Button
          variant="ghost"
          size="plain"
          className="output-select"
          onClick={() => s.select(o.id)}
          aria-expanded={selected}
        >
          <span className={`output-symbol symbol-${index % 3}`}>
            <FileImage size={18} strokeWidth={1.6} />
          </span>
          <span>
            <strong>{o.name || "Untitled output"}</strong>
            <small>
              {dims} px <i>·</i> {o.format.toUpperCase()}
            </small>
          </span>
        </Button>
        <div className="output-status">
          {r?.status === "processing" || r?.status === "queued" ? (
            <LoaderCircle className="spin" size={15} />
          ) : current ? (
            <span title="Ready to download" className="ready-dot">
              <Check size={12} />
            </span>
          ) : r?.status === "failed" ? (
            <span className="error-dot" title={r.error}>
              !
            </span>
          ) : r?.blob ? (
            <span
              className="stale-dot"
              title="Settings changed. Regenerate this output."
            />
          ) : null}
        </div>
        <div className="output-menu">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="icon-button"
                  aria-label={`Actions for ${o.name}`}
                />
              }
            >
              <MoreHorizontal size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="output-actions-menu">
              {actions.map(({ name, Icon, action }) => (
                <DropdownMenuItem
                  key={name}
                  variant={name === "Delete output" ? "destructive" : "default"}
                  onClick={action}
                >
                  <Icon size={14} />
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button
          variant="ghost"
          size="plain"
          className="expand-button"
          aria-label={`Configure ${o.name}`}
          onClick={() => s.select(selected ? "" : o.id)}
        >
          {selected ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Button>
      </div>
      {selected && (
        <div className="output-settings">
          <Label className="field">
            Output name
            <Input
              value={o.name}
              onChange={(e) => update({ name: e.target.value })}
              maxLength={100}
              aria-invalid={!o.name.trim()}
            />
          </Label>
          <div className="dimensions-label">
            <span>
              Dimensions <span className="field-hint">px</span>
            </span>
            <Button
              variant="ghost"
              size="plain"
              className={`aspect-button ${o.keepAspectRatio ? "locked" : ""}`}
              aria-label="Lock aspect ratio"
              aria-pressed={o.keepAspectRatio}
              onClick={() => update({ keepAspectRatio: !o.keepAspectRatio })}
            >
              {o.keepAspectRatio ? <Link2 size={13} /> : <Unlink2 size={13} />}
              {o.keepAspectRatio ? "Locked" : "Unlocked"}
            </Button>
          </div>
          <div className="dimension-inputs">
            <Label>
              <span>W</span>
              <Input
                aria-label="Width"
                type="number"
                min={1}
                max={16384}
                placeholder="Auto"
                value={o.width ?? ""}
                onChange={(e) => resize("width", e.target.value)}
                aria-invalid={
                  o.width !== null &&
                  (o.width < 1 || o.width > 16384 || !Number.isInteger(o.width))
                }
              />
            </Label>
            <span className="times">×</span>
            <Label>
              <span>H</span>
              <Input
                aria-label="Height"
                type="number"
                min={1}
                max={16384}
                placeholder="Auto"
                value={o.height ?? ""}
                onChange={(e) => resize("height", e.target.value)}
                aria-invalid={
                  o.height !== null &&
                  (o.height < 1 ||
                    o.height > 16384 ||
                    !Number.isInteger(o.height))
                }
              />
            </Label>
          </div>
          <div className="field-grid">
            <Label className="field">
              Format
              <OptionSelect
                label="Format"
                value={o.format}
                onValueChange={(value) =>
                  update({ format: value as Output["format"] })
                }
                items={[
                  { value: "webp", label: "WebP" },
                  { value: "jpeg", label: "JPEG" },
                  { value: "png", label: "PNG" },
                  { value: "avif", label: "AVIF" },
                ]}
              />
            </Label>
            <Label className="field">
              Resize mode
              <OptionSelect
                label="Resize mode"
                value={o.resizeMode}
                onValueChange={(value) =>
                  update({ resizeMode: value as Output["resizeMode"] })
                }
                items={[
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                  { value: "stretch", label: "Stretch" },
                  { value: "fit-width", label: "Fit width" },
                  { value: "fit-height", label: "Fit height" },
                ]}
              />
            </Label>
          </div>
          {o.format === "png" ? (
            <div className="lossless">
              <ShieldCheck size={13} />
              <span>PNG is always exported losslessly.</span>
              <Tag>Lossless</Tag>
            </div>
          ) : (
            <Label className="quality-field">
              <span>
                Quality{" "}
                <span className="quality-number">
                  {o.quality}
                  <small>%</small>
                </span>
              </span>
              <Slider
                aria-label="Quality"
                min={1}
                max={100}
                step={1}
                value={[o.quality]}
                onValueChange={(values) =>
                  update({
                    quality: Array.isArray(values) ? values[0] : values,
                  })
                }
                className="quality-slider"
              />
              <span className="range-labels">
                <small>Smaller file</small>
                <small>Higher quality</small>
              </span>
            </Label>
          )}
          <Collapsible className="advanced">
            <CollapsibleTrigger className="advanced-trigger">
              <SlidersHorizontal size={13} />
              More settings
              <ChevronDown size={13} />
            </CollapsibleTrigger>
            <CollapsibleContent className="advanced-content">
              <Label className="field">
                Filename template
                <Input
                  aria-label="Filename template"
                  value={o.filenameTemplate}
                  onChange={(e) => update({ filenameTemplate: e.target.value })}
                  placeholder="{originalName}-{outputName}.{ext}"
                />
                <small className="field-description">
                  Variables:{" "}
                  {
                    "{originalName}, {outputName}, {width}, {height}, {format}, {ext}, {index}"
                  }
                </small>
              </Label>
              <div className="field-grid">
                <Label className="field">
                  Background
                  <OptionSelect
                    label="Background"
                    value={
                      ["transparent", "#ffffff", "#000000"].includes(
                        o.backgroundColor,
                      )
                        ? o.backgroundColor
                        : "custom"
                    }
                    onValueChange={(value) =>
                      update({
                        backgroundColor: value === "custom" ? "#dbe4cf" : value,
                      })
                    }
                    items={[
                      {
                        value: "transparent",
                        label:
                          o.format === "jpeg" ? "White (JPEG)" : "Transparent",
                      },
                      { value: "#ffffff", label: "White" },
                      { value: "#000000", label: "Black" },
                      { value: "custom", label: "Custom color" },
                    ]}
                  />
                </Label>
                {!["transparent", "#ffffff", "#000000"].includes(
                  o.backgroundColor,
                ) && (
                  <Label className="field">
                    Custom color
                    <Input
                      type="text"
                      placeholder="#dbe4cf"
                      aria-label="Custom color"
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={!/^#[0-9a-f]{6}$/i.test(o.backgroundColor)}
                      value={o.backgroundColor}
                      onChange={(e) =>
                        update({ backgroundColor: e.target.value })
                      }
                    />
                  </Label>
                )}
                {o.resizeMode === "cover" && (
                  <Label className="field">
                    Crop alignment
                    <OptionSelect
                      label="Crop alignment"
                      value={o.cropPosition}
                      onValueChange={(value) =>
                        update({
                          cropPosition: value as Output["cropPosition"],
                        })
                      }
                      items={[
                        "center",
                        "top",
                        "bottom",
                        "left",
                        "right",
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ].map((value) => ({
                        value,
                        label: value.replace(
                          /(^|-)(\w)/g,
                          (_, a, b) =>
                            `${a === "-" ? " " : ""}${b.toUpperCase()}`,
                        ),
                      }))}
                    />
                  </Label>
                )}
              </div>
              <Label className="checkbox-field">
                <Checkbox
                  checked={o.allowUpscale}
                  onCheckedChange={(checked) =>
                    update({ allowUpscale: checked })
                  }
                  aria-label="Allow upscaling"
                />
                Allow upscaling
              </Label>
              <p className="field-description">
                {o.allowUpscale
                  ? "The image may be enlarged to fill the requested dimensions."
                  : "Image content stays at or below its original size. Fixed canvases can have padding; Fit modes reduce the canvas."}{" "}
                Metadata is removed on export.
              </p>
            </CollapsibleContent>
          </Collapsible>
          {!valid && (
            <p className="inline-error">
              Check the name, filename, dimensions, and background color.
              Dimensions must be whole numbers from 1 to 16,384. Custom colors
              use six hex digits, such as #dbe4cf.
            </p>
          )}
          {r?.status === "failed" && <p className="inline-error">{r.error}</p>}
          <div className="output-card-footer">
            <span>
              {!o.enabled ? (
                "Excluded from Generate all"
              ) : current ? (
                <>
                  <Check size={12} />
                  {formatBytes(r!.blob!.size)} · Ready
                </>
              ) : r?.blob ? (
                "Settings changed · preview outdated"
              ) : r?.status === "cancelled" ? (
                "Generation cancelled"
              ) : (
                <>
                  <span className="mini-dot" />
                  Included in export
                </>
              )}
            </span>
            <Button
              variant="ghost"
              size="plain"
              className="text-link"
              onClick={() => void s.generate([o.id])}
              disabled={!s.source || s.busy || !valid}
            >
              {r?.status === "failed" ? "Retry output" : "Generate"}
              <ArrowRight size={12} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OutputsPanel() {
  const s = useStudio();
  const enabled = s.outputs.filter((o) => o.enabled).length;
  return (
    <section className="outputs-section">
      <SectionLabel
        count={s.outputs.length}
        aside={
          <Button
            variant="ghost"
            size="plain"
            className="text-link add-output-top"
            onClick={s.add}
          >
            <Plus size={14} />
            Add output
          </Button>
        }
      >
        Outputs
      </SectionLabel>
      <div className="output-list">
        {s.outputs.map((o, i) => (
          <OutputCard key={o.id} output={o} index={i} />
        ))}
      </div>
      {!s.outputs.length && (
        <Card className="no-outputs">
          <Layers size={30} strokeWidth={1} />
          <h3>Your next output starts here</h3>
          <p>Add an output or choose a preset.</p>
        </Card>
      )}
      <Button
        variant="ghost"
        size="plain"
        className="add-output"
        onClick={s.add}
      >
        <Plus size={15} />
        Add another output
      </Button>
      <div className="generate-bar">
        <span>
          {enabled} output{enabled !== 1 ? "s" : ""} enabled
        </span>
        {s.busy ? (
          <ActionButton onClick={s.cancel}>
            <X size={14} />
            Cancel generation
          </ActionButton>
        ) : (
          <ActionButton
            variant="primary"
            disabled={!s.source || !enabled}
            onClick={() => void s.generate()}
          >
            <Sparkles size={15} />
            Generate all
            <ArrowRight size={14} />
          </ActionButton>
        )}
      </div>
      <div className="outputs-footnote">
        <CheckCheck size={13} />
        Each output has its own settings. Make it exactly what you need.
      </div>
    </section>
  );
}

function PreviewPanel() {
  const s = useStudio();
  const [view, setView] = useState<"output" | "original">("output");
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const o = s.outputs.find((o) => o.id === s.selectedId),
    r = o ? s.results[o.id] : undefined;
  const current = o ? isCurrent(r, o, s.source) : false;
  const image = view === "original" ? s.source?.url : r?.url;
  const processing = r?.status === "processing" || r?.status === "queued";
  let dimensions = { width: o?.width ?? 0, height: o?.height ?? 0 };
  let geometryError = "";
  try {
    if (o && s.source && v.safeParse(outputSchema, o).success)
      dimensions = geometry(o, s.source.width, s.source.height);
  } catch (e) {
    geometryError = e instanceof Error ? e.message : "Invalid dimensions";
  }
  const name =
    o && s.source
      ? filename(
          o,
          s.source.file.name,
          dimensions.width,
          dimensions.height,
          s.outputs.indexOf(o),
        )
      : "Your filename will appear here";
  const delta =
    r?.blob && s.source ? (r.blob.size / s.source.file.size - 1) * 100 : null;
  const canvasPreview = (
    <div className={`preview-canvas checker ${full ? "preview-full" : ""}`}>
      {image ? (
        <img
          src={image}
          alt={
            view === "original"
              ? "Original source image"
              : `${o?.name} generated preview`
          }
          style={{ transform: `scale(${zoom})` }}
        />
      ) : (
        <div className="preview-placeholder">
          <Landscape />
          <strong>
            {s.source
              ? "Let’s see what you can make"
              : "A little preview of what’s next"}
          </strong>
          <p>
            {s.source
              ? "Generate this output to see your image here."
              : "Add an image to bring your outputs to life."}
          </p>
          {s.source && o && (
            <Button
              variant="ghost"
              size="plain"
              className="text-link"
              disabled={s.busy}
              onClick={() => void s.generate([o.id])}
            >
              Generate preview
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      )}
      {processing && (
        <div className="processing-overlay">
          <LoaderCircle size={23} className="spin" />
          <span>
            {r.status === "queued"
              ? "Waiting in queue…"
              : `Creating ${o?.format.toUpperCase()}…`}
          </span>
        </div>
      )}
      {image && !current && view === "output" && (
        <span className="stale-label">Preview outdated</span>
      )}
      <div className="canvas-bottom">
        <span>{image ? `${Math.round(zoom * 100)}%` : "Fit to canvas"}</span>
        <div>
          <IconButton
            label="Zoom out"
            disabled={!image || zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut size={14} />
          </IconButton>
          <IconButton
            label="Zoom in"
            disabled={!image || zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            <ZoomIn size={14} />
          </IconButton>
          <IconButton
            label="Reset preview zoom"
            disabled={!image}
            onClick={() => setZoom(1)}
          >
            <Maximize2 size={14} />
          </IconButton>
        </div>
      </div>
    </div>
  );
  return (
    <aside className="preview-section">
      <SectionLabel
        aside={
          <span className="live-label">
            <span />
            Live preview
          </span>
        }
      >
        Preview
      </SectionLabel>
      <Card className="preview-panel">
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as "output" | "original")}
          className="preview-tab-root"
        >
          <div className="preview-tabs">
            <TabsList aria-label="Preview image">
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="original">Original</TabsTrigger>
            </TabsList>
            <IconButton label="Expand preview" onClick={() => setFull(true)}>
              <Maximize2 size={15} />
            </IconButton>
          </div>
          <TabsContent value="output">
            {view === "output" && !full && canvasPreview}
          </TabsContent>
          <TabsContent value="original">
            {view === "original" && !full && canvasPreview}
          </TabsContent>
        </Tabs>
        <div className="preview-info">
          <div className="preview-output-name">
            <span className="preview-icon">
              <FileImage size={18} />
            </span>
            <div>
              <strong>{o?.name || "Select an output"}</strong>
              <small>
                {o
                  ? `${dimensions.width || "Auto"} × ${dimensions.height || "Auto"} px`
                  : "Choose an output to preview"}
              </small>
            </div>
            <Tag>{o?.format.toUpperCase() ?? "IMAGE"}</Tag>
          </div>
          <div className="filename-box">
            <span>FILENAME</span>
            <code title={name}>{name}</code>
          </div>
          <div className="file-stats">
            <div>
              <span>File size</span>
              <strong>{r?.blob ? formatBytes(r.blob.size) : "—"}</strong>
            </div>
            <div>
              <span>Compared to original</span>
              <strong
                className={delta !== null && delta < 0 ? "text-green" : ""}
              >
                {delta === null
                  ? "—"
                  : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                {delta !== null && delta < 0 && <ArrowDown size={12} />}
              </strong>
            </div>
          </div>
          {geometryError && <p className="inline-error">{geometryError}</p>}
          <ActionButton
            className="download-output"
            disabled={!current}
            onClick={() => o && downloadOutput(o.id)}
          >
            <ArrowDownToLine size={15} />
            Download output
          </ActionButton>
          <div className="preview-status">
            {current ? (
              <>
                <span className="mini-dot" />
                Looking good. Your output is ready.
              </>
            ) : r?.status === "failed" ? (
              "Generation failed. Adjust settings and retry."
            ) : r?.status === "cancelled" ? (
              "Cancelled. Generate again when you’re ready."
            ) : r?.blob ? (
              "Settings changed. Generate a fresh preview."
            ) : (
              "Generate an output to download it."
            )}
          </div>
        </div>
      </Card>
      <div className="privacy-card">
        <span>
          <ShieldCheck size={20} strokeWidth={1.5} />
        </span>
        <div>
          <strong>Made on your device. Kept on your device.</strong>
          <p>
            No uploads. No accounts. Just your images,
            <br className="desktop-break" /> exactly how you need them.
          </p>
        </div>
      </div>
      <Dialog
        open={full}
        onOpenChange={setFull}
        title={
          view === "original" ? "Original image" : (o?.name ?? "Output preview")
        }
        description="Use the zoom controls to inspect your image."
        wide
      >
        {full && canvasPreview}
      </Dialog>
    </aside>
  );
}

function SavePreset({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const s = useStudio();
  const existing = s.presets.find((p) => p.id === s.activePreset);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"new" | "update">("new");
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "My image workflow");
      setDescription(existing?.description ?? "");
      setMode(existing ? "update" : "new");
    }
  }, [open, existing]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Save your workflow"
      description="Keep every output setting together. Your images and generated files won’t be saved."
    >
      {existing && (
        <div className="segmented" role="group" aria-label="Preset save mode">
          <Toggle
            pressed={mode === "update"}
            className={mode === "update" ? "active" : ""}
            onPressedChange={() => setMode("update")}
          >
            Update existing
          </Toggle>
          <Toggle
            pressed={mode === "new"}
            className={mode === "new" ? "active" : ""}
            onPressedChange={() => setMode("new")}
          >
            Save as new
          </Toggle>
        </div>
      )}
      <Label className="field">
        Preset name
        <Input
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="e.g. My website assets"
        />
      </Label>
      <Label className="field">
        Description <span className="field-hint">optional</span>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="A little context for your future self…"
        />
      </Label>
      <div className="save-summary">
        <Layers size={15} />
        {s.outputs.length} output settings <span>· Stored locally</span>
      </div>
      <div className="dialog-actions">
        <ActionButton onClick={() => onOpenChange(false)}>Cancel</ActionButton>
        <ActionButton
          variant="primary"
          disabled={!name.trim() || !s.outputs.length}
          onClick={() => {
            if (
              s.savePreset(
                name.trim(),
                description,
                mode === "update" ? existing?.id : undefined,
              )
            )
              onOpenChange(false);
          }}
        >
          <Save size={14} />
          Save preset
        </ActionButton>
      </div>
    </Dialog>
  );
}

export default function Home() {
  const s = useStudio();
  const [save, setSave] = useState(false);
  const [help, setHelp] = useState(false);
  const [library, setLibrary] = useState(false);
  const selected = s.outputs.find((o) => o.id === s.selectedId);
  const preset = [...builtins, ...s.presets].find(
    (p) => p.id === s.activePreset,
  );
  const selectedHash = selected ? hashOutput(selected) : "";
  const canExport = s.outputs.some(
    (o) => o.enabled && isCurrent(s.results[o.id], o, s.source),
  );
  useEffect(() => {
    useStudio.getState().initialize();
  }, []);
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")
      )
        return;
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((i) => i.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        void useStudio.getState().setSource(file);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, []);
  useEffect(() => {
    if (!s.notice) return;
    const timer = setTimeout(
      () => useStudio.setState({ notice: null }),
      s.notice.error ? 10000 : 4500,
    );
    return () => clearTimeout(timer);
  }, [s.notice]);
  useEffect(() => {
    if (!s.source || !selected || !v.safeParse(outputSchema, selected).success)
      return;
    const timer = setTimeout(() => {
      const state = useStudio.getState();
      const o = state.outputs.find((o) => o.id === state.selectedId);
      if (o && !state.busy && !isCurrent(state.results[o.id], o, state.source))
        void state.generate([o.id], true);
    }, 650);
    return () => clearTimeout(timer);
  }, [selectedHash, s.source?.id]);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label="Image Studio home">
          <span className="brand-icon">
            <Layers size={23} strokeWidth={1.8} />
          </span>
          <span>
            image<span className="brand-light">studio</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <Button
            variant="ghost"
            size="plain"
            className="nav-link active"
            aria-current="page"
          >
            <Grid2X2 size={14} />
            Workspace
          </Button>
          <Button
            variant="ghost"
            size="plain"
            className="nav-link"
            onClick={() => setLibrary(true)}
          >
            <FolderOpen size={14} />
            My presets
          </Button>
        </nav>
        <div className="header-right">
          <span className="local-badge">
            <span />
            100% local
          </span>
          <Separator orientation="vertical" className="header-divider" />
          <ThemeToggle />
          <IconButton
            label="Help and information"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={19} />
          </IconButton>
          <Avatar className="avatar" aria-label="Personal workspace">
            <AvatarFallback>Y</AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span />A SMALL TOOL FOR BIG IDEAS
            </div>
            <h1>
              One image. <span>Every possibility.</span>
            </h1>
            <p>
              Resize, convert, and make it yours. All in one little workspace.
            </p>
          </div>
          <div className="heading-art" aria-hidden="true">
            <span className="art-frame frame-one">
              <FileImage size={26} strokeWidth={1.3} />
            </span>
            <span className="art-frame frame-two">
              <ScanLine size={28} strokeWidth={1.3} />
            </span>
            <span className="art-spark">✦</span>
          </div>
        </div>
        <Card className="workspace-toolbar">
          <div className="workspace-title">
            <span className="workspace-icon">
              <Layers size={17} />
            </span>
            <span>{preset?.name ?? "Custom workspace"}</span>
            {s.dirty ? (
              <Tag className="unsaved-tag">Modified</Tag>
            ) : (
              <Tag>Preset</Tag>
            )}
            <span className="toolbar-dot">·</span>
            <span className="auto-save">
              <Check size={12} />
              Draft saved locally
            </span>
          </div>
          <div className="workspace-actions">
            <ActionButton
              onClick={() => setSave(true)}
              disabled={!s.outputs.length}
            >
              <Save size={14} />
              Save preset
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={() => void exportZip()}
              disabled={!canExport}
            >
              <Download size={15} />
              Export ZIP
              <ChevronDown size={13} />
            </ActionButton>
          </div>
        </Card>
        <div className="workspace-grid">
          <SourcePanel />
          <OutputsPanel />
          <PreviewPanel />
        </div>
        <footer>
          <span>
            <span className="footer-brand">
              <Layers size={13} />
              image studio
            </span>
            <span className="footer-divider">/</span>A little less busywork. A
            lot more creating.
          </span>
          <span>
            Built for your flow.
            <Leaf size={13} />
          </span>
        </footer>
      </main>
      <SavePreset open={save} onOpenChange={setSave} />
      <PresetManager open={library} onOpenChange={setLibrary} />
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="A few clicks. Every image you need."
        description="Image Studio is your private, browser-based image workspace."
      >
        <ol className="help-list">
          <li>
            <span>1</span>
            <div>
              <strong>Start with one image</strong>
              <p>
                Drop a PNG, JPEG, WebP, or AVIF into the source panel, browse
                files, or paste an image from your clipboard.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Make it your own</strong>
              <p>
                Choose a preset or add outputs. Set the size, format, quality,
                crop, background, and filename for each.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Generate, download, repeat</strong>
              <p>
                Generate enabled outputs and export them as a ZIP, or download
                one at a time. Save a preset to reuse the workflow.
              </p>
            </div>
          </li>
        </ol>
        <div className="help-note">
          <ShieldCheck size={18} />
          <p>
            Images stay in memory on your device. Presets and your working
            settings are saved in this browser. AVIF export uses a local codec;
            AVIF import depends on your browser. Quality scales vary by format.
          </p>
        </div>
      </Dialog>
      {s.notice && (
        <Alert
          role={s.notice.error ? "alert" : "status"}
          className={`toast ${s.notice.error ? "toast-error" : ""}`}
        >
          <span className="toast-icon">
            {s.notice.error ? <HelpCircle size={18} /> : <Check size={18} />}
          </span>
          <span>{s.notice.text}</span>
          <IconButton
            label="Dismiss notification"
            onClick={() => useStudio.setState({ notice: null })}
          >
            <X size={15} />
          </IconButton>
        </Alert>
      )}
      <div className="sr-only" aria-live="polite">
        {s.busy ? "Generating images" : "Image processing idle"}
      </div>
    </div>
  );
}
