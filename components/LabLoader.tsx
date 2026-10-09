"use client";

import dynamic from "next/dynamic";

/** WebGL only exists in the browser, so the lab is rendered client-side. */
const Lab = dynamic(() => import("./Lab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-page">
      <p className="kicker text-body">Loading the lab</p>
    </div>
  ),
});

export default function LabLoader() {
  return <Lab />;
}
