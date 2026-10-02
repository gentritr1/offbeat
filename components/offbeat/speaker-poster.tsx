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
      <img
        src={assets[`${variant}:${color}:1440`] || fallback}
        alt=""
        decoding="async"
        // The configurator speaker sits below the fold: do not fetch its poster
        // (or refetch it on every finish change) until it is near the viewport.
        loading={variant === "compact" ? "lazy" : "eager"}
      />
    </picture>
  );
}
