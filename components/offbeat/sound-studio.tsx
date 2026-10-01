"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useWebTool, stringArgument } from "@/lib/offbeat/web-tools";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { SpeakerPulse } from "./speaker";
import { finishes, readPreference } from "@/lib/offbeat/finishes";
import { RecordPressing } from "./record-pressing";
import { SwingDial } from "./swing-dial";
import { decodeGroove } from "@/lib/offbeat/session";
import {
  PlayIcon,
  PauseIcon,
  ShuffleIcon,
  ArrowsCounterClockwiseIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
} from "@phosphor-icons/react";
import {
  BeatEngine,
  presets,
  toPattern,
  tracks,
  type Pattern,
} from "@/lib/offbeat/audio";
const Speaker = dynamic(() => import("./speaker"), {
  ssr: false,
  loading: () => <div className="canvas-loading" role="status" />,
});
function Visualizer({
  engine,
  playing,
}: {
  engine: React.RefObject<BeatEngine | null>;
  playing: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const context = c.getContext("2d");
    if (!context) return;
    const ctx = context;
    let frame = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const data = new Uint8Array(128);
    const heights = new Float32Array(40);
    let visible = true;
    const resize = new ResizeObserver(() => {
      c.width = c.clientWidth * Math.min(devicePixelRatio, 2);
      c.height = c.clientHeight * Math.min(devicePixelRatio, 2);
      wake();
    });
    resize.observe(c);
    const obs = new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !frame) draw();
    });
    obs.observe(c);
    function draw() {
      frame = 0;
      if (!visible || document.hidden) return;
      const w = c!.width,
        h = c!.height;
      ctx.clearRect(0, 0, w, h);
      if (playing && engine.current)
        engine.current.analyser.getByteFrequencyData(data);
      const gap = w / 40;
      let settling = false;
      for (let i = 0; i < 40; i++) {
        const idle = (Math.sin(i * 0.46) * 0.3 + 0.4) * h * 0.18;
        const desired = playing
          ? Math.max(h * 0.018, ((data[i * 2] || 0) / 255) * h * 0.8)
          : idle;
        heights[i] += (desired - heights[i]) * (reduced.matches ? 1 : 0.17);
        if (Math.abs(desired - heights[i]) > 0.1) settling = true;
        const bh = heights[i];
        ctx.fillStyle = i % 7 === 0 ? "#ed512d" : "#d6ef43";
        ctx.beginPath();
        ctx.roundRect(
          i * gap + 1,
          h / 2 - bh / 2,
          Math.max(2, gap * 0.52),
          bh,
          3,
        );
        ctx.fill();
      }
      if (!reduced.matches && (playing || settling))
        frame = requestAnimationFrame(draw);
    }
    function wake() {
      if (!document.hidden && !frame) draw();
    }
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      obs.disconnect();
      document.removeEventListener("visibilitychange", wake);
      reduced.removeEventListener("change", wake);
    };
  }, [playing, engine]);
  return (
    <canvas
      ref={canvas}
      className="sound-visualizer"
      aria-label={
        playing
          ? "Live audio frequency visualization"
          : "Sound visualization, paused"
      }
      role="img"
    />
  );
}
export function SoundStudio() {
  const [preset, setPreset] = useState(0);
  const [pattern, setPattern] = useState<Pattern>(
    toPattern(presets[0].pattern),
  );
  const [tempo, setTempo] = useState(presets[0].tempo);
  const [swing, setSwing] = useState(presets[0].swing);
  const [volume, setVolume] = useState(38);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [custom, setCustom] = useState(false);
  const [arrival, setArrival] = useState("");
  const engine = useRef<BeatEngine | null>(null);
  const sequencer = useRef<HTMLDivElement>(null);
  const speaker = useRef<SpeakerPulse | null>(null);
  // The studio shows the finish the visitor saved on the speaker page.
  const [finish, setFinish] = useState(finishes[0].color);
  const transportBusy = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const saved = Number(readPreference("offbeat-finish"));
    if (Number.isInteger(saved) && finishes[saved]) setFinish(finishes[saved].color);
  }, []);
  useEffect(() => {
    const value = new URL(location.href).searchParams.get("groove");
    const shared = decodeGroove(value);
    if (shared) {
      setPattern(shared.pattern);
      setTempo(shared.tempo);
      setSwing(shared.swing);
      setCustom(true);
      setArrival("A groove just for you. Press play to hear it.");
    } else if (value) {
      setArrival(
        "This groove link looks incomplete. Kitchen disco is ready to play instead.",
      );
    }
  }, []);
  useEffect(() => {
    if (engine.current) {
      engine.current.pattern = pattern;
      engine.current.tempo = tempo;
      engine.current.swing = swing;
      engine.current.master.gain.setTargetAtTime(
        volume / 100,
        engine.current.ctx.currentTime,
        0.03,
      );
    }
  }, [pattern, tempo, swing, volume]);
  // Lets the logo meter pulse in time while a groove plays.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.playing = String(playing);
    root.style.setProperty("--beat", `${60 / tempo}s`);
  }, [playing, tempo]);
  useEffect(
    () => () => {
      delete document.documentElement.dataset.playing;
    },
    [],
  );
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        generation.current++;
        void engine.current?.stop();
        setPlaying(false);
        showStep(-1);
        setStarting(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      generation.current++;
      void engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  // The playhead is written straight to the DOM so playback does not re-render the studio.
  function showStep(step: number) {
    sequencer.current?.setAttribute("data-step", String(step));
  }
  // Each step also drives the 3D speaker: a kick squashes it, any note lights the LED.
  function playStep(step: number) {
    showStep(step);
    const current = engine.current?.pattern;
    if (current?.some((row) => row[step])) speaker.current?.hit(current[0][step]);
  }
  function getEngine() {
    if (!engine.current) {
      engine.current = new BeatEngine();
      engine.current.pattern = pattern;
      engine.current.tempo = tempo;
      engine.current.swing = swing;
      engine.current.master.gain.value = volume / 100;
      engine.current.onStep = playStep;
    }
    return engine.current;
  }
  async function toggle() {
    if (transportBusy.current) return;
    transportBusy.current = true;
    const token = ++generation.current;
    setError("");
    setStarting(true);
    try {
      const e = getEngine();
      if (playing) {
        await e.stop();
        if (token === generation.current) {
          setPlaying(false);
          showStep(-1);
        }
      } else {
        await e.start();
        if (token !== generation.current || document.hidden) {
          if (e.ctx.state !== "closed") await e.stop();
          return;
        }
        setPlaying(true);
      }
    } catch {
      if (token === generation.current)
        setError(
          "Sound could not start. Check your browser audio settings and try again.",
        );
    } finally {
      transportBusy.current = false;
      if (token === generation.current) setStarting(false);
    }
  }
  function choose(i: number) {
    setPreset(i);
    setPattern(toPattern(presets[i].pattern));
    setTempo(presets[i].tempo);
    setSwing(presets[i].swing);
    setCustom(false);
  }
  function flip(t: number, s: number) {
    setPattern((p) =>
      p.map((row, i) =>
        i === t ? row.map((on, j) => (j === s ? !on : on)) : row,
      ),
    );
    setCustom(true);
  }
  function shuffle() {
    setPattern(
      tracks.map((_, t) =>
        Array.from({ length: 8 }, (_, s) =>
          t === 0
            ? s % 4 === 0 || Math.random() < 0.1
            : t === 1
              ? s === 2 || s === 6
              : t === 2
                ? Math.random() < 0.7
                : Math.random() < 0.35,
        ),
      ),
    );
    setCustom(true);
  }
  async function hit(t: number) {
    try {
      const e = getEngine();
      await e.ctx.resume();
      if (document.hidden) return;
      e.playVoice(t);
    } catch {
      setError("Your browser could not play this sound. Try pressing Play.");
    }
  }
  useWebTool({
    name: "configure_offbeat_groove",
    description:
      "Load a beat preset into the visible sound studio. This does not start audio playback.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: presets.map((p) => p.name) },
      },
      required: ["preset"],
      additionalProperties: false,
    },
    execute(input) {
      const name = stringArgument(input, "preset");
      const index = presets.findIndex((p) => p.name === name);
      if (index < 0) throw new Error("Choose an available preset.");
      flushSync(() => choose(index));
      return {
        preset: name,
        tempo: presets[index].tempo,
        swing: presets[index].swing,
      };
    },
  });
  return (
    <>
      <section className="studio-heading">
        <div>
          <h1>You bring the rhythm.</h1>
        </div>
        <p>
          This is the drum machine inside OFFBEAT, running in your browser. Tap
          steps, turn the swing, then press it to a record.
        </p>
      </section>
      {arrival && (
        <p className="studio-arrival" role="status">
          {arrival}
        </p>
      )}
      <section className="studio-workspace" aria-label="Interactive beat maker">
        <div className="studio-visual">
          <div className="studio-visual-top">
            <span>Step sequencer</span>
            <span className="readout">8 steps · 4 sounds</span>
          </div>
          <div className="studio-speaker">
            <Speaker
              color={finish}
              compact
              zoom={1.3}
              swing={swing}
              pulse={speaker}
            />
          </div>
          <Visualizer engine={engine} playing={playing} />
          <div className="studio-now">
            <span>{playing ? "Now playing" : "On the turntable"}</span>
            <h2>{custom ? "Your own thing" : presets[preset].name}</h2>
            <p>
              <span className="readout">{tempo} BPM</span>
              <span className="studio-divider" />
              <span className="readout">
                {swing === 50 ? "Straight" : `Swing ${swing}%`}
              </span>
            </p>
          </div>
          <button
            className="play-circle"
            data-latched={playing}
            onClick={toggle}
            disabled={starting}
            aria-label={playing ? "Pause beat" : "Play beat"}
          >
            {playing ? (
              <PauseIcon size={30} weight="fill" />
            ) : (
              <PlayIcon size={30} weight="fill" />
            )}
          </button>
          <p className="audio-note">
            {playing
              ? "A little louder. A little more you."
              : "Press play. Audio starts when you say so."}
          </p>
        </div>
        <div className="studio-controls">
          <div className="studio-control-heading">
            <h2>Find your groove.</h2>
            <button
              className="icon-button"
              onClick={() => choose(preset)}
              aria-label="Reset to selected preset"
            >
              <ArrowsCounterClockwiseIcon size={20} />
            </button>
          </div>
          <div className="preset-list" role="group" aria-label="Beat presets">
            {presets.map((p, i) => (
              <button
                key={p.name}
                className={i === preset && !custom ? "preset chosen" : "preset"}
                onClick={() => choose(i)}
                aria-pressed={i === preset && !custom}
              >
                <span className="led" aria-hidden="true" />
                {p.name}
              </button>
            ))}
          </div>
          <div
            className="sequencer-scroll"
            role="region"
            aria-label="Eight-step beat sequencer"
            tabIndex={0}
          >
            <div className="sequencer" ref={sequencer} data-step="-1">
              <div className="step-labels">
                <span />
                {Array.from({ length: 8 }, (_, i) => (
                  <span className="readout" data-s={i} key={i}>
                    {i + 1}
                  </span>
                ))}
              </div>
              {tracks.map((track, t) => (
                <div className="track-row" key={track}>
                  <button
                    className="track-name"
                    onClick={() => hit(t)}
                    aria-label={`Preview ${track} sound`}
                  >
                    {track}
                  </button>
                  {pattern[t].map((on, s) => (
                    <button
                      key={s}
                      className={on ? "beat-pad on" : "beat-pad"}
                      data-s={s}
                      onClick={() => flip(t, s)}
                      aria-label={`${track}, step ${s + 1}`}
                      aria-pressed={on}
                    >
                      <span />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="sequencer-caption">
            <span>Tap a step to switch it on.</span>
            <button onClick={shuffle}>
              <ShuffleIcon size={17} />
              Surprise me
            </button>
          </div>
          <div className="studio-sliders">
            <div>
              <label htmlFor="tempo">
                Tempo<span>{tempo} BPM</span>
              </label>
              <div className="fader">
                <input
                  id="tempo"
                  type="range"
                  min="60"
                  max="160"
                  value={tempo}
                  style={{ "--pct": `${tempo - 60}%` } as React.CSSProperties}
                  onChange={(e) => {
                    setTempo(Number(e.target.value));
                    setCustom(true);
                  }}
                />
              </div>
              <div className="range-ends">
                <span>Slow it down</span>
                <span>Turn it up</span>
              </div>
            </div>
            <div>
              <label htmlFor="volume">
                Volume<span>{volume}%</span>
              </label>
              <div className="fader">
                <input
                  id="volume"
                  type="range"
                  min="0"
                  max="75"
                  value={volume}
                  style={
                    { "--pct": `${(volume / 75) * 100}%` } as React.CSSProperties
                  }
                  onChange={(e) => setVolume(Number(e.target.value))}
                />
              </div>
              <div className="range-ends">
                <SpeakerLowIcon size={16} />
                <SpeakerHighIcon size={16} />
              </div>
            </div>
            <SwingDial
              value={swing}
              onChange={(value) => {
                setSwing(value);
                setCustom(true);
              }}
            />
          </div>
          <div className="studio-action">
            <button
              className="button button-go"
              onClick={toggle}
              disabled={starting}
            >
              <span className="led" data-on={playing} aria-hidden="true" />
              {playing ? (
                <PauseIcon size={18} weight="fill" />
              ) : (
                <PlayIcon size={18} weight="fill" />
              )}
              {starting
                ? "Starting audio"
                : playing
                  ? "Pause the groove"
                  : "Play the groove"}
            </button>
          </div>
          <p className="audio-error" role="alert">
            {error}
          </p>
        </div>
      </section>
      <RecordPressing
        pattern={pattern}
        tempo={tempo}
        swing={swing}
        playing={playing}
        defaultTitle={custom ? "Your own thing" : presets[preset].name}
      />
      <section className="studio-footer-note">
        <h2>Now meet the speaker it lives in.</h2>
        <Link href="/#make-it-yours" className="button button-outline">
          Pick a finish
        </Link>
      </section>
    </>
  );
}
