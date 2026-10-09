"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { CLOCK_A_POSITION, CLOCK_B_ANGLE, CLOCK_B_RADIUS, wellHeight } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";
import { Halo } from "./Halo";

const MAST = 2.2;

/**
 * MODULE C — time dilation (3D part).
 *
 * A beacon marks each clock on the fabric: Clock A on the flat edge of the
 * grid (standing in for "very far away"), Clock B deep in the well beside the
 * central mass. Each carries a small tag; the readable dials and the graph
 * live in the interface (ClockStrip and the Time tab).
 */
export function TimeClocks() {
  const group = useRef<THREE.Group>(null);
  const beaconB = useRef<THREE.Group>(null);

  useFrame(() => {
    if (sim.stage !== "lab") return; // hidden while another stage is shown
    // Hidden on the Bending light tab too, where a cyan diamond is the lensing observer.
    const visible = sim.expand < 0.02 && useLab.getState().focus !== "B";
    if (group.current) group.current.visible = visible;

    const bx = Math.cos(CLOCK_B_ANGLE) * CLOCK_B_RADIUS;
    const bz = Math.sin(CLOCK_B_ANGLE) * CLOCK_B_RADIUS;
    const by = wellHeight(CLOCK_B_RADIUS, sim.m) + 0.35;
    beaconB.current?.position.set(bx, by, bz);

    const a = getAnchor("clockA");
    a.world.set(CLOCK_A_POSITION[0], CLOCK_A_POSITION[1] + MAST + 0.5, CLOCK_A_POSITION[2]);
    a.visible = visible;
    const b = getAnchor("clockB");
    b.world.set(bx, by + MAST + 0.5, bz);
    b.visible = visible;
  });

  return (
    <group ref={group}>
      <group position={CLOCK_A_POSITION}>
        <Beacon color={[0.7, 2.2, 2.4]} halo={[0.29, 0.92, 1.0]} />
      </group>
      <group ref={beaconB}>
        <Beacon color={[2.6, 1.6, 0.6]} halo={[1.0, 0.62, 0.23]} />
      </group>
    </group>
  );
}

function Beacon({ color, halo }: { color: [number, number, number]; halo: [number, number, number] }) {
  return (
    <group>
      <mesh>
        <octahedronGeometry args={[0.32, 0]} />
        <meshBasicMaterial color={color} toneMapped={false} wireframe />
      </mesh>
      <Halo color={halo} size={0.9} opacity={0.7} />
      <mesh position={[0, MAST / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, MAST, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
