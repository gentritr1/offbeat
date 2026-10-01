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
npm run build
```

The finished static site is in `out/`, suitable for a static host. Vercel also supports the Next.js source directly.

## Pages and interactions

- **The speaker** (`/`): custom 3D model with studio lighting, woven grille, knurled aluminum dial, and carry loop. Drag or use arrow keys to rotate; Home resets orientation. Four interpolated finishes, an exploded view, generated product photography, a finish configurator, device-local saving, shareable color links, and an FAQ.
- **By design** (`/design/`): explorable anatomy, assembled/exploded views, physical details, and concept specifications.
- **Sound studio** (`/studio/`): working eight-step Web Audio sequencer, four instruments, three presets, editable steps, tempo, volume, shuffle, and a live frequency visualizer. Audio begins only after interaction and stops when the tab is hidden.

Light and dark themes, keyboard focus, responsive layouts, reduced motion, WebGL fallback, and accessible controls are included. Theme and saved finish stay on the current device. No analytics, account, external audio service, or checkout.

## Design guidance

Applied Leonxlnx's Taste, Impeccable, UI/UX Pro Max, and Anthropic Frontend Design. The latest Taste source was retrieved directly from its GitHub repository after the npx installation was blocked by this session's network restrictions. The downloaded Taste skill and its license are included in `design-guidance/taste/`. The other downloaded skills remain in the sibling `design-skills` folder in the original workspace. See `PRODUCT.md` and `DESIGN.md` for the committed direction.

The product photograph was generated specifically for this concept. The speaker and hardware specifications are fictional portfolio content, not claims about a manufactured product.

## Verification

Production static export and TypeScript checks passed in the creation environment. A mocked Web Audio check verified instrument creation, valid presets, start, stop, scheduled-note cancellation, restart, and resource disposal. Local server startup was blocked (EPERM on listening sockets), and the browser denied local-file URLs, so browser visual QA and live audio QA could not be completed. Review at desktop and mobile widths before presenting the work as production-tested.

Publication was attempted through the Sites source workflow, but this session could not resolve the hosting repository domain. The hosting manifest retains the registered private Site identity for a later retry. No version is live.

Optional WebMCP actions expose finish selection and preset selection when supported. Unsupported browsers keep the normal UI. Their browser registration could not be validated in this environment.
