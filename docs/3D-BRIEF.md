# OFFBEAT: brief for a 3D specialist

You are a senior real-time 3D designer-engineer (Three.js, materials, motion, GPU performance). This brief is self-contained. Read `PRODUCT.md`, `DESIGN.md` and `components/offbeat/speaker.tsx` before you start.

## The one idea

OFFBEAT is a fictional portable speaker **with a drum machine inside**: three step keys, one knurled dial, and a **swing** control that pushes every off-beat a little late. That lateness is what the name means.

The website already explains this in words and in 2D UI (a step sequencer, a swing dial, a record sleeve whose dots sit late). **Your job is to make the object itself carry the idea**, so a visitor understands the product by watching and touching it, not by reading.

Every motion you add must answer "what does this explain?" If the honest answer is "it looks nice", cut it.

## What exists today (do not regress it)

- **Component:** `components/offbeat/speaker.tsx`. One procedural model (no GLB), used in four places:
  - hero `/` (finish + explode);
  - `/design/` (explode + per-detail rotation);
  - the configurator on `/` (`compact`);
  - `/studio/` (`compact`, `zoom={1.3}`, plays along with the beat).
- **Public API:** `color`, `exploded`, `rotation`, `compact`, `zoom`, `swing` (50-75), and `pulse` (a ref receiving `{ hit(kick: boolean) }`).
  - The studio calls `hit` from its audio step callback. It never re-renders React per beat, and you must keep it that way.
  - Extend the API. Do not move beat data into React state.
- **Model:**
  - RoundedBox body 4.25 × 2.62 × 1.7, canvas-woven fabric grille, canvas brand plate.
  - Knurled aluminium dial: a `dialGroup` of 1 cylinder + **48 separate notch meshes**, plus a marker. It rotates with swing.
  - Three top keys (boxes), an LED sphere, a passive radiator on the back, feet, a tube strap.
  - Drivers (plate, surround, cone, cap) are only visible when exploded.
- **Rendering:**
  - On-demand: it renders only while something is settling, with frame-rate-independent damping.
  - It is gated by IntersectionObserver and `document.hidden`, and the scene is built only when the canvas nears the viewport.
  - Lighting: RoomEnvironment PMREM, hemisphere + key (1024 PCF shadow) + fill + rim, `NeutralToneMapping`, exposure 1.
  - DPR is capped at 1.75. On context loss it falls back to `/images/listening-room.webp`, and everything is disposed on unmount.
- **Beat response today:**
  - A kick squashes the body 4% with the feet planted, recovering in about 120ms.
  - Any note flashes the LED vermilion.
  - Reduced motion keeps the colour and drops the squash.
- **Brand rules you must follow:**
  - Chartreuse `#d6ef43` = on / yours. Vermilion `#ee512d` = live, right now. Ink = structure.
  - Motion tokens: 90ms key down, 160ms release, `cubic-bezier(.23,1,.32,1)` ease-out.
  - Keyboard-initiated changes apply immediately, with no animation.

### Measured baselines (Chrome, M-series Mac, 120 Hz; production build unless noted)

| Metric | Value | Instrument |
|---|---|---|
| Home load: longest main-thread block | 189 ms | long-animation-frame observer, 6 s after load |
| Studio load: longest main-thread block | ~264 ms (3D scene build) | same |
| 3D drag, 1x and 4x CPU throttle | p95 9.2 ms, 0 frames > 2x budget | `scripts/qa/frames.mjs` |
| Studio playback with speaker pulsing, 4x throttle | 0 frames > 2x budget | `scripts/qa/frames.mjs` |
| First "Look inside" (prod) | one ~33 ms frame, cause not attributed | `scripts/qa/frames.mjs` |
| Finish colour fidelity (lit face vs swatch) | Hot orange chroma 95%, Acid yellow 97%, \|ΔL\| ≤ 0.04 | `scripts/qa/color.mjs` |
| Studio speaker size / kick squash | 218 px tall; top edge drops up to 5 px sampled (~8.7 px peak) | screenshot silhouette probe |

## Work, in priority order

Each item states the meaning it adds. Do them in order and stop for owner review after item 2.

### 0. Performance foundation (do first; everything else spends this budget)

- Replace the 48 notch meshes with one `InstancedMesh`, or a normal-mapped knurl. Merge static geometry per material.
- Replace the real-time PCF shadow with a baked or blurred contact shadow under the feet. Keep it grounded and soft.
- **Move scene construction and rendering off the main thread**:
  - Use `OffscreenCanvas` + a worker where `transferControlToOffscreen` exists; keep the current path as fallback.
  - Pointer and keyboard input stay on the main thread and are posted to the worker.
- Share PMREM, geometry and materials across instances on a page instead of rebuilding them per canvas.
- Show a poster image of the exact render until the first WebGL frame, then crossfade (≤ 180 ms, opacity only), so no empty colour disc ever shows.
- **Targets:**
  - Longest main-thread block from 3D on `/` and `/studio/` ≤ 50 ms.
  - 3D drag and studio playback: 0 frames > 2x budget at 4x CPU throttle.
  - Colour fidelity numbers no worse than the baseline.

### 1. The drum machine, visible: a step strip on the object

**Meaning:** the visitor sees their own pattern living in the hardware.

- Add a row of 8 small step LEDs along the top front edge, physically plausible: recessed, with a diffuser.
- Active steps glow chartreuse at low intensity. The current step glows vermilion.
- The three top keys depress 1.5-2 mm (scaled) when their track fires: key 1 kick, key 2 snare, key 3 hi-hat/bass. Each takes 90 ms down and 160 ms back.
- **Data path:**
  - Extend `pulse` to `hit({ step, tracks: boolean[] })`.
  - Pass the pattern via a ref or a `setPattern` method, never as a per-beat prop.
  - The studio already has `playStep(step)` in `components/offbeat/sound-studio.tsx`.
- **Targets:**
  - At studio size, each step LED is ≥ 4 px in diameter.
  - The current-step LED is unambiguous in a screenshot at 390 px viewport width.
  - Key travel is ≥ 2 px on screen.
  - The strip matches the 2D sequencer exactly for all 3 presets and a shared link (`/studio/?groove=2.120.c0000000.75`).

### 2. Swing you can touch: the 3D dial is the control

**Meaning:** the brand idea ("a little late") is a physical gesture on the product, not a widget beside it.

- On `/studio/`, dragging the 3D dial sets swing. This is the same state as the 2D `SwingDial` (`components/offbeat/swing-dial.tsx`), and both stay in sync.
- Add a 1° detent per percent, with a tiny overshoot-and-settle (spring, ≤ 120 ms).
- Optional: a soft mechanical tick through the existing Web Audio context. It is created only after a user gesture and is silent when muted.
- Keep keyboard access through the existing 2D slider. The 3D dial is an alternative input, not a replacement.
- The playhead LED from item 1 should *visibly* arrive late on off-beats as swing rises, because it is driven by the same `stepTime` timing.
- **Targets:**
  - Dragging the dial 60 px changes swing by the same amount as the 2D dial: +10.
  - The 2D and 3D values never disagree.
  - Hit area ≥ 44 × 44 px.
  - Ignore secondary pointers; use pointer capture.

### 3. Bass you can see: the passive radiator and drivers move with the audio

**Meaning:** "two drivers and a passive radiator" stops being a spec line.

- Drive the passive radiator (back) and, when exploded, the driver cones from the real `AnalyserNode` low-band energy. That's `engine.current.analyser` in the studio; expose a getter rather than polling React.
- Excursion is physically plausible: largest on kick/bass, none on hi-hat.
- On `/design/` with "Inside" selected, add a "Play a loop" key that plays the Kitchen disco preset at low volume. Audio starts only on that press, and the cones move.
- **Targets:**
  - Cone excursion ≥ 3 px on screen at design-page size on a kick.
  - Zero movement when the analyser band is silent.
  - Reduced motion: no excursion. Show a ring that brightens with level instead (colour only).

### 4. Anatomy as a sequence, not a jump

**Meaning:** the exploded view explains how the object is assembled.

- Stage the explode: grille first, then drivers, then the radiator, staggered 40-60 ms, interruptible (springs, not keyframes). Collapse is faster than explode.
- When an anatomy item is chosen on `/design/` (drivers, dial, enclosure), the camera eases to frame that part.
- Labels are anchored to 3D points, projected to DOM elements, so they stay accessible and selectable. A leader line follows the part during rotation.
- **Targets:**
  - The labels' DOM text exactly matches the anatomy copy.
  - Labels never overlap at 390, 768 or 1440 px.
  - Explode completes in ≤ 600 ms, collapse ≤ 400 ms.
  - Keyboard selection changes the view immediately (no camera tween).

### 5. Materials that read as real, not rendered

Only after 0-4.

- Soft-touch rubber body (low clearcoat, slight sheen).
- Fabric weave as a real normal map, not a canvas bump.
- Anodised aluminium with anisotropy on the dial.
- The brand plate printed with slight ink spread.
- Textures: KTX2, ≤ 1024 px, hashed filenames.
- If you author a GLB instead of procedural geometry: ≤ 600 KB after meshopt/Draco, hashed filename, served `Cache-Control: public, max-age=31536000, immutable`.
- **Target:** colour fidelity stays within the baseline; `scripts/qa/color.mjs` must still pass.

## Non-goals

- No bloom, particles, glitter, floating idle animation, auto-rotation, or scroll-jacked camera paths. Nothing moves unless the visitor or the music causes it.
- No change to brand colours, typography, page layout or copy outside the 3D stage and its labels.
- No autoplay audio. No new routes. No analytics. No new heavy dependencies beyond `three` and its examples.
- Do not slow the finish change: it is frequent. Keep it a fast colour settle (≤ 480 ms), not a show.
- Do not remove the photo fallback, reduced-motion handling, visibility gating, or disposal.

## Verification (the reviewer will run exactly this)

1. `nvm use 24 && npm run typecheck && npm test && npm run build`. Node 22+ is required for the tests.
2. `node scripts/qa/shots.mjs qa-shots`: every page at 1440 and 390, both themes, no console errors.
3. `node scripts/qa/color.mjs`: fidelity no worse than the baseline.
4. `node scripts/qa/frames.mjs <url>` and `node scripts/qa/frames.mjs <url> 4` against a production build (`npx serve out` or any static server):
   - frame counts must reconcile with `expected`;
   - report max frame and frames > 2x budget.
5. **Add `scripts/qa/longtasks.mjs`.** It records long-animation-frame entries for 6 s after load on `/` and `/studio/` and prints the longest. Target ≤ 50 ms.
6. **Add `scripts/qa/strip.mjs`.** For each preset and the shared link above, it screenshots the speaker every step and checks that the lit step LEDs match the 2D pattern and playhead.
7. A screen recording of:
   - the studio playing at swing 50 and at 75 (the late off-beat must be visible on the object);
   - a 3D dial drag;
   - the design-page explode with "Play a loop".
   The owner approves feel from this recording. Numbers alone do not close a motion task.
8. Device check, labelled UNVERIFIED unless done on a real phone: touch drag of the 3D dial, iOS Safari audio, frame rate.

**Report format:** for each item, give before/after numbers from the scripts above, and say why that instrument exercises the behaviour. "Looks great" and "tests pass" are not evidence.
