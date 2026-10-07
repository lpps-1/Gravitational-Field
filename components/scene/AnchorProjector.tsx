"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { anchors, stageRect } from "@/lib/anchors";
import { useLab } from "@/lib/store";

/** Projects every screen anchor into the viewport. Mount it last in the Canvas. */
export function AnchorProjector() {
  const v = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    const labelsOn = useLab.getState().settings.labels;
    anchors.forEach((a) => {
      const el = a.el;
      if (!el) return;
      let shown = labelsOn && a.visible && a.opacity > 0.01;
      let x = 0;
      let y = 0;
      if (shown) {
        v.current.copy(a.world).project(camera);
        x = (v.current.x * 0.5 + 0.5) * size.width;
        y = (-v.current.y * 0.5 + 0.5) * size.height;
        shown =
          v.current.z < 1 &&
          x > stageRect.left + 8 &&
          x < Math.min(size.width, stageRect.right) - 8 &&
          y > stageRect.top + 8 &&
          y < Math.min(size.height, stageRect.bottom) - 8;
      }

      const w = a.written;
      if (w.shown !== shown) {
        el.style.visibility = shown ? "visible" : "hidden";
        w.shown = shown;
      }
      if (!shown) return;
      // Keep the whole label inside the view: measure once, then clamp.
      if (!a.width) a.width = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      const right = Math.min(size.width, stageRect.right) - 8;
      const left = stageRect.left + 8;
      if (a.align === "center") x = Math.min(Math.max(x, left + a.width / 2), right - a.width / 2);
      else x = Math.min(Math.max(x, left - 10), right - 10 - a.width);
      const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (w.transform !== transform) {
        el.style.transform = transform;
        w.transform = transform;
      }
      const opacity = Math.min(1, a.opacity).toFixed(2);
      if (w.opacity !== opacity) {
        el.style.opacity = opacity;
        w.opacity = opacity;
      }
      if (w.highlight !== a.highlight) {
        el.dataset.highlight = a.highlight ? "true" : "false";
        w.highlight = a.highlight;
      }
    });
  });

  return null;
}
