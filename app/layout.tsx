import type { Metadata, Viewport } from "next";
import "@fontsource/amiri/arabic-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spacetime Lab · Azeemi Gala · Team LPPS",
  description:
    "Interactive 3D lab by Team LPPS: how gravity shapes space, light and time, from a curved grid to our real Solar System and a black hole, alongside the Quranic themes of yasbaḥūn and the Miraj.",
};

export const viewport: Viewport = {
  themeColor: "#091d38",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        {/* Headings and controls use it from the first frame. */}
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
