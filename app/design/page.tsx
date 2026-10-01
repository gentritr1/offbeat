import type { Metadata } from "next";
import { DesignExperience } from "@/components/offbeat/design-experience";
export const metadata: Metadata = {
  title: "By design",
  description:
    "Go beneath the grille. A tactile speaker concept designed for real life, physical controls, and good sound.",
};
export default function DesignPage() {
  return (
    <main id="main">
      <DesignExperience />
    </main>
  );
}
