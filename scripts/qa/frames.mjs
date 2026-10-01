// Frame-interval probe for the heavy interactions. Headed Chrome (off-screen) so the GPU composites.
// Usage: node scripts/qa/frames.mjs [baseUrl] [cpuThrottle]
// Always read `frames` against `expected` before trusting a percentile: the display may be 60 or 120 Hz.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const throttle = Number(process.argv[3] || 1);
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--autoplay-policy=no-user-gesture-required", "--window-position=-2400,0"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
if (throttle > 1) (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: throttle });
const hz = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => (++n < 60 ? requestAnimationFrame(f) : r(Math.round(60000 / (performance.now() - t0)))); requestAnimationFrame(f); }));
// Each probe gets its own generation so a previous loop can never keep sampling into the next one.
const start = () => page.evaluate(() => { const gen = (window.__gen = (window.__gen || 0) + 1); window.__f = []; let last = performance.now(); const tick = (t) => { if (window.__gen !== gen) return; window.__f.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
async function stop(label, t0) {
  const secs = (Date.now() - t0) / 1000;
  const f = await page.evaluate(() => { window.__gen++; return window.__f.slice(2); });
  const s = [...f].sort((a, b) => a - b), p = (q) => s[Math.floor(q * (s.length - 1))].toFixed(1);
  const budget = 1000 / hz;
  console.log(`${label}: frames=${f.length} expected≈${Math.round(secs * hz)} @${hz}Hz p50=${p(0.5)} p95=${p(0.95)} max=${s.at(-1).toFixed(1)}ms  >2×budget=${f.filter((x) => x > budget * 2 + 1).length}`);
}
await page.goto(base + "/", { waitUntil: "networkidle" });
// Let load-time work finish, or its tail is misattributed to the first interaction.
await page.waitForTimeout(4000);
const box = await page.locator(".speaker-canvas").first().boundingBox();
let t0 = Date.now(); await start();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
for (let i = 0; i < 120; i++) { await page.mouse.move(box.x + box.width / 2 + Math.sin(i / 10) * 200, box.y + box.height / 2); await page.waitForTimeout(16); }
await page.mouse.up(); await stop("3D drag", t0);
t0 = Date.now(); await start(); await page.click(".scene-tool"); await page.waitForTimeout(1200); await stop("first explode", t0);
await page.goto(base + "/studio/", { waitUntil: "networkidle" }); await page.waitForTimeout(800);
await page.click(".play-circle"); await page.waitForTimeout(400);
t0 = Date.now(); await start(); await page.waitForTimeout(3000); await stop("studio playing", t0);
await page.locator(".record-pressing").scrollIntoViewIfNeeded();
t0 = Date.now(); await start(); await page.waitForTimeout(2000); await stop("vinyl + playing", t0);
await browser.close();
