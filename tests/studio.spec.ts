import { test, expect, type Page, type Download } from "@playwright/test";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";

async function setAppearance(page: Page, name: "Light" | "Dark" | "System") {
  await page
    .getByRole("button", { name: "Choose appearance", exact: true })
    .click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

test("appearance follows the system and persists an explicit preference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await setAppearance(page, "Light");
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(
    await page.evaluate(() => localStorage.getItem("image-studio.theme")),
  ).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/light/);
  await setAppearance(page, "System");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/light/);
  await setAppearance(page, "Dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(errors).toEqual([]);
});

test("Base UI controls work with the keyboard and dark mode passes accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await setAppearance(page, "Dark");
  await expect(page.locator("select, details")).toHaveCount(0);
  const quality = page.getByRole("slider", { name: "Quality", exact: true });
  await quality.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(quality).toHaveAttribute("aria-valuenow", "84");
  const format = page.getByRole("combobox", { name: "Format", exact: true });
  await format.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("option", { name: "PNG", exact: true }),
  ).toBeVisible();
  await page.getByRole("option", { name: "PNG", exact: true }).click();
  await expect(format.locator('[data-slot="select-value"]')).toHaveText("PNG");
  await page
    .getByRole("button", { name: "More settings", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Background", exact: true }),
  ).toBeVisible();
  let report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/workspace-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Save preset", exact: true }),
  ).toBeFocused();
  await upload(page);
  await waitReady(page);
  const metadata = await sharp(await downloadSelected(page)).metadata();
  expect(metadata.format).toBe("png");
  await page.getByRole("tab", { name: "Original", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Original source image", exact: true }),
  ).toBeVisible();
});

test("crop alignment, fit modes, stretch, and no-upscaling affect real pixels", async ({
  page,
}) => {
  await page.goto("/");
  const left = await sharp({
    create: { width: 80, height: 80, channels: 4, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const buffer = await sharp({
    create: { width: 160, height: 80, channels: 4, background: "#0000ff" },
  })
    .composite([{ input: left, left: 0, top: 0 }])
    .png()
    .toBuffer();
  await page
    .getByLabel("Upload source image")
    .setInputFiles({ name: "two-colors.png", mimeType: "image/png", buffer });
  await waitReady(page);
  await page.getByLabel("Width", { exact: true }).fill("50");
  await page.getByLabel("Height", { exact: true }).fill("50");
  await chooseOption(page, "Format", "png");
  await page.getByText("More settings", { exact: true }).click();
  await chooseOption(page, "Crop alignment", "left");
  await waitReady(page);
  const red = await sharp(await downloadSelected(page))
    .extract({ left: 25, top: 25, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect([red[0], red[1], red[2]]).toEqual([255, 0, 0]);
  await chooseOption(page, "Crop alignment", "right");
  await waitReady(page);
  const blue = await sharp(await downloadSelected(page))
    .extract({ left: 25, top: 25, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect([blue[0], blue[1], blue[2]]).toEqual([0, 0, 255]);
  await chooseOption(page, "Resize mode", "fit-width");
  await waitReady(page);
  let meta = await sharp(await downloadSelected(page)).metadata();
  expect([meta.width, meta.height]).toEqual([50, 25]);
  await chooseOption(page, "Resize mode", "fit-height");
  await waitReady(page);
  meta = await sharp(await downloadSelected(page)).metadata();
  expect([meta.width, meta.height]).toEqual([100, 50]);
  await chooseOption(page, "Resize mode", "stretch");
  await waitReady(page);
  meta = await sharp(await downloadSelected(page)).metadata();
  expect([meta.width, meta.height]).toEqual([50, 50]);
  await page.getByLabel("Width", { exact: true }).fill("320");
  await page.getByLabel("Height", { exact: true }).fill("320");
  await page
    .getByRole("checkbox", { name: "Allow upscaling", exact: true })
    .uncheck();
  await waitReady(page);
  const padded = await downloadSelected(page);
  meta = await sharp(padded).metadata();
  expect([meta.width, meta.height]).toEqual([320, 320]);
  const paddedPixel = await sharp(padded)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect(paddedPixel[3]).toBe(0);
});

test("workspace and preset dialog pass accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  let report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    report.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save preset", exact: true }),
  ).toBeFocused();
});

const fixture = () =>
  sharp({
    create: {
      width: 160,
      height: 80,
      channels: 4,
      background: { r: 240, g: 80, b: 30, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
async function upload(page: Page, name = "test-image.png") {
  await page
    .getByLabel("Upload source image")
    .setInputFiles({ name, mimeType: "image/png", buffer: await fixture() });
}
async function downloaded(d: Download) {
  const path = await d.path();
  if (!path) throw new Error("Download missing");
  return readFile(path);
}
async function downloadSelected(page: Page) {
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download output", exact: true })
    .click();
  return downloaded(await promise);
}
async function waitReady(page: Page) {
  await expect(
    page.getByRole("button", { name: "Download output", exact: true }),
  ).toBeEnabled();
}

test("desktop workspace and example generate actual image files and a ZIP", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "One image. Every possibility." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Try an example" }).click();
  await waitReady(page);
  await page.getByRole("button", { name: "Generate all", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Generate all", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".ready-dot")).toHaveCount(3);
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const dl = await promise;
  expect(dl.suggestedFilename()).toBe("alpine-escape-outputs.zip");
  const entries = unzipSync(await downloaded(dl));
  expect(Object.keys(entries)).toHaveLength(3);
  for (const [name, bytes] of Object.entries(entries)) {
    const meta = await sharp(bytes).metadata();
    if (name.endsWith(".webp"))
      expect([meta.format, meta.width, meta.height]).toEqual([
        "webp",
        1920,
        1080,
      ]);
    if (name.endsWith(".jpg"))
      expect([meta.format, meta.width, meta.height]).toEqual([
        "jpeg",
        1200,
        630,
      ]);
    if (name.endsWith(".png"))
      expect([meta.format, meta.width, meta.height]).toEqual(["png", 400, 400]);
  }
  await page.screenshot({
    path: "test-results/workspace-generated.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("independent settings, aspect lock, transparent PNG, and JPEG background", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await waitReady(page);
  await page.getByLabel("Width", { exact: true }).fill("100");
  await page.getByLabel("Height", { exact: true }).fill("100");
  await chooseOption(page, "Format", "png");
  await chooseOption(page, "Resize mode", "contain");
  await waitReady(page);
  const png = await downloadSelected(page);
  const meta = await sharp(png).metadata();
  expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual([
    "png",
    100,
    100,
    true,
  ]);
  const pixel = await sharp(png).raw().toBuffer();
  expect(pixel[3]).toBe(0);
  await page.getByText("More settings", { exact: true }).click();
  await chooseOption(page, "Background", "#000000");
  await chooseOption(page, "Format", "jpeg");
  await waitReady(page);
  const jpg = await downloadSelected(page);
  expect((await sharp(jpg).metadata()).format).toBe("jpeg");
  const jp = await sharp(jpg).raw().toBuffer();
  expect(jp[0]).toBeLessThan(5);
  expect(jp[1]).toBeLessThan(5);
  expect(jp[2]).toBeLessThan(5);
  await page.getByRole("button", { name: "Lock aspect ratio" }).click();
  await page.getByLabel("Width", { exact: true }).fill("80");
  await expect(page.getByLabel("Height", { exact: true })).toHaveValue("80");
  await expect(page.locator(".output-select").nth(1)).toContainText(
    "1200 × 630",
  );
});

test("presets persist without image data, append safely, and support editing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Preset name").fill("My test workflow");
  await dialog.getByLabel("Description").fill("Reusable test settings");
  await dialog.getByRole("button", { name: "Save preset" }).click();
  await page.reload();
  await expect(page.locator(".preset-list")).toContainText("My test workflow");
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("image-studio.presets.v1")!),
  );
  expect(persisted[0].outputs).toHaveLength(3);
  expect(persisted[0].file).toBeUndefined();
  await page
    .locator(".preset-list")
    .getByRole("button", { name: "My test workflow" })
    .click();
  await page.getByRole("button", { name: "Append outputs" }).click();
  await expect(page.locator(".output-card")).toHaveCount(6);
  await page.getByRole("button", { name: "My presets", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog").last();
  await edit.getByLabel("Preset name").fill("Renamed workflow");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".managed-presets")).toContainText(
    "Renamed workflow",
  );
  await page
    .getByRole("button", {
      name: "Duplicate preset Renamed workflow",
      exact: true,
    })
    .click();
  await expect(page.locator(".managed-preset")).toHaveCount(2);
  await page
    .getByRole("button", {
      name: "Delete preset Renamed workflow",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Delete preset", exact: true })
    .click();
  await expect(page.locator(".managed-preset")).toHaveCount(1);
});

test("corrupt images, invalid imports, and malformed storage fail safely", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Upload source image").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "not supported",
  );
  await page.getByRole("button", { name: "My presets", exact: true }).click();
  await page.getByLabel("Import presets JSON").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999,"outputs":[]}'),
  });
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "not a valid version 1",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.evaluate(() =>
    localStorage.setItem("image-studio.presets.v1", "broken json"),
  );
  await page.reload();
  await expect(page.locator(".toast[role=alert]")).toContainText(
    "could not be read",
  );
  await expect(page.locator(".output-card")).toHaveCount(3);
});

test("one invalid output does not block valid files and disabled outputs are skipped", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await waitReady(page);
  await page.getByLabel("Width", { exact: true }).fill("0");
  await page
    .getByRole("checkbox", { name: "Enable Thumbnail", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Generate all", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Generate all", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".ready-dot")).toHaveCount(1);
  await expect(page.locator(".error-dot")).toHaveCount(1);
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const entries = unzipSync(await downloaded(await dl));
  expect(Object.keys(entries)).toEqual(["test-image-social-share.jpg"]);
});

test("output duplication, ordering, collision-safe ZIP names, and source replacement", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await waitReady(page);
  await page.getByText("More settings", { exact: true }).click();
  await page.getByLabel("Filename template").fill("../../same.webp");
  await page
    .getByRole("button", { name: "Actions for Website hero", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(page.locator(".output-card")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Actions for Website hero copy", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Move up", exact: true }).click();
  await expect(page.locator(".output-select").first()).toContainText(
    "Website hero copy",
  );
  await page.getByRole("button", { name: "Generate all", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Generate all", exact: true }),
  ).toBeEnabled();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const entries = unzipSync(await downloaded(await dl));
  expect(Object.keys(entries)).toHaveLength(4);
  expect(Object.keys(entries).some((n) => n.endsWith("-2.webp"))).toBeTruthy();
  expect(
    Object.keys(entries).every((n) => !n.includes("/") && !n.includes("..")),
  ).toBeTruthy();
  await upload(page, "replacement.png");
  await expect(page.locator(".output-card")).toHaveCount(4);
  await expect(page.locator(".source-file")).toContainText("replacement.png");
  await expect(page.locator(".ready-dot")).toHaveCount(0);
});

test("AVIF encoder creates a valid AVIF and jobs can be cancelled", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await waitReady(page);
  await page.getByLabel("Width", { exact: true }).fill("64");
  await page.getByLabel("Height", { exact: true }).fill("32");
  await chooseOption(page, "Format", "avif");
  await waitReady(page);
  const bytes = await downloadSelected(page);
  const meta = await sharp(bytes).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["heif", 64, 32]);
  await page.getByRole("button", { name: "Generate all", exact: true }).click();
  await page
    .getByRole("button", { name: "Cancel generation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Generate all", exact: true }),
  ).toBeEnabled();
});

test("canvas fallback works without OffscreenCanvas", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "OffscreenCanvas", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  await upload(page);
  await waitReady(page);
  const meta = await sharp(await downloadSelected(page)).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 1920, 1080]);
});

test("mobile and tablet layouts have no horizontal overflow", async ({
  page,
}) => {
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "One image. Every possibility." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/workspace-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await setAppearance(page, "Dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/workspace-mobile-dark.png",
    fullPage: true,
  });
});

async function chooseOption(page: Page, label: string, value: string) {
  const labels: Record<string, string> = {
    webp: "WebP",
    jpeg: "JPEG",
    png: "PNG",
    avif: "AVIF",
    "fit-width": "Fit width",
    "fit-height": "Fit height",
    "#000000": "Black",
    "#ffffff": "White",
    transparent: "Transparent",
    custom: "Custom color",
  };
  const name = labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1);
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
