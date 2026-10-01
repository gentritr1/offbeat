// Measures how faithfully the hero 3D speaker renders each finish colour.
// Usage: node scripts/qa/color.mjs [baseUrl]   (dev server must be running)
// Samples the median colour of the body's lit right-side face at 1440x900 and
// compares it with the swatch in OKLCH. Uses the installed Google Chrome.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklch([r, g, b]) {
  [r, g, b] = [r, g, b].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [
    L,
    Math.hypot(A, B),
    ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
  ];
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const fmt = ([L, C, H]) => `L${L.toFixed(2)} C${C.toFixed(3)} h${H.toFixed(0)}`;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.waitForFunction(
  () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
);
let failed = false;
const swatches = page.locator(".swatch");
for (let i = 0; i < (await swatches.count()); i++) {
  await swatches.nth(i).click();
  await page.waitForTimeout(1500);
  const name = await swatches.nth(i).getAttribute("aria-label");
  const want = await swatches
    .nth(i)
    .evaluate((n) => getComputedStyle(n).getPropertyValue("--swatch").trim());
  const buf = await page.screenshot({
    clip: { x: 1186, y: 390, width: 14, height: 60 },
  });
  // decode via canvas in page to avoid a PNG dependency
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const ch = [[], [], []];
    for (let k = 0; k < d.length; k += 4)
      for (let j = 0; j < 3; j++) ch[j].push(d[k + j]);
    return ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  }, buf.toString("base64"));
  const got = oklch(px),
    target = oklch(hex(want));
  const dh = Math.abs(((got[2] - target[2] + 540) % 360) - 180);
  const ratio = got[1] / target[1];
  const minimum =
    name === "Hot orange" ? 95 : name === "Acid yellow" ? 97 : null;
  if (
    minimum !== null &&
    (Math.round(ratio * 100) < minimum || Math.abs(got[0] - target[0]) > 0.04)
  )
    failed = true;
  console.log(
    `${name.padEnd(12)} swatch ${want} ${fmt(target)} | rendered #${px.map((v) => v.toString(16).padStart(2, "0")).join("")} ${fmt(got)} | chroma ${((100 * got[1]) / target[1]).toFixed(0)}% hueΔ ${dh.toFixed(0)}° LΔ ${(got[0] - target[0]).toFixed(2)}`,
  );
}
await browser.close();

if (failed) process.exitCode = 1;
