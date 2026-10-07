import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/vt323/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azeemi Gala · Spacetime Lab",
  description:
    "Interactive 3D lab by Team LPPS bridging General Relativity (spacetime curvature, gravitational lensing, time dilation) with the Quranic concepts of yasbahun and the Miraj.",
};

export const viewport: Viewport = {
  themeColor: "#1F3863",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
