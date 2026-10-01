import { createNoise, scheduleVoice, type Pattern } from "./audio";
import { encodeWav } from "./wav";

export async function pressLoop(
  pattern: Pattern,
  tempo: number,
): Promise<Blob> {
  const sampleRate = 44100;
  const barSeconds = 240 / tempo;
  // Render a lead-in bar so the downloaded loop begins with natural note tails.
  const context = new OfflineAudioContext(
    1,
    Math.ceil((barSeconds * 5 + 0.5) * sampleRate),
    sampleRate,
  );
  const master = context.createGain();
  master.gain.value = 0.38;
  master.connect(context.destination);
  const noise = createNoise(context);
  const active = new Set<AudioScheduledSourceNode>();
  for (let bar = 0; bar < 5; bar++) {
    for (let step = 0; step < 8; step++) {
      pattern.forEach((row, track) => {
        if (row[step])
          scheduleVoice(
            context,
            master,
            noise,
            active,
            track,
            bar * barSeconds + (step * 30) / tempo,
            step,
          );
      });
    }
  }
  const rendered = await context.startRendering();
  const start = Math.round(barSeconds * sampleRate);
  const length = Math.round(barSeconds * 4 * sampleRate);
  const audio = rendered.getChannelData(0).slice(start, start + length);
  // Normalize only if simultaneous voices would otherwise clip.
  let peak = 0;
  for (const sample of audio) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.95)
    for (let i = 0; i < audio.length; i++) audio[i] *= 0.95 / peak;
  return new Blob([encodeWav([audio], sampleRate)], { type: "audio/wav" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give browsers time to consume the object URL before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function pressSleeve(
  pattern: Pattern,
  tempo: number,
  title: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Artwork could not be created.");
  ctx.fillStyle = "#d6ef43";
  ctx.fillRect(0, 0, 1600, 1600);
  ctx.fillStyle = "#202020";
  ctx.font = "bold 88px Helvetica, Arial, sans-serif";
  ctx.fillText("offbeat", 110, 170);
  ctx.font = "28px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("INDEPENDENT PRESSING", 1490, 160);
  const colors = ["#202020", "#ed512d", "#fafafa", "#202020"];
  pattern.forEach((row, track) =>
    row.forEach((on, step) => {
      ctx.beginPath();
      ctx.arc(
        182 + step * 176,
        440 + track * 176,
        on ? 66 : 13,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = on ? colors[track] : "#536018";
      ctx.fill();
    }),
  );
  ctx.textAlign = "left";
  ctx.fillStyle = "#202020";
  let size = 106;
  ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
  while (ctx.measureText(title).width > 1380 && size > 36) {
    size -= 2;
    ctx.font = `bold ${size}px Helvetica, Arial, sans-serif`;
  }
  ctx.fillText(title, 110, 1320);
  ctx.font = "32px Helvetica, Arial, sans-serif";
  ctx.fillText(`${tempo} BPM / FOUR BARS / MADE BY YOU`, 110, 1470);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Artwork could not be saved.")),
      "image/png",
    ),
  );
}
