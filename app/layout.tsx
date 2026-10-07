import type { Metadata, Viewport } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/vt323/400.css";
import "@fontsource/amiri/arabic-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azeemi Gala · Spacetime Lab",
  description:
    "Interactive 3D lab by Team LPPS showing how gravity shapes space, light and time (curvature, gravitational lensing, time dilation), alongside the Quranic themes of yasbaḥūn and the Miraj.",
};

export const viewport: Viewport = {
  themeColor: "#1F3863",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
