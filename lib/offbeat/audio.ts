export type Pattern = boolean[][];
export const tracks = ["Kick", "Snare", "Hi-hat", "Bass"];
/** Swing as on a groovebox: 50 is straight, about 66 is a triplet shuffle, 75 is the limit. */
export const SWING_MIN = 50;
export const SWING_MAX = 75;
/**
 * Seconds from the start of a bar to `step` (0-7, eighth notes).
 * Swing delays every off-beat step by (swing - 50) / 50 of a step.
 */
export function stepTime(step: number, tempo: number, swing = SWING_MIN) {
  const stepLength = 30 / tempo;
  const late = step % 2 ? ((swing - SWING_MIN) / 50) * stepLength : 0;
  return step * stepLength + late;
}
export const presets = [
  {
    name: "Kitchen disco",
    tempo: 112,
    swing: 54,
    pattern: [
      [1, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [1, 0, 1, 1, 1, 0, 1, 1],
      [1, 0, 0, 1, 0, 1, 0, 0],
    ],
  },
  {
    name: "Sunday slow",
    tempo: 78,
    swing: 62,
    pattern: [
      [1, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1, 0, 0, 1],
    ],
  },
  {
    name: "Night drive",
    tempo: 126,
    swing: 50,
    pattern: [
      [1, 0, 1, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 1, 0, 1],
    ],
  },
];
export function toPattern(data: number[][]): Pattern {
  return data.map((row) => row.map(Boolean));
}
export function createNoise(ctx: BaseAudioContext) {
  const noise = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * 0.5),
    ctx.sampleRate,
  );
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}
export function scheduleVoice(
  ctx: BaseAudioContext,
  master: GainNode,
  noiseBuffer: AudioBuffer,
  active: Set<AudioScheduledSourceNode>,
  track: number,
  time: number,
  step: number,
) {
  const gain = ctx.createGain();
  gain.connect(master);
  if (track === 0) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(43, time + 0.15);
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(gain);
    active.add(osc);
    osc.start(time);
    osc.stop(time + 0.3);
    osc.onended = () => {
      active.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
  } else if (track === 1 || track === 2) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = track === 1 ? "highpass" : "bandpass";
    filter.frequency.value = track === 1 ? 1300 : 7500;
    filter.Q.value = track === 1 ? 0.7 : 1.2;
    noise.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(track === 1 ? 0.5 : 0.21, time);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      time + (track === 1 ? 0.15 : 0.055),
    );
    active.add(noise);
    noise.start(time);
    noise.stop(time + 0.19);
    noise.onended = () => {
      active.delete(noise);
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } else {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = [65.41, 65.41, 82.41, 98, 65.41, 87.31, 82.41, 98][
      step % 8
    ];
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    osc.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.42, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
    active.add(osc);
    osc.start(time);
    osc.stop(time + 0.26);
    osc.onended = () => {
      active.delete(osc);
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}
export class BeatEngine {
  active = new Set<AudioScheduledSourceNode>();
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  noise: AudioBuffer;
  timer: ReturnType<typeof setInterval> | null = null;
  next = 0;
  step = 0;
  tempo = 112;
  swing = SWING_MIN;
  pattern: Pattern = toPattern(presets[0].pattern);
  onStep: (step: number, tracks: boolean[]) => void = () => {};
  callbacks: ReturnType<typeof setTimeout>[] = [];
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.38;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.noise = createNoise(this.ctx);
  }
  playVoice(track: number, time = this.ctx.currentTime, step = 0) {
    scheduleVoice(
      this.ctx,
      this.master,
      this.noise,
      this.active,
      track,
      time,
      step,
    );
  }
  async start() {
    if (this.timer) return;
    await this.ctx.resume();
    if (this.ctx.state !== "running")
      throw new Error("Audio is paused. Try pressing Play again.");
    this.step = 0;
    this.next = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  /** Queues every step due in the next 100ms. `next` walks the straight grid; swing offsets each voice. */
  schedule() {
    while (this.next < this.ctx.currentTime + 0.1) {
      const s = this.step;
      const time =
        this.next +
        stepTime(s, this.tempo, this.swing) -
        stepTime(s, this.tempo);
      const stepTracks = this.pattern.map((row) => row[s]);
      stepTracks.forEach((on, t) => {
        if (on) this.playVoice(t, time, s);
      });
      const delay = Math.max(0, (time - this.ctx.currentTime) * 1000);
      const cb = setTimeout(() => this.onStep(s, stepTracks), delay);
      this.callbacks.push(cb);
      if (this.callbacks.length > 64) this.callbacks.splice(0, 32);
      this.next += 30 / this.tempo;
      this.step = (s + 1) % 8;
    }
  }
  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.callbacks.forEach(clearTimeout);
    this.callbacks = [];
    this.active.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    this.active.clear();
    if (this.ctx.state !== "closed") await this.ctx.suspend();
  }
  async dispose() {
    if (this.ctx.state === "closed") return;
    this.onStep = () => {};
    await this.stop();
    this.master.disconnect();
    this.analyser.disconnect();
    await this.ctx.close();
  }
}
