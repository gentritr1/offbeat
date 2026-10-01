# OFFBEAT, pass 3: brief for the implementer

Self-contained. You do not need the conversation that produced it. Read `PRODUCT.md`, `DESIGN.md`, `design-guidance/taste/SKILL.md` first.

## Status (2026-10-02)

- **A (bugs): done by Claude in-session**, verified with `scripts/qa/*`. A5 is improved but not eliminated: one ~33ms frame on the first explode in production. A6, A1, A2, A3, A4, A7, A8, A9 and A10 are verified.
- **B (identity): done by Claude in-session**, awaiting the owner's screenshot approval (taste calls: typeface, copy, logo).
- **C (swing + speaker plays along): not started.** Waiting for B approval.

## Context

OFFBEAT is a portfolio concept: a fictional portable speaker with a 3D configurator (`/`), an anatomy page (`/design/`), and a working Web Audio sequencer that "presses" your beat into a WAV + PNG record sleeve (`/studio/`). Next 16, React 19, Three.js, plain CSS in `app/globals.css`.

Pass 2 could not run a browser. **Pass 3 review did** (headed and headless Chrome via Playwright, 1440x900 and 390x844, both themes, frame probes). It found real bugs that every automated gate missed, and a design that is competent but reads as a template. This pass fixes the bugs, gives the brand a real identity system, and adds one idea that makes the concept memorable.

### Design read (from the reviewer)

What already has character: the record-pressing sleeve (pattern becomes artwork), the chartreuse + vermilion pairing, the working sequencer, the honesty about being a concept.

What reads generic: zero-chroma grey neutrals, local Helvetica (Arial on Android/Windows), black pill buttons with a `translateY(-3px)` hover float, unstyled native range sliders, a three-stat strip (`24 h / 20 W / IP67`, which `PRODUCT.md` itself lists as an anti-reference: "ornamental statistics"), two near-identical chartreuse CTA bands, a bordered spec table (Taste bans it), a split headline/paragraph header on `/studio/` (Taste bans it), and stock lines ("Small speaker. Big personality.", "Life sounds better out loud.", "Ready for your next good thing.").

The bigger issue is structural. The speaker and the studio are two separate sites. The speaker never makes a sound, and the studio never shows the speaker.

**The idea that joins them:** OFFBEAT is a speaker with a tiny drum machine built in. The three top buttons and the aluminium dial on the 3D model *are* an 8-step groovebox, and the dial has a swing control. Swing is what puts a beat "off the beat" (every second step lands a little late, the way MPC / Dilla grooves feel). The brand name becomes a feature, `/studio/` becomes "try the onboard groovebox", and the pressed record becomes "save what you made on it". This is marketable, it is truthful to the concept (a groovebox can swing its own sequence; never claim the speaker re-times streamed music), and it extends later (more instruments, record a loop, pass the speaker around).

## Non-goals

- No new routes, no accounts, no backend, no analytics, no autoplay audio, no checkout.
- No new animation library (no Motion/GSAP). CSS transitions, WAAPI and the existing rAF loops are enough.
- Do not redesign the record sleeve composition. It is the best thing on the site. Extend it, as described below.
- No warm beige/cream/brass palette (Taste bans it as a default). No purple. No glassmorphism.
- No em-dashes in any visible copy (Taste section 9.G).

## Order of work and commits

1. **A: Verified bugs.** One commit. Must land first.
2. **B: Identity system.** One commit. Stop and post screenshots for owner approval before C (taste call).
3. **C: Swing + speaker plays along.** One commit per feature.

Run `npm run typecheck && npm test && npm run build` before each commit. `npm test` needs Node 22+ (`--experimental-strip-types`); the default `node` on this machine is v20 and fails with "bad option". Use `nvm use 24`.

---

## A. Verified bugs (each reproduced in pass 3 review)

| # | Bug (evidence) | Fix direction | Acceptance |
|---|---|---|---|
| A1 | **Hero 3D speaker invisible on phones.** At 390x844 `.speaker-canvas` measures **0x380**. Cause: base `.product-stage { align-self: center }`. The mobile `.hero` is a flex column and all stage children are absolutely positioned, so the stage shrinks to zero width. This has been present since the first commit. | `align-self: stretch` (or `width: 100%`) for `.product-stage` in the mobile query. | `scripts/qa/shots.mjs` prints `hero 3D host mob/*: ≥340x380`, and the mobile fold screenshot shows the speaker. |
| A2 | **3D model does not match its own swatches.** `scripts/qa/color.mjs` baseline (1440x900, lit right face median): Hot orange chroma **74%**, L +0.11; Acid yellow chroma **50%** (the brand chartreuse renders as pale butter); After hours L +0.11. Cause: ACES filmic tone mapping at exposure 1.1 plus hemisphere 2 + key 4 + env 0.75. | Switch to `THREE.NeutralToneMapping` (Khronos PBR Neutral, built for product colour fidelity), then rebalance exposure and lights. Adjust the swatch-to-material mapping only as a last resort, and document it if you do. | Same script, after: Hot orange and Acid yellow chroma ≥ 85%, \|LΔ\| ≤ 0.06, hueΔ ≤ 6°. After hours \|LΔ\| ≤ 0.06 (ignore its hue, C < 0.02). If 85% proves unreachable, report the best result from the same script and say so. Do not move the sample window. Paste before/after output in the commit message. |
| A3 | **Dark mode: light pink disc on near-black.** `finishes.ts` hard-codes light `bg` values (`#edddd6`…), used as `--finish-field` in both themes. The configurator stage shows the same problem. | Delete `bg`. Derive the field in CSS from the finish colour so it works in both themes, e.g. `color-mix(in oklch, var(--finish) 16%, var(--bg))`. Tune the percentage per theme. | Dark home fold and configurator screenshots show a tinted dark field, not a light disc. |
| A4 | **Exploded view collides with its frame.** On `/design/` the pulled-out grille overlaps the "Together / Inside" control and spills out of the grey field. On mobile the speaker is cropped. | Dolly the camera back with the same `phase` value that drives the explode, or reduce explode distances, so the whole assembly stays inside `.anatomy-field`. | Desktop and mobile `/design/` screenshots with "Inside" selected: nothing overlaps the segmented control, and no part is cropped. |
| A5 | **First explode hitches.** 41 ms unthrottled, 100 ms at 4x CPU throttle. The likely cause is shader compilation when `drivers` first becomes visible. | Call `renderer.compile(scene, camera)` once at init with drivers visible, or keep drivers visible from the start. | `scripts/qa/frames.mjs` "first explode" max < 2x frame budget unthrottled. |
| A6 | **Studio playback janks under load.** At 4x CPU throttle: 15 frames over 2x budget in 3 s, worst 66 ms. Every step calls `setStep`, which re-renders all of `SoundStudio`: 32 pads, sliders and `RecordPressing`, eight times per bar. | Take the playhead out of React state. `onStep` writes `sequencer.dataset.step` (and the label row) directly, and CSS highlights the current column. Memoise `RecordPressing` and the pad grid. | `frames.mjs` at throttle 4: "studio playing" has ≤ 3 frames over 2x budget. Print frames-vs-expected next to it. |
| A7 | **Beat pad "on" state looks like a smear.** `.beat-pad.on > span { inset: 17px }` on a non-square pad draws a stretched grey ellipse on desktop and a sliver on mobile. | Replace it with a fixed 8px round LED dot, centred. It turns vermilion on the current step (see B1). | Zoomed screenshots of desktop and mobile pads. |
| A8 | **Mobile sequencer hides steps 6-8 behind horizontal scroll.** | At ≤ 480px, move track names above each row (or use a one-letter label with `aria-label`). Pads ≥ 32 px wide x 44 px tall. | At 375 px, all 32 pads are visible with no horizontal scroll (`scrollWidth === clientWidth` on `.sequencer-scroll`). |
| A9 | **Mobile wrapping.** At 390 px the hero "Look inside" pill touches the viewport edge, and "Drag to discover" wraps to two lines. In the studio, the share icon button wraps onto its own row. | Shorten to "Drag" + an icon, or stack the row. Keep the three pressing actions on one row. | Mobile screenshots. |
| A10 | Console warning: `PCFSoftShadowMap has been deprecated`. | Use `THREE.PCFShadowMap` (or VSM if softness matters). | `shots.mjs` prints no warnings. |

---

## B. Identity system: "hi-fi hardware, not a web template"

One idea drives every rule in this section: **every control should feel like a physical part of the speaker**. Buttons are transport keys, sliders are faders, the dial is the dial. Colour has meaning, not decoration.

### B1. Colour: give each colour a job, and tint the neutrals

Pure zero-chroma greys are what make the page read clinical. Tint every neutral faintly toward the chartreuse hue (h ≈ 110, C 0.004-0.008), so the brand colours look like they belong to the material rather than being stuck on top. This is not beige.

```
light: --bg oklch(.982 .005 110)  --surface oklch(.945 .007 110)  --line oklch(.86 .008 110)
       --ink oklch(.19 .01 110)    --muted oklch(.47 .01 110)
dark:  --bg oklch(.165 .006 110)  --surface oklch(.215 .008 110)  --line oklch(.32 .01 110)
       --ink oklch(.965 .006 110)  --muted oklch(.74 .01 110)
```

Treat these as starting values. Verify the text contrast pairs (ink/bg, muted/bg, muted/surface, ink-on-primary) at WCAG AA and print the ratios in the commit.

Semantic rule (document it in `DESIGN.md`):
- **Chartreuse `--primary` = "on / touchable / yours"**: active pads, selected key, slider fill, the one primary action per view.
- **Vermilion `--accent` = "live, right now"**: the current step, the LED, the playing state, the "pressing" state. Nothing static is vermilion.
- **Ink = structure.** Text, key bodies, rules.

Add the ramp the keys need: `--primary-edge` (about L −0.18 of primary, for key travel), `--ink-edge`, `--on-primary` (#1d1f12-ish).

### B2. Typography: self-host a real typeface

`src: local("Helvetica Neue")` means Android and Windows visitors see Arial, so the brand voice disappears on those platforms. Self-host through `next/font` (build-time, no runtime third-party request; this keeps the "no external font requests" rule).

Recommendation (a taste call, so screenshot it for owner approval):
- **Archivo** (variable, `wdth` 62-125, `wght` 100-900). Headlines at `wdth` ~115 / `wght` ~760 give the record-sleeve punch. Body at `wdth` 100 / `wght` 400. Emphasis uses the same family (Taste rule).
- **A mono only for readouts**: BPM, step numbers, swing %, spec values, sleeve catalogue numbers. Martian Mono or JetBrains Mono. Never for body copy or headings.

Update the canvas texture fonts (`speaker.tsx` brand plate, `pressing.ts` sleeve) to the new face, after `document.fonts.ready`.

### B3. Buttons become transport keys

Replace the black pill with a family of keys that physically travel. Keep the pill radius (shape lock: interactive = pill, panels = 12px).

- `.key` (primary, ink body): `box-shadow: 0 3px 0 var(--ink-edge), inset 0 1px 0 oklch(1 0 0 / .12)`.
  - Hover (fine pointer only): shadow grows to 4px and `translateY(-1px)`.
  - `:active`: `translateY(3px)`, shadow 0, 90 ms `--ease-out`.
  - Release: 160 ms.
  - Remove the current `translateY(-3px)` float.
- `.key--go` (chartreuse): for the single most important action in a view (Play, Download loop). Edge `--primary-edge`, text `--on-primary`.
- `.key--flush` (replaces `.button-outline`): surface fill, 1px line border, 2px edge.
- `.key-icon` (replaces `.icon-button`): same travel, round.
- Optional LED: a 6px dot inside a key that glows vermilion only while its action is live (Play while playing, Download while pressing). This is semantic, not decorative.
- Reduced motion: no translate, keep the colour and shadow change.

Every button in the app uses this family. Grep for `.button`, `.icon-button`, `.scene-tool`, `.preset`, `.text-link` and migrate them. One shared press transition token, not per-component values.

### B4. Groups become key banks

Preset chips, the "Together / Inside" segmented control and the theme toggle become one housing with adjacent keys. The selected key sits pressed (no edge) with its LED lit chartreuse. This is a tape-deck button bank, not three floating chips.

### B5. Sliders become faders

Keep the native `<input type="range">` (for accessibility) and style it fully:
- Style both `::-webkit-slider-*` and `::-moz-range-*`.
- Track: a 4px groove, `--line`.
- Fill: chartreuse up to the value (via a CSS var set on input).
- Tick marks: tempo at 60/90/120/150.
- Thumb: a 30x18 rounded-rect fader cap, ink, with a 1px centre line in `--primary`.
- Value readouts in the mono face.

The focus ring must stay visible.

### B6. Dropdowns (FAQ, mobile menu)

- **FAQ `<details>`** currently snaps open. Add `interpolate-size: allow-keywords` plus a transition on `details::details-content` (block-size + content-visibility `allow-discrete`). Open 220 ms `--ease-out`, close 160 ms, opacity 0 → 1 on the answer with a 4px rise.
  - This is progressive enhancement: browsers without support snap, which is today's behaviour.
  - The plus/minus icon morph stays.
  - Hover on fine pointers: the row's rule line fills chartreuse left to right (`scaleX`, 200 ms).
- **Mobile menu:** reveal with `clip-path: inset(0 0 100% 0)` → `inset(0)` in 200 ms, links stagger 30 ms. Keep the existing rule of no motion for keyboard-initiated opens.

### B7. Logo mark with a meaning

Make the three bars an inline SVG where **the third bar sits lower and lands late**, so the mark itself is "off the beat".
- On fine-pointer hover, and while audio plays anywhere on the site, the bars pulse like a level meter, with the third bar lagging by 60-80 ms.
- Reduced motion: static.
- Update the favicon to match.

### B8. Layout and copy fixes (Taste violations)

- **Remove the stat strip** (`.feature-strip`). Fold the facts into copy or into the specs.
- **Specs as a record back cover**, replacing the bordered table on `/design/`.
  - "Side A": Sound, Battery, Connection, Protection. "Side B": Dimensions, Weight, Charging, Controls.
  - Mono values with dotted leaders, like a tracklist.
  - Keep `<dl>` semantics.
- **Studio header:** the split headline/paragraph header pushes the instrument below the fold at 1440x900. Make it one stacked line plus one sentence. The top of `.studio-workspace` must be ≤ 420px from the top at 1440x900.
- **Only one chartreuse band per page.** Keep it on `/` and give `/design/`'s ending a different treatment.
- **Copy rewrite** to the groovebox concept. These are examples, and copy is a taste call, so send it in the approval screenshots:
  - Hero: "A speaker with a drum machine inside." / sub: "Play your music, or make some. Three buttons, one dial, eight steps."
  - Replace "Life sounds better out loud.", "Your phone can stay in your pocket." and "Ready for your next good thing." with lines that say something specific about the object.
  - Run the Taste COPY SELF-AUDIT (section 9) on every visible string.

---

## C. Features

### C1. Swing: the "offbeat" control (studio)

- **Engine** (`lib/offbeat/audio.ts`):
  - Add `swing` (50-75, default 50 = straight). Odd steps play late by `(swing − 50) / 50 × stepDuration × 0.5`.
  - The live scheduler and offline WAV rendering must use the **same** timing function, as they already share synthesis.
- **Groove links are persisted data.** Bump the codec version.
  - **v1 links must keep decoding, with swing = 50.** Use this real v1 fixture, captured from the pre-change code (Kitchen disco, 112 BPM): `1.112.8822bb94`.
  - Malformed links still fall back without audio.
- **UI: a rotary dial styled like the 3D aluminium dial** (knurled ring, marker).
  - `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext="Swing 62 percent"`.
  - Arrows ±1, PageUp/PageDown ±5, Home → 50.
  - Vertical drag with pointer capture. Ignore extra touch points (reuse the pattern in `speaker.tsx`).
  - Value in the mono face. A small "straight · shuffle" scale.
- **Sleeve art:** dots on off-beat steps shift right in proportion to swing, so the artwork visibly shows the lateness. Do the same in the PNG export.
- **Tests:**
  - v1 fixture decodes identically.
  - v2 round-trip.
  - The timing function puts step 1 at exactly 0 and step 2 at `stepDur × (1 + (swing−50)/100)`.
  - The WAV length is unchanged by swing.

### C2. The speaker plays along (studio)

- Replace the mostly empty centre of the studio's left panel with the existing `Speaker` component (`compact` prop).
- It reacts to playback:
  - Kick: the grille + drivers push +0.04 units on z and spring back over ~120 ms.
  - Every step: the LED mesh flashes vermilion.
  - The dial mesh rotates to the swing value.
- Keep the frequency bars as a thin strip below.
- Drive it imperatively from `onStep` through a ref, never through React state (see A6). Render only while visible and playing; the existing wake/settle loop already supports this.
- Reduced motion: LED only, no pulse.

### C3 (stretch, behind `?groovebox=1` flag, default OFF)

On `/`, clicking a top button on the 3D model (raycast) plays the selected preset at low volume and the hero speaker pulses. Audio starts only on that click.

---

## Verification (the reviewer will re-run exactly this)

1. `npm run typecheck && npm test && npm run build`.
2. `node scripts/qa/shots.mjs qa-shots`, then inspect every `*-fold.png` and full page.
   - The hero 3D host line must show a non-zero width on mobile.
   - No console warnings.
3. `node scripts/qa/color.mjs`: A2 thresholds.
4. `node scripts/qa/frames.mjs` and `node scripts/qa/frames.mjs http://localhost:3000 4`. A5/A6 thresholds, with frames-vs-expected reconciled in the report.
5. Manual, and stated as done or not done:
   - Keyboard-only pass (Tab, arrows on the swing dial, Escape on the menu).
   - Reduced motion toggled live.
   - Open a **v1** groove link captured before the change.
   - Export WAV with swing 66 and listen for the shuffle and for loop seams.
6. **Device-only checks, which must be labelled UNVERIFIED unless done on a phone:** touch drag on 3D and the swing dial, iOS Safari audio unlock, real-phone frame rate.

Report format: for every A-row, state the before/after evidence (script output or screenshot path). "Looks good" and "tests pass" are not evidence.
