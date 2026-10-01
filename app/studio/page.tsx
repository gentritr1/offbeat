import type { Metadata } from "next";
import { SoundStudio } from "@/components/offbeat/sound-studio";
export const metadata: Metadata = {
  title: "Sound studio",
  description:
    "Find your rhythm in the OFFBEAT sound studio. Make a beat, change the tempo, and play with sound.",
};
export default function StudioPage() {
  return (
    <main id="main">
      <SoundStudio />
    </main>
  );
}
