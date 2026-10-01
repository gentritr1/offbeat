// Capture exact transparent WebGL renders for the first-frame poster.
// Usage: node scripts/qa/posters.mjs [baseUrl], then rebuild to embed the manifest.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const base = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const colors = ["#ee512d", "#d6ef43", "#e5e5dc", "#333738"];
const slugs = ["hot-orange", "acid-yellow", "chalk", "after-hours"];
const manifest = {};
mkdirSync("public/images/speaker-posters", { recursive: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 1,
    });
    for (let i = 0; i < colors.length; i++) {
      await page.goto(`${base}/?color=${slugs[i]}`, {
        waitUntil: "networkidle",
      });
      for (const [variant, selector] of [
        ["hero", ".product-stage"],
        ["compact", ".config-stage"],
      ])
        await capture(page, variant, selector, colors[i], width);
      await page.evaluate(
        (i) => localStorage.setItem("offbeat-finish", String(i)),
        i,
      );
      await page.goto(base + "/studio/", { waitUntil: "networkidle" });
      await capture(page, "studio", ".studio-speaker", colors[i], width);
    }
    await page.goto(base + "/design/", { waitUntil: "networkidle" });
    await capture(page, "design", ".anatomy-stage", colors[0], width);
    await page.close();
  }
  writeFileSync(
    "lib/offbeat/three/posters.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    `Captured ${Object.keys(manifest).length} exact-render posters. Rebuild before screenshot QA.`,
  );
} finally {
  await browser.close();
}
async function capture(page, variant, selector, color, width) {
  const node = page.locator(selector + " .speaker-canvas");
  await node.scrollIntoViewIfNeeded();
  await node.waitFor({ state: "visible" });
  await page.waitForFunction(
    (selector) =>
      document.querySelector(selector + " .speaker-canvas")?.dataset.ready ===
      "true",
    selector,
  );
  await page.waitForTimeout(1000);
  const bytes = await node.evaluate(
    (node) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Poster capture timed out")),
          10000,
        );
        node.addEventListener(
          "speakerposter",
          async (event) => {
            clearTimeout(timeout);
            resolve(
              Array.from(new Uint8Array(await event.detail.arrayBuffer())),
            );
          },
          { once: true },
        );
        node.dispatchEvent(new Event("speakersnapshot"));
      }),
  );
  const buffer = Buffer.from(bytes),
    hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16),
    name = `speaker-${hash}.webp`;
  writeFileSync(`public/images/speaker-posters/${name}`, buffer);
  manifest[`${variant}:${color}:${width}`] = `/images/speaker-posters/${name}`;
}
