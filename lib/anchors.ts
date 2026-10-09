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

/** The stage an anchor belongs to, from its id: "solar:…" and "bh:…" ids; everything else is the lab. */
export function anchorStage(id: string): "lab" | "solar" | "blackhole" {
  return id.startsWith("solar:") ? "solar" : id.startsWith("bh:") ? "blackhole" : "lab";
}

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
 * The part of the window not covered by the navigation, the notes or the
 * dock (CSS px). Labels whose anchor falls outside it are hidden rather than
 * drawn under the panels, and so are labels that would run under the caption
 * at the top of the view (`avoid`; empty when right ≤ left).
 */
export const stageRect = {
  left: 0,
  top: 0,
  right: Infinity,
  bottom: Infinity,
  avoid: { left: 0, top: 0, right: 0, bottom: 0 },
};
