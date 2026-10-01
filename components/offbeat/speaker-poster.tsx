import posters from "@/lib/offbeat/three/posters.json";
export function SpeakerPoster({
  color = "#ee512d",
  variant = "hero",
}: {
  color?: string;
  variant?: string;
}) {
  const assets: Record<string, string> = posters;
  const fallback = "/images/listening-room.webp";
  return (
    <picture className="speaker-poster" aria-hidden="true">
      <source
        media="(max-width: 767px)"
        srcSet={assets[`${variant}:${color}:390`] || fallback}
      />
      <img src={assets[`${variant}:${color}:1440`] || fallback} alt="" />
    </picture>
  );
}
