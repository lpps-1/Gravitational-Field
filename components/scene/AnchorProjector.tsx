"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { anchors } from "@/lib/anchors";

/** Projects every screen anchor into the viewport. Mount it last in the Canvas. */
export function AnchorProjector() {
  const v = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    anchors.forEach((a) => {
      const el = a.el;
      if (!el) return;
      v.current.copy(a.world).project(camera);
      const onScreen = a.visible && a.opacity > 0.01 && v.current.z < 1 && Math.abs(v.current.x) < 1.3 && Math.abs(v.current.y) < 1.3;
      if (!onScreen) {
        el.style.visibility = "hidden";
        return;
      }
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      const dist = camera.position.distanceTo(a.world);
      const s = THREE.MathUtils.clamp(a.distanceFactor / dist, 0.45, 1.25);
      el.style.visibility = "visible";
      el.style.opacity = String(a.opacity);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    });
  });

  return null;
}
