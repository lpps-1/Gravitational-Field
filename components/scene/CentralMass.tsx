"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { centralBodyRadius, wellHeight } from "@/lib/physics";
import { mirajPhases, sim } from "@/lib/store";

/** The glowing body at the bottom of the gravity well. */
export function CentralMass() {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const { expand } = mirajPhases();
    const visible = sim.m > 0.01 && expand < 0.02;
    g.visible = visible;
    if (!visible) return;
    const r = centralBodyRadius(sim.m);
    g.position.y = wellHeight(0, sim.m) + r * 0.35;
    g.scale.setScalar(r);
    if (halo.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
      halo.current.scale.setScalar(1.9 * pulse);
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
    </group>
  );
}
