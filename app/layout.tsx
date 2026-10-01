import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { Shell } from "@/components/offbeat/shell";
import "./globals.css";
// Self-hosted at build time: no runtime font requests.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});
// Mono is only for numeric readouts (studio, specs), so it is not preloaded on every page.
const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  title: {
    default: "OFFBEAT | Plays your songs. Makes its own.",
    template: "%s | OFFBEAT",
  },
  description:
    "A portable speaker concept with an eight-step drum machine inside. Explore it in 3D, pick a finish, and press your own record.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${martian.variable}`}
      suppressHydrationWarning
    >
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
