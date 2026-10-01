"use client";
import { useRef } from "react";
import { SWING_MAX, SWING_MIN } from "@/lib/offbeat/audio";
import { swingFromDrag } from "@/lib/offbeat/three/motion";

const SWEEP = 270;
const ticks = [50, 55, 60, 65, 70, 75];
const angleOf = (value: number) =>
  -SWEEP / 2 + ((value - SWING_MIN) / (SWING_MAX - SWING_MIN)) * SWEEP;

/**
 * The aluminium dial from the speaker, as the swing control: it pushes every
 * off-beat step late. Drag up or right to add swing; keys step it; double
 * click returns it to straight.
 */
export function SwingDial({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    from: number;
  } | null>(null);
  function set(next: number) {
    const clamped = Math.min(SWING_MAX, Math.max(SWING_MIN, Math.round(next)));
    if (clamped !== value) onChange(clamped);
  }
  function keyDown(event: React.KeyboardEvent) {
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 5,
      PageDown: -5,
    };
    if (event.key in steps) set(value + steps[event.key]);
    else if (event.key === "Home") set(SWING_MIN);
    else if (event.key === "End") set(SWING_MAX);
    else return;
    event.preventDefault();
  }
  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Ignore extra fingers once a drag has started.
    if (drag.current || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from: value,
    };
  }
  function pointerMove(event: React.PointerEvent) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    // Six pixels per percent, up or right adds swing.
    set(
      swingFromDrag(
        start.from,
        event.clientX - start.x,
        event.clientY - start.y,
      ),
    );
  }
  function pointerUp(event: React.PointerEvent) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }
  const angle = angleOf(value);
  return (
    <div className="swing">
      <span className="swing-label" id="swing-label">
        Swing
      </span>
      <div
        className="swing-dial"
        role="slider"
        tabIndex={0}
        aria-labelledby="swing-label"
        aria-valuemin={SWING_MIN}
        aria-valuemax={SWING_MAX}
        aria-valuenow={value}
        aria-valuetext={
          value === SWING_MIN ? "Straight" : `Swing ${value} percent`
        }
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onLostPointerCapture={pointerUp}
        onDoubleClick={() => set(SWING_MIN)}
        style={
          {
            "--angle": `${angle}deg`,
            "--amount": `${angle + SWEEP / 2}deg`,
          } as React.CSSProperties
        }
      >
        {ticks.map((tick) => (
          <b
            key={tick}
            aria-hidden="true"
            style={{ "--tick": `${angleOf(tick)}deg` } as React.CSSProperties}
          />
        ))}
        <span className="swing-knob" aria-hidden="true">
          <i />
        </span>
      </div>
      <span className="readout swing-value" aria-hidden="true">
        {value === SWING_MIN ? "Straight" : `${value}%`}
      </span>
    </div>
  );
}
