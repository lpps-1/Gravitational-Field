"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { prefersReducedMotion } from "@/lib/hooks";
import { ORBIT_RELEASE_MASS, centralBodyRadius, wellHeight } from "@/lib/physics";
import { sim } from "@/lib/store";
import { Halo } from "./Halo";

/** The glowing body at the bottom of the gravity well. */
export function CentralMass() {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const pulse = useRef(0);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const visible = sim.m > ORBIT_RELEASE_MASS && sim.expand < 0.02;
    g.visible = visible;

    const label = getAnchor("mass");
    label.visible = visible;
    if (!visible) return;

    const r = centralBodyRadius(sim.m);
    g.position.y = wellHeight(0, sim.m) + r * 0.35;
    g.scale.setScalar(r);
    label.world.set(0, g.position.y - r * 1.2, r * 1.9);

    if (halo.current) {
      pulse.current += sim.dt;
      const wobble = prefersReducedMotion() ? 0 : Math.sin(pulse.current * 2.2) * 0.04;
      halo.current.scale.setScalar(1.9 * (1 + wobble));
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color={[3.2, 2.1, 1.0]} toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshBasicMaterial
          color={[0.9, 0.45, 0.12]}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Halo color={[1.0, 0.55, 0.18]} size={4.5} opacity={0.8} />
    </group>
  );
}
