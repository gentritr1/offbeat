// Usage: node scripts/qa/strip.mjs [baseUrl] [outDir]
// Every test is a real playback screenshot. Metadata locates LEDs; RGB pixels
// establish their colour, independently of the model's reported activity.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "qa-strip";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
let failed = false;
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [slug, preset, query] of [
      ["kitchen", "Kitchen disco", ""],
      ["sunday", "Sunday slow", ""],
      ["night", "Night drive", ""],
      ["shared", null, "?groove=2.120.c0000000.75"],
    ]) {
      await page.goto(`${base}/studio/${query}`, { waitUntil: "networkidle" });
      const speaker = page.locator(".studio-speaker .speaker-canvas");
      await speaker.waitFor();
      await speaker.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document.querySelector(".studio-speaker .speaker-canvas")?.dataset
            .ready === "true",
      );
      if (preset)
        await page.getByRole("button", { name: preset, exact: true }).click();
      const pattern = await page
        .locator(".track-row")
        .evaluateAll((rows) =>
          rows.map((row) =>
            Array.from(
              row.querySelectorAll(".beat-pad"),
              (pad) => pad.getAttribute("aria-pressed") === "true",
            ),
          ),
        );
      const active = Array.from({ length: 8 }, (_, step) =>
        pattern.some((row) => row[step]),
      );
      await page.locator(".play-circle").click();
      await speaker.scrollIntoViewIfNeeded();
      for (let step = 0; step < 8; step++) {
        let captured = false;
        for (let attempt = 0; attempt < 8 && !captured; attempt++) {
          await page.waitForFunction(
            (step) => {
              const speaker = document.querySelector(
                ".studio-speaker .speaker-canvas",
              );
              return (
                speaker?.dataset.step === String(step) &&
                document.querySelector(".sequencer")?.dataset.step ===
                  String(step)
              );
            },
            step,
            { timeout: 15000 },
          );
          const before = await speaker.evaluate((node) => ({
            frame: JSON.parse(node.dataset.frame),
            step: node.dataset.step,
            time: performance.now(),
          }));
          const buffer = await speaker.screenshot({ animations: "allow" });
          const after = await speaker.evaluate((node) => ({
            step: node.dataset.step,
            sequencer: document.querySelector(".sequencer").dataset.step,
            time: performance.now(),
          }));
          if (
            before.step !== after.step ||
            after.sequencer !== String(step) ||
            after.time - before.time > 180
          )
            continue;
          const colors = await page.evaluate(
            async ({ png, leds }) => {
              const image = new Image();
              image.src = `data:image/png;base64,${png}`;
              await image.decode();
              const canvas = new OffscreenCanvas(image.width, image.height),
                context = canvas.getContext("2d");
              context.drawImage(image, 0, 0);
              return leds.map(({ x, y, radius }) => {
                // Centre pixels avoid the dark bezel and antialiased circumference.
                const px = Math.max(
                    0,
                    Math.min(image.width - 1, Math.round(x)),
                  ),
                  py = Math.max(0, Math.min(image.height - 1, Math.round(y)));
                const [r, g, b] = context.getImageData(px, py, 1, 1).data;
                const color =
                  r > 170 && r > g * 1.6
                    ? "live"
                    : g > 160 && b < 130 && r > 130
                      ? "active"
                      : "off";
                return { rgb: [r, g, b], color, diameter: radius * 2, x, y };
              });
            },
            { png: buffer.toString("base64"), leds: before.frame.leds },
          );
          const expected = active.map((on, i) =>
            i === step ? "live" : on ? "active" : "off",
          );
          const ok = colors.every(
            (led, i) => led.color === expected[i] && led.diameter >= 4,
          );
          const filename = `${slug}-${width}-step-${step + 1}.png`;
          writeFileSync(`${out}/${filename}`, buffer);
          results.push({
            preset: slug,
            width,
            step,
            expected,
            pixels: colors,
            screenshot: filename,
            status: ok ? "PASS" : "FAIL",
          });
          if (!ok) failed = true;
          captured = true;
        }
        if (!captured) {
          failed = true;
          results.push({
            preset: slug,
            width,
            step,
            status: "UNVERIFIED",
            reason:
              "No screenshot fit wholly within this step; no stale frame accepted",
          });
        }
      }
      await page.locator(".play-circle").click();
    }
    if (errors.length) {
      failed = true;
      results.push({ width, errors, status: "FAIL" });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      checked: results.length,
      failures: results.filter((r) => r.status !== "PASS"),
      report: `${out}/results.json`,
    },
    null,
    2,
  ),
);
if (failed) process.exitCode = 1;
