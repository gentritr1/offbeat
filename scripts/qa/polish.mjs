// Production traffic and interaction audit; no timing claims from this instrument.
// Usage: node scripts/qa/polish.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://127.0.0.1:3000";
const out = process.argv[3] || "outputs/qa-polish/audit";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const report = { pages: [], traffic: {}, checks: [] };
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.__messages = [];
      window.__workers = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          window.__workers.push(this);
          this.addEventListener("message", ({ data }) => {
            window.__messages.push({
              type: data.type,
              bytes: JSON.stringify(data).length,
              time: performance.now(),
            });
          });
        }
      };
    });
    for (const route of ["/", "/design/", "/studio/"]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForFunction(
        () =>
          document.querySelector(".speaker-canvas")?.dataset.ready === "true",
      );
      await page.waitForTimeout(1200);
      const snapshot = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        renderer: document.querySelector(".speaker-canvas").dataset.renderer,
        retainedPosters: document.querySelectorAll(
          '.speaker-canvas[data-ready="true"] .speaker-poster',
        ).length,
      }));
      report.pages.push({ width, route, ...snapshot, errors: [...errors] });
      if (route === "/" && width === 1440) {
        await page.evaluate(() => {
          window.__messages = [];
        });
        await page.waitForTimeout(500);
        report.traffic.idle = await page.evaluate(
          () => window.__messages.length,
        );
        const box = await page.locator(".speaker-canvas").first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        for (let i = 1; i <= 40; i++) {
          await page.mouse.move(
            box.x + box.width / 2 + i * 3,
            box.y + box.height / 2,
          );
          await page.waitForTimeout(16);
        }
        await page.mouse.up();
        await page.waitForTimeout(1100);
        report.traffic.drag = await page.evaluate(() => ({
          messages: window.__messages.length,
          framePayloads: window.__messages.filter((m) => m.type === "frame")
            .length,
          bytes: window.__messages.reduce((sum, m) => sum + m.bytes, 0),
        }));
      }
      if (route === "/design/") {
        await page
          .locator(".anatomy-stage")
          .screenshot({ path: `${out}/anatomy-${width}.png` });
      }
      if (route === "/studio/") {
        const slider = page.locator(".swing-dial");
        await slider.focus();
        await page.keyboard.press("Home");
        await page.locator(".speaker-canvas").scrollIntoViewIfNeeded();
        const hit = await page.locator("[data-dial-hit]").boundingBox();
        await page.mouse.move(hit.x + 24, hit.y + 24);
        await page.mouse.down();
        await page.mouse.move(hit.x + 84, hit.y + 24, { steps: 20 });
        await page.mouse.up();
        report.checks.push({
          production: true,
          width,
          action: "60px production dial drag",
          slider: Number(await slider.getAttribute("aria-valuenow")),
        });
        if (width === 1440) {
          await page.evaluate(() => {
            window.__recoveryPoster = false;
            const observer = new MutationObserver(() => {
              if (document.querySelector(".speaker-canvas .speaker-poster"))
                window.__recoveryPoster = true;
            });
            observer.observe(document.querySelector(".speaker-canvas"), {
              childList: true,
              subtree: true,
            });
            window.__workers[0].dispatchEvent(
              new ErrorEvent("error", {
                message: "QA: simulate worker failure after readiness",
                cancelable: true,
              }),
            );
          });
          await page.waitForFunction(() => {
            const node = document.querySelector(".speaker-canvas");
            return (
              node?.dataset.renderer === "main" && node.dataset.ready === "true"
            );
          });
          report.recovery = await page.evaluate(() => ({
            posterObserved: window.__recoveryPoster,
            renderer:
              document.querySelector(".speaker-canvas").dataset.renderer,
            swing: Number(
              document
                .querySelector(".swing-dial")
                .getAttribute("aria-valuenow"),
            ),
          }));
        }
      }
    }
    await page.close();
  }
  // Exercise the accessible alternative and the pointer target, both worker and fallback.
  for (const fallback of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.addInitScript((fallback) => {
      globalThis.__offbeatQA = true;
      if (fallback)
        delete HTMLCanvasElement.prototype.transferControlToOffscreen;
    }, fallback);
    await page.goto(base + "/studio/", { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
    );
    const slider = page.locator(".swing-dial");
    await slider.focus();
    await page.keyboard.press("Home");
    await page.waitForTimeout(50);
    const dial = await page.locator("[data-dial-hit]").boundingBox();
    await page.mouse.move(dial.x + 24, dial.y + 24);
    await page.mouse.down();
    await page.mouse.move(dial.x + 84, dial.y + 24, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    report.checks.push({
      fallback,
      action: "60px dial drag",
      slider: Number(await slider.getAttribute("aria-valuenow")),
      model: await page
        .locator(".speaker-canvas")
        .evaluate((n) => JSON.parse(n.dataset.frame).swing),
      hitArea: [dial.width, dial.height],
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await slider.focus();
    await page.keyboard.press("End");
    await page.waitForTimeout(50);
    report.checks.push({
      fallback,
      action: "reduced-motion keyboard End",
      slider: Number(await slider.getAttribute("aria-valuenow")),
      model: await page
        .locator(".speaker-canvas")
        .evaluate((n) => JSON.parse(n.dataset.frame).swing),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
report.status =
  report.pages.every(
    (p) => !p.overflow && !p.errors.length && !p.retainedPosters,
  ) &&
  report.traffic.idle === 0 &&
  report.checks.every((c) =>
    c.production
      ? c.slider === 60
      : c.slider === c.model &&
        c.slider === (c.action.startsWith("60") ? 60 : 75),
  ) &&
  report.recovery?.posterObserved &&
  report.recovery?.swing === 60
    ? "PASS"
    : "FAIL";
writeFileSync(`${out}/results.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
