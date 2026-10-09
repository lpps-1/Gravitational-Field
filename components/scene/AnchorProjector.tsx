"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { anchorStage, anchors, stageRect, type Anchor } from "@/lib/anchors";
import { sim, useLab } from "@/lib/store";

/** Projects every screen anchor into the viewport. Mount it last in the Canvas. */
export function AnchorProjector() {
  const v = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    const labelsOn = useLab.getState().settings.labels;
    placedCount = 0;
    anchors.forEach((a, id) => {
      const el = a.el;
      if (!el) return;
      const w = a.written;
      const shown = labelsOn && a.visible && a.opacity > 0.01 && anchorStage(id) === sim.stage && place(a, v.current, camera, size);
      if (w.shown !== shown) {
        el.style.visibility = shown ? "visible" : "hidden";
        w.shown = shown;
      }
      if (!shown) return;

      const transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
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

/** Where the label's anchor point lands on screen (written by `place`). */
const point = { x: 0, y: 0 };
const box = { left: 0, top: 0, right: 0, bottom: 0 };
/** Boxes of the labels already shown this frame (left, top, right, bottom, …): a later label that would cover one waits. */
const placed = new Float32Array(4 * 64);
let placedCount = 0;

/**
 * Projects a label and keeps it whole inside the free part of the view.
 * False when its point is behind the camera or outside that part, when the
 * label would run under the caption at the top of the view, or when it would
 * cover a label already shown (the first one registered keeps its place).
 */
function place(a: Anchor, v: THREE.Vector3, camera: THREE.Camera, size: { width: number; height: number }): boolean {
  v.copy(a.world).project(camera);
  let x = (v.x * 0.5 + 0.5) * size.width;
  let y = (-v.y * 0.5 + 0.5) * size.height;
  const left = stageRect.left + 8;
  const right = Math.min(size.width, stageRect.right) - 8;
  const top = stageRect.top + 8;
  const bottom = Math.min(size.height, stageRect.bottom) - 8;
  if (!(v.z < 1 && x > left && x < right && y > top && y < bottom)) return false;

  // Measure once (labels re-measure when the text size changes), then clamp.
  if (!a.width) {
    const label = a.el?.firstElementChild as HTMLElement | null;
    a.width = label?.offsetWidth ?? 0;
    a.height = label?.offsetHeight ?? 0;
  }
  if (a.origin === "left") {
    x = Math.min(Math.max(x, left - 10), right - 10 - a.width);
    y = Math.min(Math.max(y, top + a.height / 2), bottom - a.height / 2);
    box.left = x + 10;
    box.right = x + 10 + a.width;
    box.top = y - a.height / 2;
    box.bottom = y + a.height / 2;
  } else {
    x = Math.min(Math.max(x, left + a.width / 2), right - a.width / 2);
    if (a.origin === "bottom") y = Math.min(Math.max(y, top + a.height), bottom);
    else y = Math.min(Math.max(y, top), bottom - a.height - 6);
    box.left = x - a.width / 2;
    box.right = x + a.width / 2;
    box.top = a.origin === "bottom" ? y - a.height : y + 6;
    box.bottom = a.origin === "bottom" ? y : y + 6 + a.height;
  }
  point.x = x;
  point.y = y;

  const av = stageRect.avoid;
  if (av.right > av.left && box.left < av.right && box.right > av.left && box.top < av.bottom && box.bottom > av.top) return false;
  for (let i = 0; i < placedCount; i++) {
    const k = i * 4;
    if (box.left < placed[k + 2] + 3 && box.right > placed[k] - 3 && box.top < placed[k + 3] + 2 && box.bottom > placed[k + 1] - 2) return false;
  }
  if (placedCount < 64) {
    const k = placedCount++ * 4;
    placed[k] = box.left;
    placed[k + 1] = box.top;
    placed[k + 2] = box.right;
    placed[k + 3] = box.bottom;
  }
  return true;
}
