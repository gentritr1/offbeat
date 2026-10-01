import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanTitle,
  decodeGroove,
  encodeGroove,
} from "../lib/offbeat/session.ts";
import { encodeWav } from "../lib/offbeat/wav.ts";
import {
  BeatEngine,
  presets,
  stepTime,
  toPattern,
} from "../lib/offbeat/audio.ts";
import { loopEvents } from "../lib/offbeat/pressing.ts";

test("shared grooves preserve every pad, including the high bit and silence", () => {
  for (const preset of presets) {
    const groove = {
      pattern: toPattern(preset.pattern),
      tempo: preset.tempo,
      swing: preset.swing,
    };
    assert.deepEqual(decodeGroove(encodeGroove(groove)), groove);
  }
  for (let bit = 0; bit < 32; bit++) {
    const pattern = Array.from({ length: 4 }, (_, t) =>
      Array.from({ length: 8 }, (_, s) => t * 8 + s === bit),
    );
    assert.deepEqual(
      decodeGroove(encodeGroove({ pattern, tempo: 60, swing: 50 })),
      { pattern, tempo: 60, swing: 50 },
    );
  }
  assert.equal(
    encodeGroove({
      pattern: Array.from({ length: 4 }, () => Array(8).fill(true)),
      tempo: 160,
      swing: 50,
    }),
    "1.160.ffffffff",
  );
  assert.deepEqual(
    decodeGroove("1.112.00000000")?.pattern,
    Array.from({ length: 4 }, () => Array(8).fill(false)),
  );
});

test("malformed and oversized shared grooves fall back safely", () => {
  for (const value of [
    null,
    "",
    "1.0.ffffffff",
    "1.161.ffffffff",
    "2.112.aaaaaaaa",
    "1.112.fffffff",
    "1.112.fffffffff",
    "1.112.<script>",
    "1.112.ffffffff.extra",
  ])
    assert.equal(decodeGroove(value), null);
  assert.throws(() =>
    encodeGroove({ pattern: [[true]], tempo: 112, swing: 50 }),
  );
  assert.throws(() =>
    encodeGroove({
      pattern: toPattern(presets[0].pattern),
      tempo: NaN,
      swing: 50,
    }),
  );
  assert.equal(cleanTitle("  hello\u0000\nworld  "), "helloworld");
  assert.equal(Array.from(cleanTitle("🎵".repeat(40))).length, 32);
});

test("WAV exports have valid PCM headers, interleaving and clipping protection", () => {
  const wav = encodeWav(
    [new Float32Array([-2, 0, 2]), new Float32Array([0.5, NaN, -0.5])],
    44100,
  );
  const bytes = new Uint8Array(wav);
  const view = new DataView(wav);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(28, true), 176400);
  assert.equal(view.getUint32(40, true), 12);
  assert.equal(wav.byteLength, 56);
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => view.getInt16(44 + i * 2, true)),
    [-32768, 16384, 0, 0, 32767, -16384],
  );
  assert.throws(() => encodeWav([], 44100));
  assert.throws(() =>
    encodeWav([new Float32Array(1), new Float32Array(2)], 44100),
  );
});

class Param {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
}
class AudioNode {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  onended: (() => void) | null = null;
  stopped = false;
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.stopped = true;
    this.onended?.();
  }
}
class FakeContext {
  sampleRate = 44100;
  currentTime = 0;
  state = "suspended";
  destination = {};
  createGain() {
    return new AudioNode();
  }
  createAnalyser() {
    return new AudioNode();
  }
  createBuffer(_: number, length: number) {
    return {
      getChannelData() {
        return new Float32Array(length);
      },
    };
  }
  createOscillator() {
    return new AudioNode();
  }
  createBufferSource() {
    return new AudioNode();
  }
  createBiquadFilter() {
    return new AudioNode();
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async close() {
    this.state = "closed";
  }
}
test("audio stops scheduled voices, restarts and disposes without stale callbacks", async () => {
  Object.assign(globalThis, { AudioContext: FakeContext });
  const engine = new BeatEngine();
  for (let track = 0; track < 4; track++) engine.playVoice(track, 0);
  assert.equal(engine.active.size, 4);
  await engine.start();
  assert.notEqual(engine.timer, null);
  await engine.stop();
  assert.equal(engine.timer, null);
  assert.equal(engine.active.size, 0);
  assert.equal(engine.callbacks.length, 0);
  assert.equal(engine.ctx.state, "suspended");
  await engine.start();
  assert.equal(engine.ctx.state, "running");
  engine.playVoice(0);
  await engine.dispose();
  assert.equal(engine.timer, null);
  assert.equal(engine.active.size, 0);
  assert.equal(engine.ctx.state, "closed");
  await engine.dispose();
});

test("links shared before swing existed still decode, straight", () => {
  // Captured from the pre-swing codec: Kitchen disco at 112 BPM.
  assert.deepEqual(decodeGroove("1.112.8822bb94"), {
    pattern: toPattern(presets[0].pattern),
    tempo: 112,
    swing: 50,
  });
});

test("swing round-trips through links and rejects anything out of range", () => {
  const pattern = toPattern(presets[1].pattern);
  for (let swing = 50; swing <= 75; swing++)
    assert.deepEqual(
      decodeGroove(encodeGroove({ pattern, tempo: 78, swing })),
      {
        pattern,
        tempo: 78,
        swing,
      },
    );
  // Straight grooves keep the original format so older links stay identical.
  assert.match(encodeGroove({ pattern, tempo: 78, swing: 50 }), /^1\./);
  assert.equal(
    encodeGroove({ pattern, tempo: 78, swing: 62 }),
    "2.78.8422aa89.62",
  );
  for (const value of [
    "2.112.8822bb94",
    "2.112.8822bb94.49",
    "2.112.8822bb94.76",
    "2.112.8822bb94.6x",
    "2.112.8822bb94.620",
    "1.112.8822bb94.62",
  ])
    assert.equal(decodeGroove(value), null);
  for (const swing of [49, 76, 60.5, NaN])
    assert.throws(() => encodeGroove({ pattern, tempo: 112, swing }));
});

test("swing pushes only the off-beats late, by (swing - 50) / 50 of a step", () => {
  const step = 30 / 120;
  assert.equal(stepTime(0, 120, 75), 0);
  assert.equal(stepTime(1, 120, 50), step);
  assert.equal(stepTime(1, 120, 75), step * 1.5);
  assert.ok(Math.abs(stepTime(3, 120, 66) - step * 3.32) < 1e-12);
  assert.equal(stepTime(2, 120, 75), step * 2);
  assert.equal(stepTime(6, 120, 75), step * 6);
  // The latest off-beat still lands before the next bar.
  assert.ok(stepTime(7, 60, 75) < 240 / 60);
});

test("the exported loop uses the same swing and never spills past its bar", () => {
  const pattern = Array.from({ length: 4 }, () => Array(8).fill(true));
  for (const tempo of [60, 112, 160]) {
    const bar = 240 / tempo;
    const straight = loopEvents(pattern, tempo, 50);
    const swung = loopEvents(pattern, tempo, 75);
    assert.equal(swung.length, straight.length);
    for (const [i, event] of swung.entries()) {
      const barIndex = Math.floor(i / 32);
      assert.equal(
        event.time,
        barIndex * bar + stepTime(event.step, tempo, 75),
      );
      assert.ok(event.time - barIndex * bar < bar);
      if (event.step % 2 === 0) assert.equal(event.time, straight[i].time);
      else
        assert.ok(
          Math.abs(event.time - straight[i].time - 15 / tempo) < 1e-9,
          "off-beats in the export land half a step late at 75% swing",
        );
    }
  }
});

test("live playback schedules voices on the swung grid", async () => {
  Object.assign(globalThis, { AudioContext: FakeContext });
  const engine = new BeatEngine();
  const times: number[] = [];
  engine.playVoice = (_track, time = 0) => {
    times.push(time);
  };
  engine.pattern = [
    Array(8).fill(true),
    ...Array.from({ length: 3 }, () => Array(8).fill(false)),
  ];
  engine.tempo = 120;
  engine.swing = 75;
  engine.next = 0;
  (engine.ctx as unknown as FakeContext).currentTime = 1.9;
  engine.schedule();
  const step = 30 / 120;
  assert.deepEqual(
    times,
    Array.from({ length: 8 }, (_, s) => s * step + (s % 2 ? step / 2 : 0)),
  );
  await engine.dispose();
});

test("shared v2 link drives exactly the same hardware strip as all preset patterns", async () => {
  const { activeSteps } = await import("../lib/offbeat/three/motion.ts");
  for (const preset of presets) {
    const pattern = toPattern(preset.pattern);
    assert.deepEqual(
      activeSteps(pattern),
      Array.from({ length: 8 }, (_, step) => pattern.some((row) => row[step])),
    );
  }
  const shared = decodeGroove("2.120.c0000000.75")!;
  assert.equal(shared.swing, 75);
  assert.deepEqual(activeSteps(shared.pattern), [
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
});

test("both swing inputs use +10 per 60px, with rounding and limits", async () => {
  const { swingFromDrag } = await import("../lib/offbeat/three/motion.ts");
  assert.equal(swingFromDrag(50, 60, 0), 60);
  assert.equal(swingFromDrag(50, 0, -60), 60);
  assert.equal(swingFromDrag(60, -60, 0), 50);
  assert.equal(swingFromDrag(70, 60, 0), 75);
  assert.equal(swingFromDrag(50, -600, 0), 50);
  assert.equal(swingFromDrag(50, 3, 0), 51);
});

test("dial detent has a small overshoot and settles within 120ms at 60 and 120Hz", async () => {
  const { spring, keyDepth } = await import("../lib/offbeat/three/motion.ts");
  for (const hz of [60, 120]) {
    let position = 0,
      velocity = 0,
      peak = 0;
    const target = Math.PI / 180;
    for (let time = 0; time < 0.12 - 1e-10;) {
      const dt = Math.min(1 / hz, 0.12 - time);
      ({ position, velocity } = spring(position, velocity, target, dt));
      peak = Math.max(peak, position);
      time += dt;
    }
    assert(peak > target && peak < target * 1.1);
    assert(Math.abs(position - target) < target * 0.001);
    const reversed = spring(position, velocity, 0, 1 / hz);
    assert(
      Number.isFinite(reversed.position) && Number.isFinite(reversed.velocity),
    );
  }
  assert.equal(keyDepth(0), 0);
  assert.equal(keyDepth(90), 1);
  assert.equal(keyDepth(250), 0);
  assert(keyDepth(45) > 0 && keyDepth(45) < 1);
});

test("a queued beat carries the same tracks as its scheduled audio even after an edit", () => {
  Object.assign(globalThis, { AudioContext: FakeContext });
  const engine = new BeatEngine();
  const queued: (() => void)[] = [];
  const original = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => {
    queued.push(fn);
    return 0;
  }) as unknown as typeof setTimeout;
  let received: { step: number; tracks: boolean[] } | undefined;
  engine.onStep = (step, tracks) => {
    received = { step, tracks };
  };
  try {
    engine.pattern = [
      Array(8).fill(true),
      ...Array.from({ length: 3 }, () => Array(8).fill(false)),
    ];
    engine.next = 0;
    engine.schedule();
    engine.pattern = Array.from({ length: 4 }, () => Array(8).fill(false));
    queued[0]();
    assert.deepEqual(received, {
      step: 0,
      tracks: [true, false, false, false],
    });
  } finally {
    globalThis.setTimeout = original;
    void engine.dispose();
  }
});
