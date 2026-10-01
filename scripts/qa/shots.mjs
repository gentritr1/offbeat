// Full-page + fold screenshots of every route at 1440x900 and 390x844, light and dark.
// Usage: node scripts/qa/shots.mjs [outDir] [baseUrl]   (dev server must be running)
// Also prints console errors/warnings and the hero 3D host size per width.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const out = process.argv[2] || "qa-shots";
const base = process.argv[3] || "http://localhost:3000";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const logs = [];
for (const [name, width, height] of [["desk", 1440, 900], ["mob", 390, 844]]) {
  for (const colorScheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
    const page = await ctx.newPage();
    page.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(`${name}/${colorScheme} ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`${name}/${colorScheme} PAGEERROR ${e.message}`));
    for (const route of ["/", "/design/", "/studio/"]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const slug = route === "/" ? "home" : route.replaceAll("/", "");
      if (route === "/") {
        const size = await page.evaluate(() => {
          const r = document.querySelector(".speaker-canvas")?.getBoundingClientRect();
          return r ? `${Math.round(r.width)}x${Math.round(r.height)}` : "missing";
        });
        console.log(`hero 3D host ${name}/${colorScheme}: ${size}`);
      }
      await page.screenshot({ path: `${out}/${slug}-${name}-${colorScheme}-fold.png` });
      await page.screenshot({ path: `${out}/${slug}-${name}-${colorScheme}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
console.log([...new Set(logs)].join("\n") || "no console errors or warnings");
await browser.close();
