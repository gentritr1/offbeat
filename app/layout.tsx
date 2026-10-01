import type { Metadata } from "next";
import { Shell } from "@/components/offbeat/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "OFFBEAT | Sound with a little soul",
    template: "%s | OFFBEAT",
  },
  description:
    "A little speaker with a big personality. Explore OFFBEAT in 3D, find your color, and make some noise.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('offbeat-theme');document.documentElement.dataset.theme=saved==='dark'||(!saved&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})();`,
          }}
        />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
