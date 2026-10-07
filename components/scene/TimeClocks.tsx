"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { CLOCK_A_POSITION, CLOCK_B_RADIUS, wellHeight } from "@/lib/physics";
import { mirajPhases, sim } from "@/lib/store";

/** Clock B sits on this bearing in the well (toward the default camera). */
const CLOCK_B_ANGLE = Math.PI * 0.28;
/** Height of the mast that lifts each clock's readout above the fabric. */
const MAST_A = 2.4;
const MAST_B = 6.2;

/**
 * MODULE C — time dilation (3D part).
 *
 * Places a beacon for each clock on the fabric: Clock A on the flat edge of
 * the grid, Clock B deep in the well beside the central mass. A thin mast
 * rises from each beacon to the point where its digital readout (a DOM
 * overlay, see `ui/ClockOverlay`) is pinned, so the readouts follow the
 * camera and grow as you zoom in on them.
 */
export function TimeClocks() {
  const group = useRef<THREE.Group>(null);
  const beaconB = useRef<THREE.Group>(null);
  const mastB = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const visible = mirajPhases().expand < 0.02;
    if (group.current) group.current.visible = visible;

    const bx = Math.cos(CLOCK_B_ANGLE) * CLOCK_B_RADIUS;
    const bz = Math.sin(CLOCK_B_ANGLE) * CLOCK_B_RADIUS;
    const by = wellHeight(CLOCK_B_RADIUS, sim.m) + 0.35;
    beaconB.current?.position.set(bx, by, bz);
    // Keep the readout at the same height above flat space, however deep the well.
    const mast = MAST_B - by;
    if (mastB.current) {
      mastB.current.scale.y = mast;
      mastB.current.position.y = mast / 2;
    }

    const a = getAnchor("clockA");
    a.world.set(CLOCK_A_POSITION[0], CLOCK_A_POSITION[1] + MAST_A, CLOCK_A_POSITION[2]);
    a.visible = visible;
    const b = getAnchor("clockB");
    b.world.set(bx, MAST_B, bz);
    b.visible = visible;
  });

  return (
    <group ref={group}>
      <group position={CLOCK_A_POSITION}>
        <Beacon color={[0.7, 2.2, 2.4]} />
        <mesh position={[0, MAST_A / 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, MAST_A, 6]} />
          <meshBasicMaterial color={[0.5, 1.6, 1.7]} toneMapped={false} />
        </mesh>
      </group>
      <group ref={beaconB}>
        <Beacon color={[2.6, 1.6, 0.6]} />
        <mesh ref={mastB}>
          <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
          <meshBasicMaterial color={[1.8, 1.1, 0.45]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Beacon({ color }: { color: [number, number, number] }) {
  return (
    <mesh>
      <octahedronGeometry args={[0.32, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} wireframe />
    </mesh>
  );
}
