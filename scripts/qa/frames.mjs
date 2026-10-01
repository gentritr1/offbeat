// Usage: node scripts/qa/frames.mjs [baseUrl] [cpuThrottle]
// One RAF clock measures both sample intervals and duration; missing display
// slots reconcile actual frame count with expected, rather than host wall time.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3000";
const throttle = Number(process.argv[3] || 1);
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--window-position=-2400,0"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  if (throttle > 1)
    await (
      await page.context().newCDPSession(page)
    ).send("Emulation.setCPUThrottlingRate", { rate: throttle });
  const budget = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last;
        function tick(now) {
          if (last !== undefined) times.push(now - last);
          last = now;
          if (times.length < 90) requestAnimationFrame(tick);
          else {
            times.sort((a, b) => a - b);
            resolve(times[45]);
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  async function start() {
    await page.evaluate(() => {
      const generation = (window.__probeGeneration =
        (window.__probeGeneration || 0) + 1);
      window.__probeFrames = [];
      let last;
      function tick(now) {
        if (window.__probeGeneration !== generation) return;
        if (last !== undefined) window.__probeFrames.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  async function stop(label) {
    const frames = await page.evaluate(() => {
      window.__probeGeneration++;
      return window.__probeFrames;
    });
    if (!frames.length)
      throw new Error(`${label}: no RAF samples; cannot report a pass`);
    const sorted = [...frames].sort((a, b) => a - b),
      duration = frames.reduce((a, b) => a + b, 0);
    const percentile = (p) =>
      Number(sorted[Math.floor(p * (sorted.length - 1))].toFixed(2));
    const expected = Math.round(duration / budget);
    const missedSlots = frames.reduce(
      (count, ms) => count + Math.max(0, Math.round(ms / budget) - 1),
      0,
    );
    const residual = expected - frames.length - missedSlots;
    const over = frames.filter((ms) => ms > budget * 2).length;
    const reconciles = Math.abs(residual) <= Math.max(2, expected * 0.02);
    console.log(
      JSON.stringify({
        label,
        throttle,
        hz: Number((1000 / budget).toFixed(2)),
        durationMs: Number(duration.toFixed(2)),
        frames: frames.length,
        expected,
        missedSlots,
        reconciliationResidual: residual,
        reconciles,
        p50: percentile(0.5),
        p95: percentile(0.95),
        maxFrameMs: Number(sorted.at(-1).toFixed(2)),
        framesOver2xBudget: over,
        status: reconciles && over === 0 ? "PASS" : "FAIL",
      }),
    );
    if (!reconciles || over) process.exitCode = 1;
  }
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
  );
  await page.waitForTimeout(4000);
  const box = await page.locator(".speaker-canvas").first().boundingBox();
  await start();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 120; i++) {
    await page.mouse.move(
      box.x + box.width / 2 + Math.sin(i / 10) * 200,
      box.y + box.height / 2,
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await stop("3D drag");
  await start();
  await page.click(".scene-tool");
  await page.waitForTimeout(1200);
  await stop("first explode");
  await page.goto(base + "/studio/", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
  );
  await page.click(".play-circle");
  await page.waitForTimeout(400);
  await start();
  await page.waitForTimeout(3000);
  await stop("studio playing");
  await page.locator(".record-pressing").scrollIntoViewIfNeeded();
  await start();
  await page.waitForTimeout(2000);
  await stop("vinyl + playing");
} finally {
  await browser.close();
}
