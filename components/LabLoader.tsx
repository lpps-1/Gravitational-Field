"use client";

import dynamic from "next/dynamic";

/** WebGL only exists in the browser, so the lab is rendered client-side. */
const Lab = dynamic(() => import("./Lab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-navy font-mono text-sm tracking-[0.3em] text-paper/70">
      INITIALISING SPACETIME LAB<span className="blink">_</span>
    </div>
  ),
});

export default function LabLoader() {
  return <Lab />;
}
