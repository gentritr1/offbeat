// Controlled render measurement, not an audio-timing test.
// Set all LEDs on, trigger snare/hat only (no whole-body kick squash), then
// freeze after the mechanical press. Pixels establish widths and upper edges;
// diagnostic projections locate the sampling windows only. Key 1 is a control.
// Usage: node scripts/qa/hardware.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:3000";
const out = process.argv[3] || "outputs/qa-hardware";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 1,
    });
    await page.addInitScript(() => {
      globalThis.__offbeatQA = true;
      const Native = Worker;
      window.Worker = class extends Native {
        constructor(...args) {
          super(...args);
          window.__qaWorker = this;
        }
        postMessage(data, ...args) {
          if (data.type === "init") window.__qaId = data.id;
          return super.postMessage(data, ...args);
        }
      };
    });
    await page.goto(base + "/studio/", { waitUntil: "networkidle" });
    const host = page.locator(".studio-speaker .speaker-canvas");
    await host.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
    );
    await page.waitForTimeout(500);
    await page.evaluate(() =>
      window.__qaWorker.postMessage({
        id: window.__qaId,
        type: "pattern",
        pattern: Array.from({ length: 4 }, () => Array(8).fill(true)),
      }),
    );
    await page.waitForTimeout(100);
    const before = await host.evaluate((n) => JSON.parse(n.dataset.frame));
    const rest = await host.screenshot({ path: `${out}/${width}-rest.png` });
    await page.evaluate(() => {
      const n = document.querySelector(".speaker-canvas");
      const start = performance.now();
      const listen = ({ detail }) => {
        if (performance.now() - start >= 78) {
          window.__qaWorker.postMessage({
            id: window.__qaId,
            type: "state",
            state: { visible: false },
          });
          n.removeEventListener("speakerframe", listen);
          window.__frozen = true;
        }
      };
      n.addEventListener("speakerframe", listen);
      window.__qaWorker.postMessage({
        id: window.__qaId,
        type: "beat",
        beat: { step: 0, tracks: [false, true, true, false] },
      });
    });
    await page.waitForFunction(() => window.__frozen);
    await page.waitForTimeout(80);
    const after = await host.evaluate((n) => JSON.parse(n.dataset.frame));
    const pressed = await host.screenshot({
      path: `${out}/${width}-pressed.png`,
    });
    const raster = await page.evaluate(
      async ({ rest, pressed, before }) => {
        async function pixels(data) {
          const img = new Image();
          img.src = "data:image/png;base64," + data;
          await img.decode();
          const c = new OffscreenCanvas(img.width, img.height),
            ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return ctx;
        }
        const a = await pixels(rest),
          b = await pixels(pressed);
        const keyEdge = (ctx, p) => {
          const x = Math.round(p.x),
            y = Math.round(p.y);
          for (let yy = y - 8; yy <= y + 9; yy++) {
            let dark = 0;
            for (let xx = x - 3; xx <= x + 3; xx++)
              if (
                Math.max(...ctx.getImageData(xx, yy, 1, 1).data.slice(0, 3)) <
                100
              )
                dark++;
            if (dark >= 4) return yy;
          }
          return null;
        };
        const keyTravel = before.keys.map((p) => {
          const y0 = keyEdge(a, p),
            y1 = keyEdge(b, p);
          return y0 === null || y1 === null ? null : y1 - y0;
        });
        const ledWidths = before.leds.map((p) => {
          const x = Math.round(p.x),
            y = Math.round(p.y),
            xs = [];
          for (let yy = y - 6; yy <= y + 6; yy++)
            for (let xx = x - 6; xx <= x + 6; xx++) {
              const [r, g, bl] = a.getImageData(xx, yy, 1, 1).data;
              if (g > 120 && r > 90 && bl < g * 0.65) xs.push(xx);
            }
          return xs.length ? Math.max(...xs) - Math.min(...xs) + 1 : 0;
        });
        return {
          keyTravel,
          ledWidths,
          status:
            keyTravel[0] === 0 &&
            keyTravel.slice(1).every((n) => n >= 2) &&
            ledWidths.every((n) => n >= 4)
              ? "PASS"
              : "FAIL",
        };
      },
      {
        rest: rest.toString("base64"),
        pressed: pressed.toString("base64"),
        before,
      },
    );
    results.push({ width, before, after, raster });
    await page.close();
  }
  writeFileSync(`${out}/frames.json`, JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      results.map((r) => ({
        width: r.width,
        keys: r.before.keys.map((p, i) => ({
          x: p.x,
          y: p.y,
          dx: r.after.keys[i].x - p.x,
          dy: r.after.keys[i].y - p.y,
        })),
        raster: r.raster,
      })),
      null,
      2,
    ),
  );
  if (results.some((r) => r.raster.status !== "PASS")) process.exitCode = 1;
} finally {
  await browser.close();
}
