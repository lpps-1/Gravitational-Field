"use client";

import { SKY_HEX } from "@/components/scene/SevenSkies";
import { SCENE_LABELS } from "@/lib/content";
import { SKY_COUNT } from "@/lib/physics";
import { ScreenAnchor } from "./ScreenAnchor";

/**
 * Text labels pinned to objects in the 3D view (PhET-style "Labels" option).
 * Fixed size so they stay readable at any zoom; positioned by AnchorProjector.
 */
export function SceneLabels() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {Object.entries(SCENE_LABELS).map(([id, text]) => (
        <ScreenAnchor key={id} id={id} origin={id === "mass" ? "top" : "bottom"}>
          <span className="scene-label">{text}</span>
        </ScreenAnchor>
      ))}
      {Array.from({ length: SKY_COUNT }, (_, i) => (
        <ScreenAnchor key={i} id={`sky${i}`} origin="left">
          <span className="scene-label inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SKY_HEX[i] }} />
            Sky {i + 1}
          </span>
        </ScreenAnchor>
      ))}
    </div>
  );
}
