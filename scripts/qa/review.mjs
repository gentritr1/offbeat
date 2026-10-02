// Stage 0-2 owner-review recording. Usage: node scripts/qa/review.mjs [baseUrl] [outDir]
// Playwright's video encoder must be installed. This intentionally makes no
// claim about the design-page audio demonstration, which belongs to stage 3.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "qa-review";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: out, size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  // Per-frame speaker diagnostics are only emitted when this flag is set before load.
  await page.addInitScript(() => { globalThis.__offbeatQA = true; });
  await page.goto(base + "/studio/?groove=2.120.c0000000.50", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
  );
  await page.evaluate(() => {
    window.__arrivals = [];
    const speaker = document.querySelector(".speaker-canvas");
    let previous = -1;
    speaker.addEventListener("speakerframe", ({ detail }) => {
      if (detail.step < 0 || detail.step === previous) return;
      previous = detail.step;
      window.__arrivals.push({
        step: detail.step,
        swing: detail.swing,
        time: performance.now(),
      });
    });
  });
  await page.locator(".play-circle").click();
  await page.waitForTimeout(6000);
  await page.locator(".swing-dial").focus();
  await page.keyboard.press("End");
  await page.waitForTimeout(6000);
  await page.keyboard.press("Home");
  const dial = await page.locator("[data-dial-hit]").boundingBox();
  await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    dial.x + dial.width / 2 + 60,
    dial.y + dial.height / 2,
    { steps: 30 },
  );
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const value = Number(
    await page.locator(".swing-dial").getAttribute("aria-valuenow"),
  );
  const rendered = await page
    .locator(".speaker-canvas")
    .evaluate((node) => JSON.parse(node.dataset.frame).swing);
  const arrivals = await page.evaluate(() => window.__arrivals);
  const timing = [50, 75].map((swing) => {
    const groups = { onToOff: [], offToOn: [] };
    for (let i = 1; i < arrivals.length; i++) {
      const before = arrivals[i - 1],
        after = arrivals[i];
      if (
        before.swing !== swing ||
        after.swing !== swing ||
        (before.step + 1) % 8 !== after.step
      )
        continue;
      groups[after.step % 2 ? "onToOff" : "offToOn"].push(
        after.time - before.time,
      );
    }
    const median = (values) =>
      values.length
        ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
        : null;
    return {
      swing,
      observedMedianMs: {
        onToOff: median(groups.onToOff),
        offToOn: median(groups.offToOn),
      },
      expectedMsAt120Bpm:
        swing === 50
          ? { onToOff: 250, offToOn: 250 }
          : { onToOff: 375, offToOn: 125 },
      samples: {
        onToOff: groups.onToOff.length,
        offToOn: groups.offToOn.length,
      },
      note: "Arrival of completed worker renders; includes presentation/message latency. Assess visible lateness in the recording.",
    };
  });
  const result = {
    dragPx: 60,
    start: 50,
    slider: value,
    model: rendered,
    hitArea: { width: dial.width, height: dial.height },
    arrivals,
    timing,
    status:
      value === 60 && rendered === 60 && dial.width >= 44 && dial.height >= 44
        ? "PASS"
        : "FAIL",
    device: "UNVERIFIED: desktop browser recording is not a real-phone test",
  };
  await page.locator(".play-circle").click();
  await page.waitForTimeout(500);
  const video = page.video();
  await context.close();
  await video.saveAs(`${out}/studio-swing-and-dial.webm`);
  writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "PASS") process.exitCode = 1;
} finally {
  await browser.close();
}
