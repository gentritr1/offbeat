import type { Pattern } from "./audio";

export type Groove = { pattern: Pattern; tempo: number };

export function encodeGroove({ pattern, tempo }: Groove): string {
  if (
    pattern.length !== 4 ||
    pattern.some(
      (row) =>
        row.length !== 8 || row.some((cell) => typeof cell !== "boolean"),
    ) ||
    !Number.isInteger(tempo) ||
    tempo < 60 ||
    tempo > 160
  )
    throw new Error(
      "Choose a four-track groove and a tempo between 60 and 160.",
    );
  const bits = pattern.flat().map(Number).join("");
  return `1.${tempo}.${parseInt(bits, 2).toString(16).padStart(8, "0")}`;
}

export function decodeGroove(value: string | null): Groove | null {
  if (!value || !/^1\.\d{2,3}\.[\da-f]{8}$/i.test(value)) return null;
  const [, speed, encoded] = value.split(".");
  const tempo = Number(speed);
  if (tempo < 60 || tempo > 160) return null;
  const bits = parseInt(encoded, 16).toString(2).padStart(32, "0");
  return {
    tempo,
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
