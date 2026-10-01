/** One shared gesture law for the physical dial and its keyboard-accessible counterpart. */
export function swingFromDrag(from: number, dx: number, dy: number) {
  return Math.max(50, Math.min(75, Math.round(from + (dx - dy) / 6)));
}
export function activeSteps(pattern: boolean[][]) {
  return Array.from({ length: 8 }, (_, step) =>
    pattern.some((row) => row[step] === true),
  );
}
/** Exact under-damped spring solution; preserves velocity when retargeted. */
export function spring(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
) {
  const damping = 65,
    frequency = 100;
  const w = Math.sqrt(frequency * frequency - damping * damping);
  const delta = position - target;
  const b = (velocity + damping * delta) / w;
  const decay = Math.exp(-damping * seconds),
    c = Math.cos(w * seconds),
    s = Math.sin(w * seconds);
  return {
    position: target + decay * (delta * c + b * s),
    velocity:
      decay * ((b * w - damping * delta) * c - (delta * w + damping * b) * s),
  };
}
/** Actual mechanical key travel: 90ms down, 160ms release. */
export function keyDepth(age: number) {
  if (age < 0 || age >= 250) return 0;
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  return age < 90 ? ease(age / 90) : 1 - ease((age - 90) / 160);
}
