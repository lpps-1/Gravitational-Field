import * as THREE from "three";

/**
 * Screen anchors: DOM labels pinned to points in the 3D scene.
 *
 * Scene components write a world position (and visibility) for an anchor id;
 * a DOM component registers the element to move; `AnchorProjector` (inside
 * the Canvas) projects each anchor once per frame and positions its element.
 * Labels keep a fixed, readable size instead of shrinking with distance.
 */
export interface Anchor {
  el: HTMLElement | null;
  world: THREE.Vector3;
  visible: boolean;
  opacity: number;
  /** Emphasise the label (e.g. a sky the tunnel light has just passed). */
  highlight: boolean;
  /** How the label sits on its point: centred above it, centred below it, or just right of it. */
  origin: "bottom" | "top" | "left";
  /** Rendered label size (px), measured once. */
  width: number;
  height: number;
  /** Last values written to the DOM, so unchanged frames cost nothing. */
  written: { transform: string; opacity: string; shown: boolean | null; highlight: boolean | null };
}

export const anchors = new Map<string, Anchor>();

export function getAnchor(id: string): Anchor {
  let a = anchors.get(id);
  if (!a) {
    a = {
      el: null,
      world: new THREE.Vector3(),
      visible: false,
      opacity: 1,
      highlight: false,
      origin: "bottom",
      width: 0,
      height: 0,
      written: { transform: "", opacity: "", shown: null, highlight: null },
    };
    anchors.set(id, a);
  }
  return a;
}

/**
 * The part of the window not covered by the console (CSS px). Labels whose
 * anchor falls outside it are hidden rather than drawn under the panels.
 */
export const stageRect = { left: 0, top: 0, right: Infinity, bottom: Infinity };
