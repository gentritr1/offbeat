// Regression probe: an idle renderer must not spend the sleep interval on its
// first animated frame. Also reject negative phases from mixed clock readings.
// Usage: node scripts/qa/motion-onset.mjs [baseUrl]
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() => {
    globalThis.__offbeatQA = true;
  });
  await page.goto((process.argv[2] || "http://127.0.0.1:3000") + "/", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => document.querySelector(".speaker-canvas")?.dataset.ready === "true",
  );
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__phases = [];
    document
      .querySelector(".speaker-canvas")
      .addEventListener("speakerframe", ({ detail }) =>
        window.__phases.push(detail.phase),
      );
  });
  await page.locator(".scene-tool").click();
  await page.waitForTimeout(700);
  const phases = await page.evaluate(() => window.__phases);
  const valid =
    phases.length > 2 &&
    phases.every(
      (value, index) =>
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1 &&
        (index === 0 || value >= phases[index - 1]),
    );
  const status =
    valid && phases[0] < 0.3 && phases.at(-1) === 1 ? "PASS" : "FAIL";
  console.log(
    JSON.stringify({
      firstPhases: phases.slice(0, 5),
      finalPhase: phases.at(-1),
      valid,
      status,
    }),
  );
  if (status !== "PASS") process.exitCode = 1;
} finally {
  await browser.close();
}
