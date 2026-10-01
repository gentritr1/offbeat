import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanTitle,
  decodeGroove,
  encodeGroove,
} from "../lib/offbeat/session.ts";
import { encodeWav } from "../lib/offbeat/wav.ts";
import { BeatEngine, presets, toPattern } from "../lib/offbeat/audio.ts";

test("shared grooves preserve every pad, including the high bit and silence", () => {
  for (const preset of presets) {
    const groove = { pattern: toPattern(preset.pattern), tempo: preset.tempo };
    assert.deepEqual(decodeGroove(encodeGroove(groove)), groove);
  }
  for (let bit = 0; bit < 32; bit++) {
    const pattern = Array.from({ length: 4 }, (_, t) =>
      Array.from({ length: 8 }, (_, s) => t * 8 + s === bit),
    );
    assert.deepEqual(decodeGroove(encodeGroove({ pattern, tempo: 60 })), {
      pattern,
      tempo: 60,
    });
  }
  assert.equal(
    encodeGroove({
      pattern: Array.from({ length: 4 }, () => Array(8).fill(true)),
      tempo: 160,
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
  assert.throws(() => encodeGroove({ pattern: [[true]], tempo: 112 }));
  assert.throws(() =>
    encodeGroove({ pattern: toPattern(presets[0].pattern), tempo: NaN }),
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
