import * as THREE from "three";

/**
 * Screen anchors: DOM overlays pinned to points in the 3D scene.
 *
 * Scene components write a world position (and visibility) for an anchor id;
 * a DOM component registers the element to move; `AnchorProjector` (inside
 * the Canvas) projects each anchor once per frame and positions its element.
 * This keeps the overlays as ordinary React DOM, outside the WebGL canvas.
 */
export interface Anchor {
  el: HTMLElement | null;
  world: THREE.Vector3;
  visible: boolean;
  opacity: number;
  /** Scale = distanceFactor / camera distance (clamped). */
  distanceFactor: number;
}

export const anchors = new Map<string, Anchor>();

export function getAnchor(id: string): Anchor {
  let a = anchors.get(id);
  if (!a) {
    a = { el: null, world: new THREE.Vector3(), visible: false, opacity: 1, distanceFactor: 30 };
    anchors.set(id, a);
  }
  return a;
}
