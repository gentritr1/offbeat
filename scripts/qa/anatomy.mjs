// Render-completion sequence, interruption, keyboard and reduced-motion checks.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:3000";
const out = process.argv[3] || "outputs/qa-polish/anatomy";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: out, size: { width: 1440, height: 900 } },
  });
  await page.addInitScript(() => {
    globalThis.__offbeatQA = true;
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
  );
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__motion = [];
    document.querySelector(".scene-tool").addEventListener("click", () => {
      window.__inputAt = performance.now();
    });
    document
      .querySelector(".speaker-canvas")
      .addEventListener("speakerframe", ({ detail }) =>
        window.__motion.push({ ...detail, time: performance.now() }),
      );
  });
  async function result(label) {
    const { frames, inputAt } = await page.evaluate(() => ({
      frames: window.__motion,
      inputAt: window.__inputAt,
    }));
    const last = frames.at(-1);
    results.push({
      label,
      frames: frames.length,
      inputToLastFrameMs: last ? last.time - inputAt : null,
      settleSpanMs: frames.length > 1 ? last.time - frames[0].time : 0,
      triangles: last?.triangles,
      drawCalls: last?.drawCalls,
      phase: last?.phase,
      finite: frames.every((f) =>
        [...f.leds, ...f.keys, f.dial].every(
          (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
        ),
      ),
    });
  }
  const toggle = page.locator(".scene-tool");
  for (const label of ["explode", "collapse"]) {
    await page.evaluate(() => {
      window.__motion = [];
    });
    await toggle.click();
    await page.waitForTimeout(1000);
    await result(label);
    await page
      .locator(".product-stage")
      .screenshot({ path: `${out}/${label}.png` });
  }
  await page.evaluate(() => {
    window.__motion = [];
  });
  await toggle.click();
  await page.waitForTimeout(120);
  await toggle.click();
  await page.waitForTimeout(450);
  await result("interrupted explode returns assembled");
  await page.evaluate(() => {
    window.__motion = [];
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await result("keyboard explode");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    window.__motion = [];
  });
  await toggle.click();
  await page.waitForTimeout(100);
  await result("reduced-motion collapse");
  const video = page.video();
  await page.close();
  await video.saveAs(`${out}/anatomy.webm`);
  // Actual rendered part views must be independent of a preceding manual orbit.
  for (const width of [390, 768, 1440]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } });
    await p.goto(base + "/design/", { waitUntil: "networkidle" });
    await p.waitForFunction(
      () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
    );
    await p
      .locator(".anatomy-stage")
      .screenshot({ path: `${out}/design-${width}.png` });
    await p.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (
  results.some(
    (r) =>
      !r.finite ||
      r.phase !==
        (r.label === "explode" || r.label === "keyboard explode" ? 1 : 0),
  ) ||
  results.find((r) => r.label === "explode").inputToLastFrameMs > 600 ||
  results.find((r) => r.label === "collapse").inputToLastFrameMs > 400 ||
  results.find((r) => r.label === "keyboard explode").frames !== 1
)
  process.exitCode = 1;
