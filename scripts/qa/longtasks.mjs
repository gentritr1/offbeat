// Usage: node scripts/qa/longtasks.mjs [baseUrl]
// Navigation-time observation: includes parsing, hydration and first 3D construction.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
let failed = false;
try {
  for (const route of ["/", "/studio/"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__longFrames = [];
      window.__loafSupported = PerformanceObserver.supportedEntryTypes.includes(
        "long-animation-frame",
      );
      if (!window.__loafSupported) return;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.__longFrames.push(entry.toJSON());
      }).observe({ type: "long-animation-frame", buffered: true });
    });
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(6000);
    const result = await page.evaluate(() => {
      const loaded = performance.getEntriesByType("navigation")[0].loadEventEnd;
      const entries = window.__longFrames.filter(
        (entry) => entry.startTime <= loaded + 6000,
      );
      return {
        supported: window.__loafSupported,
        entries,
        renderer:
          document.querySelector(".speaker-canvas")?.dataset.renderer ||
          "unavailable",
        ready:
          document.querySelector(".speaker-canvas")?.dataset.ready === "true",
      };
    });
    if (!result.supported) {
      console.log(
        JSON.stringify({
          route,
          status: "UNVERIFIED",
          reason: "Long Animation Frame API unavailable",
        }),
      );
      failed = true;
    } else {
      const longest = result.entries.reduce(
        (best, entry) =>
          !best || entry.duration > best.duration ? entry : best,
        null,
      );
      const longestBlock = Math.max(
        0,
        ...result.entries.map((entry) => entry.blockingDuration || 0),
      );
      const passes =
        (!longest || longest.duration <= 50) &&
        !errors.length &&
        result.ready &&
        result.renderer !== "unavailable";
      console.log(
        JSON.stringify(
          {
            route,
            renderer: result.renderer,
            ready: result.ready,
            observation: "navigation through 6s after load",
            loafCount: result.entries.length,
            longestFrameMs: longest?.duration ?? null,
            longestBlockingMs: longestBlock,
            longest:
              longest || "No frames at or above the API's 50ms threshold",
            errors,
            status: passes ? "PASS" : "FAIL",
          },
          null,
          2,
        ),
      );
      if (!passes) failed = true;
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failed) process.exitCode = 1;
