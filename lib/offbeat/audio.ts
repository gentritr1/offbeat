export type Pattern = boolean[][];
export const tracks = ["Kick", "Snare", "Hi-hat", "Bass"];
export const presets = [
  {
    name: "Kitchen disco",
    tempo: 112,
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
  pattern: Pattern = toPattern(presets[0].pattern);
  onStep: (step: number) => void = () => {};
  callbacks: ReturnType<typeof setTimeout>[] = [];
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.38;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 0.5,
      this.ctx.sampleRate,
    );
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  playVoice(track: number, time = this.ctx.currentTime, step = 0) {
    const gain = this.ctx.createGain();
    gain.connect(this.master);
    if (track === 0) {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(43, time + 0.15);
      gain.gain.setValueAtTime(0.85, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
      osc.connect(gain);
      this.active.add(osc);
      osc.start(time);
      osc.stop(time + 0.3);
      osc.onended = () => {
        this.active.delete(osc);
        osc.disconnect();
        gain.disconnect();
      };
    } else if (track === 1 || track === 2) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noise;
      const filter = this.ctx.createBiquadFilter();
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
      this.active.add(noise);
      noise.start(time);
      noise.stop(time + 0.19);
      noise.onended = () => {
        this.active.delete(noise);
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = [65.41, 65.41, 82.41, 98, 65.41, 87.31, 82.41, 98][
        step % 8
      ];
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 380;
      osc.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(0.42, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
      this.active.add(osc);
      osc.start(time);
      osc.stop(time + 0.26);
      osc.onended = () => {
        this.active.delete(osc);
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
  }
  async start() {
    if (this.timer) return;
    await this.ctx.resume();
    if (this.ctx.state !== "running")
      throw new Error("Audio is paused. Try pressing Play again.");
    this.step = 0;
    this.next = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => {
      while (this.next < this.ctx.currentTime + 0.1) {
        const s = this.step;
        this.pattern.forEach((row, t) => {
          if (row[s]) this.playVoice(t, this.next, s);
        });
        const delay = Math.max(0, (this.next - this.ctx.currentTime) * 1000);
        const cb = setTimeout(() => this.onStep(s), delay);
        this.callbacks.push(cb);
        if (this.callbacks.length > 64) this.callbacks.splice(0, 32);
        this.next += 60 / this.tempo / 2;
        this.step = (s + 1) % 8;
      }
    }, 25);
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
    await this.ctx.suspend();
  }
  async dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.callbacks.forEach(clearTimeout);
    this.master.disconnect();
    this.analyser.disconnect();
    await this.ctx.close();
  }
}
