"use client";

import { useCallback } from "react";
import { getAnchor } from "@/lib/anchors";

/**
 * A DOM element pinned to a 3D anchor (see lib/anchors). `origin` picks which
 * point of the element sits on the anchor: "bottom" (element floats above),
 * "top" (element hangs below) or "left" (element sits to the right of the point).
 */
export function ScreenAnchor({
  id,
  origin = "bottom",
  children,
}: {
  id: string;
  origin?: "bottom" | "top" | "left";
  children: React.ReactNode;
}) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      const a = getAnchor(id);
      a.el = el;
      a.align = origin === "left" ? "start" : "center";
      a.width = 0;
      a.written = { transform: "", opacity: "", shown: null, highlight: null };
    },
    [id, origin],
  );
  const offset = origin === "bottom" ? "translate(-50%, -100%)" : origin === "top" ? "translate(-50%, 6px)" : "translate(10px, -50%)";
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-0 left-0 will-change-transform"
      style={{ visibility: "hidden", transformOrigin: "0 0" }}
    >
      <div style={{ transform: offset }}>{children}</div>
    </div>
  );
}
