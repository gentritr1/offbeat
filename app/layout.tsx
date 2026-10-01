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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
