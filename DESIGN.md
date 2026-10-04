# OFFBEAT design system

A bright listening room, an orange speaker beside a chrome record player, chartreuse fabric, and neutral studio surfaces. An industrial consumer aesthetic informed by record sleeves and physical hi-fi controls.

DESIGN_VARIANCE 8 / MOTION_INTENSITY 7 / VISUAL_DENSITY 3.

Full palette: chartreuse primary oklch(.91 .17 113), vermilion object accent oklch(.65 .21 34), neutral off-white oklch(.985 0 0), ink oklch(.20 0 0), silver oklch(.948 0 0). Dark mode swaps neutral tokens.

Typography: Archivo (variable, self-hosted by next/font at build time, no runtime font requests). Headings are set wide and heavy (font-stretch 112%, weight 720), the record-sleeve voice. Martian Mono is used only for numeric readouts (BPM, step numbers, spec values). The hero headline is sized from its measured width (widest line = 8.68x font size) so it always stays on two lines.

Colour has a job. Chartreuse = on / touchable / yours (active pads, chosen key, fader fill, the one main action per view). Vermilion = live, right now (playhead, LEDs, playing state, the late bar in the logo). Ink = structure. Neutrals carry a faint chartreuse tint (hue 110, chroma 0.005-0.014) so the brand colours belong to the material. Every token pair passes WCAG AA in both themes.

Controls are hardware. Buttons are transport keys that travel (3px edge, 90ms down, 160ms release); `.button-go` is the chartreuse key; `.button-outline` is the flush key. Preset and view choices are key banks: adjacent keys in one housing, the chosen key sits pressed with its LED lit. Range inputs are faders with a fader cap, tick marks and a chartreuse fill. The big play key latches down while playing. Pads travel 2px.

Swing is the brand idea made literal: the speaker's knurled dial pushes every off-beat step late by (swing - 50) / 50 of a step (50 = straight, ~66 = triplet shuffle, 75 = limit). One timing function (`stepTime`) drives live playback, the playhead, the WAV export and the sleeve art, where off-beat dots visibly sit late. The dial is a `role="slider"` with arrow, PageUp/PageDown, Home/End keys and drag; it turns immediately (no easing) because it is direct manipulation. Straight grooves keep the v1 link format; swung grooves use v2.

The speaker plays along in the studio. Each step reaches it imperatively (never through React state): a kick squashes the body 4% with the feet planted and recovers in about 120ms, any note flashes the LED vermilion, and the dial turns with swing. Motion is specified in pixels at render size, not as constants: about 6-9px on a 218px speaker.

The first 3D implementation stage adds eight recessed step lights: chartreuse for a programmed step, vermilion for the playhead, including silent steps. The three keys follow kick, snare, and hi-hat/bass with 90ms press and 160ms release envelopes. Scheduled audio and hardware receive the same captured track mask. Pattern changes reach the renderer only on edits; beat callbacks do not update React state.

The physical dial shares the studio's swing state and six-pixel-per-percent gesture with the accessible 2D slider. Its 48px pointer target follows the projected dial centre, captures the primary pointer, and ignores secondary pointers. The model turns one degree per percent with an interruptible spring capped at 120ms. Keyboard input and reduced motion apply immediately. Rendered travel, target size, and timing still require the browser evidence listed in `docs/3D-REVIEW.md`.

Scene construction and drawing run in one OffscreenCanvas worker where supported, with the same renderer available on the main thread as fallback. Knurling and step lights use instancing, fixed enclosure meshes are merged by material, and geometry, materials and the PMREM source are reference-counted across canvases. A filtered contact texture replaces the real-time shadow. The first-frame opacity transition is 180ms and 26 exact-render posters cover the four finishes and responsive stages. Diagnostic projections and frame messages only run under QA; production sends the studio dial position only when it moves. The printed brand mark uses mipmapped linear sampling to remain legible when minified.

The detached grille moves aside to reveal the drivers; mobile framing keeps the full assembly in view. Cones begin behind the closed grille. Explode settles by 550ms of renderer time, collapse by 350ms; interruption preserves the current position and retargets. Keyboard and reduced-motion selection remain immediate. Named part views restore their reference orientation after free orbit. These are refinements to the existing single-phase anatomy view, not the later staged assembly feature.

The logo is a level meter whose third (vermilion) bar lands late: time runs left to right, so it sits off the grid. While audio plays, the bars pulse at the real tempo (--beat) with the late bar 80ms behind.

Desktop asymmetric hero with a borderless 3D canvas; mobile vertical composition. Physical rounded speaker, 12px interface panels, pill controls. Semantic layers: content 0, header 20, dialogs 40, feedback 50.

Motion: 260ms page arrival, 90ms key down / 160ms release, 180ms UI transitions, and 480ms material-field changes. FAQ answers ease open (220ms) and closed (160ms) via ::details-content where supported. The mobile menu wipes down with clip-path, links staggered 30ms. Shared ease-out is cubic-bezier(.23, 1, .32, 1). Hover movement requires a fine pointer; keyboard navigation skips route/menu movement and 3D arrow-key changes apply immediately. 3D damping is frame-rate independent and stops after settling. Native scrolling. Respect reduced motion; pause WebGL offscreen and on hidden tabs; dispose resources.

Record pressing: the groove becomes the artwork. A literal vinyl sleeve uses the existing chartreuse, orange, ink, and silver identity. Active pads become full circles; silent pads become small dots. The record turns only during playback, in view, with the tab visible; reduced motion keeps it still. Exports are explicit and use browser-local audio rendering and canvas drawing. No upload, account, or audio autoplay.
