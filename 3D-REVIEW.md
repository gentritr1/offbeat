# OFFBEAT 3D — implementation checkpoint, items 0–2

Status: implemented in source, awaiting browser verification. This is not motion approval or a claim that the performance targets are met. `3D-BRIEF.md` explicitly requests a stop for owner review after item 2. Items 3–5 remain unchanged.

## Before and after

The before measurements below were supplied in the brief (Chrome, M-series Mac, 120Hz). They were not reproduced in this restricted session. An unavailable result is not zero and is not a pass.

| Item / metric | Before, supplied | After, this session | Instrument and why it exercises the behaviour |
|---|---|---|---|
| 0 — longest home/studio main-thread block | 189ms / ~264ms | **UNVERIFIED** | `longtasks.mjs` installs a Long Animation Frame observer before navigation and records through six seconds after load. Reports longest frame, blocking duration, attribution, renderer mode and first-frame readiness. No reported entries means none above the API's 50ms threshold, not a measured 0ms maximum. |
| 0 — drag frame pacing at 1x and 4x | p95 9.2ms; 0 frames >2× budget | **UNVERIFIED** | `frames.mjs` performs pointer drags under CDP CPU throttling. One RAF clock supplies sample intervals, duration, expected display slots, missed slots and reconciliation residual; output includes maximum and strictly >2×-budget frame counts. |
| 0 — studio playback, 4x | 0 frames >2× budget | **UNVERIFIED** | Same instrument, after a real Play-button gesture, with the speaker visible and receiving beats. Worker rendering still needs visual review alongside this main-thread RAF probe. |
| 0 — first explode | One ~33ms frame | **UNVERIFIED** | `frames.mjs` measures the first user-triggered explode after the initial scene loads. It includes the first-use path. |
| 0 / 5 — colour fidelity | Orange 95% chroma; yellow 97%; absolute ΔL ≤0.04 | **UNVERIFIED** | `color.mjs` retains the original lit-face sampling rectangle and OKLCH comparison. Its gate uses the supplied rounded percentage precision. Lighting and tone mapping are retained, but the shared environment upload and removed shadow must be checked in pixels. |
| 0 — exact-render poster | No exact-render poster | **INCOMPLETE: 0 assets captured** | `posters.mjs` requests an actual WebGL canvas snapshot for each finish/stage at 390 and 1440, writes content-hashed WebP assets and a manifest. Browser capture is blocked; the current empty manifest intentionally uses the existing photograph. The 180ms opacity hand-off exists, but exact-render fidelity has not been delivered. |
| 1 — strip / sequencer agreement | No eight-step strip | **UNVERIFIED** | `strip.mjs` captures all eight steps for all three presets and `2.120.c0000000.75`, at both 390 and 1440: 64 requested captures. Expected states come from 2D pad `aria-pressed` values. It classifies actual screenshot RGB pixels at projected LED centres and rejects screenshots that straddle a step. |
| 1 — LED diameter ≥4px, key travel ≥2px | Neither measured; body squash alone was 5px sampled / ~8.7px peak | **UNVERIFIED** | The strip report includes projected LED diameter. This is a geometry estimate, not an independent raster-width measurement. Key travel is scaled from camera projection, but its actual visible travel and possible occlusion require a rendered measurement. The old body-squash result does not establish key travel. |
| 2 — 60px drag adds 10; values agree | Physical dial was display-only | Pure gesture test: **60px → +10**. Browser interaction: **UNVERIFIED** | `review.mjs` performs a real 60px 3D drag and compares the accessible slider value with the completed renderer's swing value. It also records the actual hit rectangle; source specifies 48×48px. Pointer capture / secondary-pointer handling still need device verification. |
| 2 — detent settles within 120ms | Existing damped display rotation | Pure spring tests at **60/120Hz pass**; rendered settling **UNVERIFIED** | Unit tests exercise the exact spring with velocity-preserving retargeting. At 120ms the position error is <0.1% of a one-degree step and overshoot <10%. This does not measure compositor frames or perceptual feel. |
| 2 — visible late off-beat | No hardware playhead | **UNVERIFIED; no recording generated** | `review.mjs` records six seconds each at swing 50 and 75, then a 3D drag. Completed-render arrival intervals are reported against 250/250ms and 375/125ms at 120BPM. The video, not timing arithmetic alone, must show the lateness. |
| 3 — analyser-driven excursion and design-page loop | Not implemented | **Deferred at checkpoint** | Requires real low-band energy, silence and reduced-motion checks; the design-page audio recording is not included in this stage's recorder. |
| 4 — staged anatomy, framing, labels | Single-phase explode; existing detail rotation | **Deferred at checkpoint** | Requires rendered explode/collapse timing and label collision checks at 390/768/1440. |
| 5 — material / texture upgrade | Existing procedural materials | **Deferred at checkpoint** | No KTX2 or material-fidelity claim. The current weave remains a bump texture. |
| Real phone — dial touch, iOS audio, frame rate | No result supplied | **UNVERIFIED** | Desktop automation is not a real-phone test. |

## What changed

- One worker owns scene instances and receives serializable state/input messages. Unsupported worker/canvas combinations use the main-thread renderer. Context loss preserves the photograph fallback. Visibility gating, live reduced-motion handling and disposal remain.
- 48 individual notch meshes become one instanced draw. The eight step sockets and eight diffusers each use one instanced draw. These are source-level structural counts, not measured frame-time improvements.
- Shared resources are reference-counted. PMREM is built once per resource-pool lifetime and copied into a CPU-backed half-float texture so separate WebGL contexts can upload it safely. Instance-specific finish colours remain independent.
- Audio scheduling captures each step's track mask alongside its sound; the same scheduled callback sends `{step, tracks}` to the hardware. Silent steps advance the light too. Stopping clears the playhead and key response.
- Both swing inputs update the same React value, using the same drag law. Beat traffic remains imperative. Keyboard changes skip the spring. No tick sound was added.

## Checks completed and blockers

On Node v24.18.0: TypeScript check, 13 tests and the production static export pass. Tests cover groove encoding, audio scheduling, queued track masks, swing timing/export, the shared gesture and spring integration. These do not verify WebGL, audible output, visual quality or performance.

`longtasks.mjs` was attempted and stopped at `chromium.launch`: Chrome exited with SIGABRT; cleanup reported `kill EPERM`. The earlier screenshot baseline failed at the same browser boundary. Local server startup also failed with `listen EPERM` on `127.0.0.1:3000`. No alternate route around these restrictions was used. The remaining browser instruments have only syntax validation; no screenshot, colour, frame, strip or recording result is claimed.

## Reproduce on an unrestricted machine

```sh
nvm use 24
npm run typecheck && npm test && npm run build
npx serve out -l 3000
```

With that production server running, in another terminal:

```sh
node scripts/qa/posters.mjs http://localhost:3000
npm run build
node scripts/qa/shots.mjs qa-shots
node scripts/qa/color.mjs
node scripts/qa/frames.mjs http://localhost:3000
node scripts/qa/frames.mjs http://localhost:3000 4
node scripts/qa/longtasks.mjs
node scripts/qa/strip.mjs
node scripts/qa/review.mjs
```

Chrome must be installed for the scripts' `channel: "chrome"`; recording also needs Playwright's video encoder. Rebuild after poster capture, since the asset manifest is imported at build time. Inspect every generated screenshot and the recording, verify actual LED/key pixel sizes, fill the after column with measured results, and check on a real phone before requesting the owner's feel approval. This checkpoint is not yet ready to approve.
