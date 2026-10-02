# OFFBEAT polish review — 2 October 2026

## Resumed completion — 2 October, afternoon

Continued from `7669a73`. The saved prior changes were intact. This follow-up fixes an additional visible motion discontinuity and closes the remaining LED/key raster measurement gap in part. It does **not** claim the cold first-opening performance issue is solved.

- **Fixed idle-to-motion jump:** an idle renderer used its stale previous-frame timestamp, spending the 40ms clamp on the first animated frame. Opening jumped directly to phase **0.42879 (43%)**. Resetting the clock when waking, while preserving it during continuous animation, starts at **0**, then advances normally. Non-negative elapsed time also handles RAF frame-start timestamps that precede the wake call. `scripts/qa/motion-onset.mjs` verifies bounded, monotonic phases and completion.
- **Opening/closing:** input-to-last-frame **566/364ms**. Interrupted opening returns assembled in **363ms** after the reversal; all coordinates finite. Keyboard opening takes one frame, **8ms**. Latest recording: `docs/qa/resume-2026-10-02/anatomy.webm`.
- **Pixel evidence:** `scripts/qa/hardware.mjs` uses projections only to locate windows, then measures real screenshot pixels. All eight illuminated LEDs measure **5–7px at 390**, **5–7px at 768**, and **6–9px at 1440**. Snare and hat/bass keys show **2px upper-edge movement at all three widths**; the untouched kick key stays at 0px as a control. The check sends controlled worker beats and freezes the rendered pose near peak press; it is not an audio-sync test. Independent kick-key travel with whole-body squash remains unmeasured.
- **Interactions:** all 9 route/width checks pass with no overflow, errors or retained loading posters. 60px dial drag produces swing 60 in both render paths; keyboard/reduced-motion End produces 75; worker failure restores the poster and recovers while preserving swing. No idle or home-drag diagnostic messages in production.
- **Performance, final repeat:** at 1×, drag/playback/vinyl maximum **9.4/9.4/9.3ms**; at 4×, **9.4/9.3/9.3ms**, with zero frames over twice the budget in those samples. Every final sample reconciles its frame count. **First opening still fails:** one **57.5ms** frame at 1× and one **75.1ms** frame at 4×. Earlier fresh runs reached 9.3ms, demonstrating variability, not a consistent fix. No repeated-until-pass result replaces these failures.
- **Build:** typecheck, 13 unit tests, and production static export pass. Model geometry/materials/poster poses are unchanged, so the prior colour/64-step checks remain the applicable evidence. This pass retains the previous load-frame limitation; it does not relabel it a pass.

Raw results and six hardware screenshots are committed under `docs/qa/resume-2026-10-02/`. Chrome on this Mac at 120Hz; playback performance uses the explicitly silent timer-driven output. Real-phone touch, iOS audio, audible loop seams, the separate analyser/material feature stages, and owner motion-feel approval remain outside the verified result.

## Previous saved pass

The existing product direction is coherent: Archivo/Martian Mono typography, chartreuse for programmed steps, vermilion for the live playhead, physical controls, and restrained motion. This pass preserves that direction and improves the 3D implementation. The result is a stronger portfolio demo, but it does **not** meet every strict performance gate consistently. Cold first-explode timing remains variable; real-phone and audible checks remain unverified.

Compared against `bc26841`, using the local production export, Chrome 154.0.8037.97 on the Mac, Node 24.18.0, and 390/768/1440px viewports. Playback measurements explicitly use `OFFBEAT_FAKE_AUDIO=1`: Web Audio runs with a timer-driven silent output. That exercises scheduling and visuals, not the speakers or iOS audio stack.

## Changes and reasons

| Before | After | Why |
|---|---|---|
| A short home drag sent 94 unused worker frame payloads, 89,528 serialized bytes | 0 frame payloads / 0 bytes in the same probe | Production no longer computes or transfers QA-only LED/key projections. Only the studio receives a projected dial position, and only when it changes. |
| Each rounded box used 1,452 triangles | 588 triangles, 59.5% fewer per rounded box | Three bevel segments retain the silhouette at the actual display sizes. The assembled model reports 11,848 triangles / 17 draws; exploded 17,608 / 25. These are geometry/draw counts, not a promised FPS improvement. |
| Three full enclosure matrix traversals for key projection on every frame | Enclosure transform only; pressed keys project two points | Removes repeated work during ordinary orbit and idle-key frames. LED instance colours upload only when the pattern/playhead changes. |
| The exploded grille obscured the drivers | Grille moves aside; both drivers are identifiable; mobile camera includes the whole assembly | The exploded view explains the internal components. Screenshots at all three widths verify the final framing. |
| Driver cones could appear through the grille as explode began | Closed cones start 0.32 model units farther back | Prevents an impossible intersection during the opening transition; the final open position is unchanged. |
| Explode/collapse used the same long exponential tail | Renderer settles by 550/350ms; measured input-to-last-frame 562/363ms | Faster closure and a bounded finish improve responsiveness. Reversal ends assembled without invalid projected coordinates. Keyboard selection takes one frame, measured 7ms from input. |
| First-use warm-up drew a scissored corner pixel that missed the driver surfaces | Actual driver fragments draw behind the loading poster, followed by the final view in the same callback | Exercises the GPU path before a visitor opens the object. It does **not** eliminate every cold-start stall; see measurements below. |
| The printed mark inherited DataTexture's nearest sampling and no mipmaps | Linear/mipmapped sampling and modest anisotropy; contact shadow also uses linear filtering | Restores smooth minification for small lettering and avoids blocky sampling in the soft shadow. |
| A renderer restart after readiness could leave a blank stage | Poster returns while the main-thread fallback initializes; old fade timers are cancelled | A simulated worker failure after interaction preserved swing 60, showed the poster, and recovered to a ready main-thread renderer. |
| Existing posters represented the old geometry/pose | 26 regenerated, hashed WebP posters, 7,750–24,406 bytes each | First-frame imagery matches the optimized model and revised anatomy framing. Obsolete generated assets were replaced. |

## Measured results

All raw summaries are saved in `docs/qa/polish-2026-10-02.json`. Screenshots, individual LED captures and recordings are in `outputs/qa-polish/` locally.

| Check / instrument | Before this pass | After | Interpretation |
|---|---|---|---|
| 4× drag, `frames.mjs` | p95 9.9ms; max 17.2ms; 1 frame >2× budget | Latest: p95 9.2ms; max 9.4ms; 0 >2× | Continuous drag is within budget in the latest run. Other runs recorded occasional slower frames; this is not a universal guarantee. |
| 4× studio playback, same instrument | p95 9.8ms; max 10.3ms; 0 >2× | Latest: p95 9.1ms; max 9.4ms; 0 >2× | Real playhead advancement is checked before measuring, so a stalled audio clock cannot pass as playback. |
| 4× first explode | Max 67.3ms; 1 >2× | Repeat runs on the final application build ranged from 16.9 to 83ms; latest 16.9ms, 1 >2× | **Not consistently fixed.** The last result is much better, but the worst run remains unacceptable under the strict gate. |
| 1× interaction timing | Supplied historical p95 9.2ms | Latest p95 9.1–9.2ms; no >2× frames in those samples | One studio sample fails frame-count reconciliation by 3 slots. It remains flagged FAIL rather than hiding calibration/pacing uncertainty. |
| Frame accounting | Original calibration used about:blank and allowed 2% residual | Calibrates on the loaded page; reports actual/expected/missed slots with a maximum residual of 2 | All latest 4× samples reconcile. One latest 1× studio sample does not. RAF is a main-thread cadence probe, not direct GPU-present timing. |
| Load LoAF, `longtasks.mjs` | No ≥50ms entries in the fresh baseline run | Home 54.2ms / studio 61.5ms navigation frames; both 0ms blocking duration | **Whole-frame gate fails.** Attribution points to app bootstrap scripts (23.9/21.4ms script durations), not a proven 3D construction block. Zero blocking duration does not mean the whole page took 0ms. |
| Colour, `color.mjs` | Orange 95%, yellow 97% chroma; ΔL 0.03/0.02 | Orange 96%, yellow 97%; ΔL 0.03/0.02 | Pass: body fidelity is no worse than the supplied baseline. |
| Step lights, `strip.mjs` | Prior checkpoint reported 64/64 | **64/64 PASS** in this pass | Actual screenshot colours match all three presets and `2.120.c0000000.75`, every step, at 390 and 1440px. |
| Dial, `polish.mjs` / `review.mjs` | 60px → +10; 48×48px target | Same in production at 390/768/1440, in QA mode, and in main-thread fallback | Both input paths remain synchronized; reduced-motion keyboard End produces 75 in UI and renderer. |
| Swing arrivals, `review.mjs` | Prior checkpoint: 252/249ms straight, 376/126ms swung | 250.1/250.1ms at 50; 374.7/119.7ms at 75 | The off-beat delay is visible and driven by the audio schedule. These are median completed-render arrivals, subject to frame/message latency, not acoustic measurements. |
| Layout and loading, `polish.mjs` | 9 route/width cases passed | 9/9 pass; no horizontal overflow; no retained posters on ready stages; 0 idle worker messages | Confirms the lighter production path and page layout. |
| Theme screenshots, `shots.mjs` | No console errors | All 3 pages, 390/1440, both themes; no console errors or warnings | Reviewed the rendered product, mobile framing and page composition. |

Typecheck, all 13 unit tests and the production build pass on Node 24.18.0. Unit tests cover shared grooves, queued audio masks, swing scheduling/export, drag mapping and spring integration; they do not substitute for the browser measurements above.

## QA corrections

- LED screenshots now preserve the existing viewport. An experimental capture-beyond-viewport path changed rendering during capture and was rejected; its failures are not treated as product evidence.
- Capture uses the stable speaker rectangle directly, accounts for fractional CSS-to-pixel offsets, and samples a fixed central 3×3 patch independent of the expected LED state. This avoids classifying a visibly red light as off because one sampled pixel fell on its antialiased rim.
- A capture is still rejected if the step changes across it. No stale screenshot is accepted to manufacture a pass.
- The frame probe averages the loaded page's cadence instead of using a rounded median from about:blank. Failed reconciliation and over-budget frames still fail the script.

## Review recordings and remaining limits

- `outputs/qa-polish/anatomy-release/anatomy.webm`: open, close, interrupted open, keyboard selection and reduced-motion closure.
- `outputs/qa-polish/studio-release/studio-swing-and-dial.webm`: swing 50, swing 75 and a 60px physical dial drag. Silent output, not an audible review.
- Real-phone touch, iOS Safari audio, mobile GPU pacing and listening by ear: **UNVERIFIED**.
- LED colour checks use real screenshot pixels. Reported LED diameters are projected geometry estimates; independent raster-width and ≥2px key-travel measurements are still outstanding.
- Owner approval of motion feel remains pending. Analyser-driven cones/radiator, the design-page audio loop, fully staged assembly/labels, and the later KTX2/material pass are not claimed as completed here.

To reproduce against `out/`, start a static server on port 3000, then run the scripts with `http://127.0.0.1:3000`. Set `OFFBEAT_FAKE_AUDIO=1` only when intentionally testing silent, timer-driven playback; omit it when checking the actual audio device. The project keeps its existing colours, typography, page structure, routes, reduced-motion handling and photo fallback. No runtime dependency was added.
