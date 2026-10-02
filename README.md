# OFFBEAT

An interactive portfolio concept for a portable audio brand. Built with **Next.js 16, React 19, TypeScript, and Three.js**.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To create the static production site:

```sh
npm run typecheck
npm test
npm run build
```

The finished static site is in `out/`, suitable for a static host. Vercel also supports the Next.js source directly.

## Pages and interactions

- **The speaker** (`/`): custom 3D model with studio lighting, woven grille, knurled aluminum dial, and carry loop. Drag or use arrow keys to rotate; Home resets orientation. Four interpolated finishes, an exploded view, generated product photography, a finish configurator, device-local saving, shareable color links, and an FAQ.
- **By design** (`/design/`): explorable anatomy, assembled/exploded views, physical details, and concept specifications.
- **Sound studio** (`/studio/`): working eight-step Web Audio sequencer, four instruments, three presets, editable steps, tempo, volume, shuffle, and a live frequency visualizer. Name your record, share the exact groove through a compact URL, download a four-bar WAV loop, and save a 1600px PNG sleeve whose artwork reflects your pattern. The vinyl turns during playback when visible. Audio begins only after interaction and stops when the tab is hidden.

Light and dark themes, keyboard focus, responsive layouts, reduced motion, WebGL fallback, and accessible controls are included. 3D and the idle visualizer render only while needed. Movement respects live preference changes; mobile navigation supports Escape, focus restoration, and outside dismissal. Theme and saved finish stay on the current device. Clipboard failures reveal selectable links. No analytics, account, external audio service, or checkout.

## Design guidance

Applied Leonxlnx's Taste, Impeccable, UI/UX Pro Max, and Anthropic Frontend Design. The latest Taste source was retrieved directly from its GitHub repository after the npx installation was blocked by this session's network restrictions. The downloaded Taste skill and its license are included in `design-guidance/taste/`. The other downloaded skills remain in the sibling `design-skills` folder in the original workspace. The polish pass also applies the installed Emil design-engineering guidance. See `PRODUCT.md`, `DESIGN.md`, and `REVIEW.md` for the direction and findings. A requested Opus 5.5 CLI consultation could not run because Claude CLI was not installed or cached; no Opus review is claimed.

The product photograph was generated specifically for this concept. The speaker and hardware specifications are fictional portfolio content, not claims about a manufactured product.

## Verification

For the current review, see `POLISH-REVIEW.md`; `3D-REVIEW.md` retains the earlier checkpoint history. Browser QA now exercises the production export, including worker and main-thread rendering, keyboard/reduced-motion controls, 390/768/1440px layouts, and the hardware strip. The 26 exact-render posters have been generated. `scripts/qa/polish.mjs` checks production worker traffic and interactions; `scripts/qa/anatomy.mjs` records and measures explode/collapse and interruption. The original brief's later bass-excursion/material work remains separate from this polish pass.

Node 24 typecheck, 13 tests, and the production static export pass. Tests cover shared pad positions, malformed links, PCM WAV structure, audio lifecycle/scheduling, swing timing, gesture mapping and springs. The initial creation session could not launch a local server/browser; the later Chrome review now covers the rendered pages and 3D controls. Strict frame-budget checks still have failures, and audible loop seams, real-phone touch/iOS audio and browser export paths need their own checks. See the current report for exact coverage rather than treating a build pass as visual or device approval.

The hosting manifest retains the registered owner-private Site identity. Publish the static `out/` export with that same identity; Sites deployment status is authoritative for the current live version. See `POLISH-REVIEW.md` for the resumed review and measured limits.

Optional WebMCP actions expose finish selection and preset selection when supported. Unsupported browsers keep the normal UI. Their browser registration could not be validated in this environment.
