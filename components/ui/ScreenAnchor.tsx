"use client";

import { useCallback } from "react";
import { getAnchor } from "@/lib/anchors";

/**
 * A DOM element pinned to a 3D anchor. `origin` picks which point of the
 * element sits on the anchor: "bottom" (element floats above) or "center".
 */
export function ScreenAnchor({
  id,
  origin = "bottom",
  children,
}: {
  id: string;
  origin?: "bottom" | "center";
  children: React.ReactNode;
}) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      getAnchor(id).el = el;
    },
    [id],
  );
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-0 left-0 will-change-transform"
      style={{ visibility: "hidden", transformOrigin: "0 0" }}
    >
      <div style={{ transform: origin === "bottom" ? "translate(-50%, -100%)" : "translate(-50%, -50%)" }}>{children}</div>
    </div>
  );
}
