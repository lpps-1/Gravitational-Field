"use client";

import { Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { orbitalGM, solveKepler, wellHeight } from "@/lib/physics";
import { mirajPhases, sim } from "@/lib/store";

interface Orbit {
  /** Semi-major axis. */
  a: number;
  /** Eccentricity (0 = circle). */
  e: number;
  /** Rotation of the ellipse in the plane. */
  tilt: number;
  /** Starting mean anomaly. */
  phase: number;
  size: number;
  color: [number, number, number];
  trail: string;
}

const ORBITS: Orbit[] = [
  { a: 4.6, e: 0, tilt: 0, phase: 0.0, size: 0.22, color: [0.6, 2.6, 2.4], trail: "#7ff7e6" },
  { a: 7.4, e: 0.08, tilt: 1.1, phase: 2.1, size: 0.3, color: [2.4, 2.2, 1.0], trail: "#ffe69a" },
  { a: 11, e: 0.42, tilt: 2.4, phase: 4.0, size: 0.26, color: [1.0, 1.8, 3.0], trail: "#9ec9ff" },
  { a: 14.6, e: 0.12, tilt: 4.2, phase: 1.0, size: 0.34, color: [2.6, 1.3, 2.4], trail: "#ffa8ec" },
];

/**
 * MODULE A — "yasbahun": bodies swimming in their orbits.
 *
 * Each body rides the curved fabric. Motion follows Kepler's laws: the mean
 * anomaly advances at n = √(GM / a³), and Kepler's equation turns that into a
 * position on the ellipse, so bodies speed up near the centre and slow down
 * far out. A heavier central mass makes every orbit faster.
 */
export function OrbitingBodies() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) group.current.visible = mirajPhases().expand < 0.02;
  });

  return (
    <group ref={group}>
      {ORBITS.map((o, i) => (
        <Body key={i} orbit={o} />
      ))}
    </group>
  );
}

function Body({ orbit }: { orbit: Orbit }) {
  const mesh = useRef<THREE.Mesh>(null);
  const anomaly = useRef(orbit.phase);
  const cos = Math.cos(orbit.tilt);
  const sin = Math.sin(orbit.tilt);
  const b = orbit.a * Math.sqrt(1 - orbit.e * orbit.e);

  /** Position on the orbit for the current mean anomaly, riding the fabric. */
  const place = (target: THREE.Vector3) => {
    const E = solveKepler(anomaly.current, orbit.e);
    // Ellipse with the central mass at one focus.
    const px = orbit.a * (Math.cos(E) - orbit.e);
    const pz = b * Math.sin(E);
    const x = px * cos - pz * sin;
    const z = px * sin + pz * cos;
    return target.set(x, wellHeight(Math.hypot(x, z), sim.m) + orbit.size + 0.05, z);
  };
  // Start on the orbit so the trail doesn't streak in from the origin.
  const [start] = useState(() => place(new THREE.Vector3()).toArray());

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    const n = Math.sqrt(orbitalGM(sim.m) / Math.pow(orbit.a, 3)) * 4.2;
    anomaly.current = (anomaly.current + n * dt) % (Math.PI * 2);
    place(m.position);
  });

  return (
    <Trail width={orbit.size * 4.5} length={7} color={orbit.trail} attenuation={(t) => t * t} decay={1}>
      <mesh ref={mesh} position={start}>
        <sphereGeometry args={[orbit.size, 24, 16]} />
        <meshBasicMaterial color={orbit.color} toneMapped={false} />
      </mesh>
    </Trail>
  );
}
