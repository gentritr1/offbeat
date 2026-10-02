// Usage: node scripts/qa/strip.mjs [baseUrl] [outDir]
// Every test is a real playback screenshot. Metadata locates LEDs; RGB pixels
// establish their colour, independently of the model's reported activity.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "qa-strip";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args:
    process.env.OFFBEAT_FAKE_AUDIO === "1" ? ["--disable-audio-output"] : [],
});
const results = [];
let failed = false;
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 1,
    });
    // Per-frame speaker diagnostics are only emitted when this flag is set before load.
    await page.addInitScript(() => {
      globalThis.__offbeatQA = true;
    });
    const errors = [];
    const capture = await page.context().newCDPSession(page);
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
          await page.evaluate(() => new Promise(requestAnimationFrame));
          const before = await speaker.evaluate((node) => ({
            frame: JSON.parse(node.dataset.frame),
            step: node.dataset.step,
            time: performance.now(),
            clip: {
              x: Math.floor(node.getBoundingClientRect().x + scrollX),
              y: Math.floor(node.getBoundingClientRect().y + scrollY),
              width:
                Math.ceil(node.getBoundingClientRect().right + scrollX) -
                Math.floor(node.getBoundingClientRect().x + scrollX),
              height:
                Math.ceil(node.getBoundingClientRect().bottom + scrollY) -
                Math.floor(node.getBoundingClientRect().y + scrollY),
              scale: 1,
            },
            mapping: {
              scaleX: node.getBoundingClientRect().width / node.clientWidth,
              scaleY: node.getBoundingClientRect().height / node.clientHeight,
              offsetX: (node.getBoundingClientRect().x + scrollX) % 1,
              offsetY: (node.getBoundingClientRect().y + scrollY) % 1,
            },
          }));
          // Capture the already-visible, stable host directly. Locator screenshot
          // adds scroll/layout waits that can consume an entire 125ms off-beat.
          const shot = await capture.send("Page.captureScreenshot", {
            format: "png",
            clip: before.clip,
            fromSurface: true,
            captureBeyondViewport: false,
          });
          const buffer = Buffer.from(shot.data, "base64");
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
            async ({ png, leds, mapping }) => {
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
                    Math.min(
                      image.width - 1,
                      Math.round(x * mapping.scaleX + mapping.offsetX),
                    ),
                  ),
                  py = Math.max(
                    0,
                    Math.min(
                      image.height - 1,
                      Math.round(y * mapping.scaleY + mapping.offsetY),
                    ),
                  );
                // Fractional CSS bounds and screenshot cropping can put the rounded
                // centre on an antialiased edge. Sample the brightest pixel in a
                // fixed central 3x3 patch, independent of the expected LED state.
                let rgb = [0, 0, 0];
                for (let dy = -1; dy <= 1; dy++)
                  for (let dx = -1; dx <= 1; dx++) {
                    const sample = Array.from(
                      context.getImageData(
                        Math.max(0, Math.min(image.width - 1, px + dx)),
                        Math.max(0, Math.min(image.height - 1, py + dy)),
                        1,
                        1,
                      ).data,
                    ).slice(0, 3);
                    if (Math.max(...sample) > Math.max(...rgb)) rgb = sample;
                  }
                const [r, g, b] = rgb;
                const color =
                  r > 170 && r > g * 1.6
                    ? "live"
                    : g > 160 && b < 130 && r > 130
                      ? "active"
                      : "off";
                return {
                  rgb,
                  color,
                  diameter: radius * 2,
                  x,
                  y,
                  sample: "brightest central 3x3 pixel",
                };
              });
            },
            {
              png: buffer.toString("base64"),
              leds: before.frame.leds,
              mapping: before.mapping,
            },
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
      audioOutput:
        process.env.OFFBEAT_FAKE_AUDIO === "1"
          ? "silent timer-driven output"
          : "system",
      failures: results.filter((r) => r.status !== "PASS"),
      report: `${out}/results.json`,
    },
    null,
    2,
  ),
);
if (failed) process.exitCode = 1;
