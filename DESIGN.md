# OFFBEAT design system

A bright listening room, an orange speaker beside a chrome record player, chartreuse fabric, and neutral studio surfaces. An industrial consumer aesthetic informed by record sleeves and physical hi-fi controls.

DESIGN_VARIANCE 8 / MOTION_INTENSITY 7 / VISUAL_DENSITY 3.

Full palette: chartreuse primary oklch(.91 .17 113), vermilion object accent oklch(.65 .21 34), neutral off-white oklch(.985 0 0), ink oklch(.20 0 0), silver oklch(.948 0 0). Dark mode swaps neutral tokens.

Typography: local Helvetica Neue, a compact heavy grotesque for the record-sleeve voice; same family for body, Arial fallback. Display 48–96px with -.04em minimum tracking, body 16–18px, labels 14px. No external font requests.

Desktop asymmetric hero with a borderless 3D canvas; mobile vertical composition. Physical rounded speaker, 12px interface panels, pill controls. Semantic layers: content 0, header 20, dialogs 40, feedback 50.

Motion: 260ms page arrival, 140ms press feedback, 180ms UI transitions, and 480ms material-field changes. Shared ease-out is cubic-bezier(.23, 1, .32, 1). Hover movement requires a fine pointer; keyboard navigation skips route/menu movement and 3D arrow-key changes apply immediately. 3D damping is frame-rate independent and stops after settling. Native scrolling. Respect reduced motion; pause WebGL offscreen and on hidden tabs; dispose resources.

Record pressing: the groove becomes the artwork. A literal vinyl sleeve uses the existing chartreuse, orange, ink, and silver identity. Active pads become full circles; silent pads become small dots. The record turns only during playback, in view, with the tab visible; reduced motion keeps it still. Exports are explicit and use browser-local audio rendering and canvas drawing. No upload, account, or audio autoplay.
