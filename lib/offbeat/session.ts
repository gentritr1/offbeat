import { SWING_MAX, SWING_MIN, type Pattern } from "./audio.ts";

export type Groove = { pattern: Pattern; tempo: number; swing: number };

/**
 * Straight grooves keep the original v1 format (`1.<tempo>.<pads>`), so every
 * link shared before swing existed still decodes. Swung grooves use v2
 * (`2.<tempo>.<pads>.<swing>`).
 */
export function encodeGroove({ pattern, tempo, swing = SWING_MIN }: Groove): string {
  if (
    pattern.length !== 4 ||
    pattern.some(
      (row) =>
        row.length !== 8 || row.some((cell) => typeof cell !== "boolean"),
    ) ||
    !Number.isInteger(tempo) ||
    tempo < 60 ||
    tempo > 160 ||
    !Number.isInteger(swing) ||
    swing < SWING_MIN ||
    swing > SWING_MAX
  )
    throw new Error(
      "Choose a four-track groove, a tempo between 60 and 160, and a swing between 50 and 75.",
    );
  const bits = pattern.flat().map(Number).join("");
  const pads = parseInt(bits, 2).toString(16).padStart(8, "0");
  return swing === SWING_MIN
    ? `1.${tempo}.${pads}`
    : `2.${tempo}.${pads}.${swing}`;
}

export function decodeGroove(value: string | null): Groove | null {
  const match = value?.match(
    /^(?:1\.(\d{2,3})\.([\da-f]{8})|2\.(\d{2,3})\.([\da-f]{8})\.(\d{2}))$/i,
  );
  if (!match) return null;
  const tempo = Number(match[1] ?? match[3]);
  const swing = match[5] === undefined ? SWING_MIN : Number(match[5]);
  if (tempo < 60 || tempo > 160 || swing < SWING_MIN || swing > SWING_MAX)
    return null;
  const bits = parseInt(match[2] ?? match[4], 16)
    .toString(2)
    .padStart(32, "0");
  return {
    tempo,
    swing,
    pattern: Array.from({ length: 4 }, (_, track) =>
      Array.from({ length: 8 }, (_, step) => bits[track * 8 + step] === "1"),
    ),
  };
}
export function cleanTitle(value: string | null): string {
  return Array.from((value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim())
    .slice(0, 32)
    .join("");
}
