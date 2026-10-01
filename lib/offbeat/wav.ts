export function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
): ArrayBuffer {
  if (
    !channels.length ||
    channels.length > 2 ||
    !Number.isInteger(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    channels.some((channel) => channel.length !== channels[0].length)
  )
    throw new Error("Invalid audio buffer.");
  const channelCount = channels.length;
  const dataLength = channels[0].length * channelCount * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    Array.from(value).forEach((char, i) =>
      view.setUint8(offset + i, char.charCodeAt(0)),
    );
  text(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < channels[0].length; i++) {
    for (const channel of channels) {
      const sample = Math.max(
        -1,
        Math.min(1, Number.isFinite(channel[i]) ? channel[i] : 0),
      );
      view.setInt16(
        offset,
        sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767),
        true,
      );
      offset += 2;
    }
  }
  return buffer;
}
