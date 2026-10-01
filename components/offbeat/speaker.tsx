"use client";
import { useEffect, useRef, useState } from "react";
import { SpeakerPoster } from "./speaker-poster";
import { connectWorker, readBrandPixels } from "@/lib/offbeat/three/bridge";
import { swingFromDrag } from "@/lib/offbeat/three/motion";
import type {
  Beat,
  SceneAction,
  SceneController,
  SceneEvent,
  SceneState,
} from "@/lib/offbeat/three/protocol";
/** Beat traffic bypasses React. Pattern updates happen only on edits/preset changes. */
export type SpeakerPulse = {
  hit: (beat: Beat) => void;
  setPattern: (pattern: boolean[][]) => void;
  stop: () => void;
};
type Props = {
  color: string;
  exploded?: boolean;
  rotation?: number;
  compact?: boolean;
  swing?: number;
  zoom?: number;
  pulse?: React.RefObject<SpeakerPulse | null>;
  pattern?: boolean[][];
  onSwingChange?: (value: number) => void;
};
export default function Speaker({
  color,
  exploded = false,
  rotation = 0,
  compact = false,
  swing = 50,
  zoom = 1,
  pulse,
  pattern,
  onSwingChange,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const dial = useRef<HTMLDivElement>(null);
  const controller = useRef<SceneController | null>(null);
  const values = useRef({
    color,
    exploded,
    rotation,
    compact,
    swing,
    zoom,
    pattern,
    onSwingChange,
  });
  values.current = {
    color,
    exploded,
    rotation,
    compact,
    swing,
    zoom,
    pattern,
    onSwingChange,
  };
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  useEffect(() => {
    controller.current?.send({
      type: "state",
      state: {
        color,
        exploded,
        rotation,
        swing,
        instant: document.documentElement.dataset.input === "keyboard",
      },
    });
  }, [color, exploded, rotation, swing]);
  useEffect(() => {
    if (pattern) controller.current?.send({ type: "pattern", pattern });
  }, [pattern]);
  useEffect(() => {
    if (!host.current || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "400px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [near]);
  useEffect(() => {
    const element = host.current;
    if (!element || !near || failed) return;
    const node = element;
    let cancelled = false,
      visible = true,
      initializing = false,
      usingWorker = false;
    let canvas: HTMLCanvasElement | null = null;
    let pendingBeat: Beat | null = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let drag: {
      id: number;
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      swing: number;
      dial: boolean;
    } | null = null;
    const state = (): SceneState => ({
      // Keep callbacks and React-owned pattern data out of the transferable state.
      color: values.current.color,
      exploded: values.current.exploded,
      rotation: values.current.rotation,
      swing: values.current.swing,
      compact: values.current.compact,
      zoom: values.current.zoom,
      width: Math.max(1, node.clientWidth),
      height: Math.max(1, node.clientHeight),
      dpr: Math.min(devicePixelRatio, 1.75),
      visible: visible && !document.hidden,
      reduced: reduced.matches,
      instant: false,
    });
    const send = (action: SceneAction) => controller.current?.send(action);
    function receive(event: SceneEvent) {
      if (cancelled) return;
      if (event.type === "ready") {
        node.dataset.ready = "true";
        return;
      }
      if (event.type === "error") {
        if (usingWorker && event.message !== "WebGL context lost") {
          void initialize(false);
          return;
        }
        send({ type: "dispose" });
        controller.current = null;
        setFailed(true);
        return;
      }
      if (event.type === "poster") {
        node.dispatchEvent(
          new CustomEvent("speakerposter", { detail: event.blob }),
        );
        return;
      }
      const frame = event.frame;
      if (dial.current)
        dial.current.style.transform = `translate(${frame.dial.x - 24}px, ${frame.dial.y - 24}px)`;
      node.dataset.step = String(frame.step);
      // Projected geometry is diagnostic metadata; strip QA still samples rendered pixels.
      node.dataset.frame = JSON.stringify(frame);
      node.dispatchEvent(new CustomEvent("speakerframe", { detail: frame }));
    }
    async function initialize(preferWorker: boolean) {
      if (cancelled || initializing) return;
      initializing = true;
      try {
        send({ type: "dispose" });
        controller.current = null;
        canvas?.remove();
        delete node.dataset.ready;
        canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        node.prepend(canvas);
        const brand = await readBrandPixels();
        if (cancelled) return;
        usingWorker = preferWorker;
        let connection: SceneController | null = null;
        if (preferWorker) {
          try {
            connection = connectWorker(canvas, state(), brand, receive);
          } catch {
            canvas.remove();
            canvas = document.createElement("canvas");
            canvas.setAttribute("aria-hidden", "true");
            node.prepend(canvas);
          }
        }
        if (!connection) {
          usingWorker = false;
          const { createSpeakerScene } =
            await import("@/lib/offbeat/three/scene");
          if (cancelled) return;
          connection = createSpeakerScene(canvas, state(), brand, receive);
        }
        controller.current = connection;
        node.dataset.renderer = usingWorker ? "worker" : "main";
        if (values.current.pattern)
          connection.send({ type: "pattern", pattern: values.current.pattern });
        if (pendingBeat) connection.send({ type: "beat", beat: pendingBeat });
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        initializing = false;
      }
    }
    if (pulse)
      pulse.current = {
        hit(beat) {
          pendingBeat = beat;
          send({ type: "beat", beat });
        },
        setPattern(next) {
          send({ type: "pattern", pattern: next });
        },
        stop() {
          pendingBeat = null;
          send({ type: "stop" });
        },
      };
    const snapshot = () => send({ type: "snapshot" });
    node.addEventListener("speakersnapshot", snapshot);
    const resize = new ResizeObserver(() =>
      send({
        type: "state",
        state: {
          width: Math.max(1, node.clientWidth),
          height: Math.max(1, node.clientHeight),
        },
      }),
    );
    resize.observe(node);
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "100px" },
    );
    visibility.observe(node);
    function sync() {
      send({
        type: "state",
        state: {
          visible: visible && !document.hidden,
          reduced: reduced.matches,
        },
      });
    }
    function down(event: PointerEvent) {
      if (drag || !event.isPrimary || event.button !== 0) return;
      const isDial = Boolean(
        values.current.onSwingChange &&
        dial.current?.contains(event.target as Node),
      );
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        swing: values.current.swing,
        dial: isDial,
      };
      node.setPointerCapture(event.pointerId);
      if (isDial) event.preventDefault();
    }
    function move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.dial) {
        const next = swingFromDrag(
          drag.swing,
          event.clientX - drag.x,
          event.clientY - drag.y,
        );
        if (next !== values.current.swing) values.current.onSwingChange?.(next);
      } else
        send({
          type: "rotate",
          dx: (event.clientX - drag.lastX) * 0.008,
          dy: (event.clientY - drag.lastY) * 0.003,
        });
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    }
    function up(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      if (node.hasPointerCapture(event.pointerId))
        node.releasePointerCapture(event.pointerId);
    }
    function keyboard(event: KeyboardEvent) {
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-0.22, 0],
        ArrowRight: [0.22, 0],
        ArrowUp: [0, -0.12],
        ArrowDown: [0, 0.12],
      };
      if (event.key === "Home") {
        event.preventDefault();
        send({ type: "home" });
      } else if (directions[event.key]) {
        event.preventDefault();
        const [dx, dy] = directions[event.key];
        send({ type: "rotate", dx, dy, instant: true });
      }
    }
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    node.addEventListener("lostpointercapture", up);
    node.addEventListener("keydown", keyboard);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    void initialize(true);
    return () => {
      cancelled = true;
      send({ type: "dispose" });
      controller.current = null;
      canvas?.remove();
      if (pulse) pulse.current = null;
      node.removeEventListener("speakersnapshot", snapshot);
      resize.disconnect();
      visibility.disconnect();
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      node.removeEventListener("lostpointercapture", up);
      node.removeEventListener("keydown", keyboard);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [compact, zoom, near, failed, pulse]);
  if (failed)
    return (
      <div className="canvas-fallback">
        <img src="/images/listening-room.webp" alt="OFFBEAT in hot orange" />
        <span>
          3D is unavailable on this device. Explore the product below.
        </span>
      </div>
    );
  return (
    <div
      ref={host}
      className="speaker-canvas"
      tabIndex={0}
      role="group"
      aria-label={
        onSwingChange
          ? "Interactive OFFBEAT speaker. Drag the top dial to adjust swing; use the Swing slider below for keyboard control. Drag the body or use arrow keys to rotate. Home resets."
          : "Interactive OFFBEAT speaker. Drag to rotate, or use the arrow keys. Press Home to reset."
      }
    >
      <SpeakerPoster
        color={color}
        variant={
          compact
            ? zoom > 1
              ? "studio"
              : "compact"
            : exploded
              ? "design"
              : "hero"
        }
      />
      {onSwingChange && (
        <div
          ref={dial}
          className="speaker-dial-hit"
          data-dial-hit
          aria-hidden="true"
          title="Drag up or right to add swing"
        />
      )}
    </div>
  );
}
