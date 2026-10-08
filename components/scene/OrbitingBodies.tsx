"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { ORBIT_RELEASE_MASS, WELL_RADIUS, orbitalGM, solveKepler, wellHeight } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";
import { Halo, useHalosEnabled } from "./Halo";

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
  /** Anchor id for an in-scene label, if this body has one. */
  label?: string;
}

const ORBITS: Orbit[] = [
  { a: 4.6, e: 0, tilt: 0, phase: 0.0, size: 0.22, color: [0.6, 2.6, 2.4], trail: "#7ff7e6" },
  { a: 7.4, e: 0.08, tilt: 1.1, phase: 2.1, size: 0.3, color: [2.4, 2.2, 1.0], trail: "#ffe69a" },
  { a: 11, e: 0.42, tilt: 2.4, phase: 4.0, size: 0.26, color: [1.0, 1.8, 3.0], trail: "#9ec9ff", label: "ellipse" },
  { a: 14.6, e: 0.12, tilt: 4.2, phase: 1.0, size: 0.34, color: [2.6, 1.3, 2.4], trail: "#ffa8ec" },
];

/** Visual speed-up of the orbits (they would otherwise be very slow). */
const ORBIT_SPEED = 4.2;
const TRAIL_POINTS = 60;
const OUTLINE_POINTS = 128;
/** Bodies released at zero mass are hidden once they are this far out. */
const ESCAPE_RADIUS = WELL_RADIUS + 6;
/** Halo tint: the body's hue at full brightness, no brighter (halos only show without bloom). */
const haloTint = (c: [number, number, number]): [number, number, number] => {
  const k = Math.max(...c);
  return [c[0] / k, c[1] / k, c[2] / k];
};
/** Without bloom, colours above 1 clip to plain white: use a pastel of the hue so bodies stay told apart. */
const pastelTint = (c: [number, number, number]): [number, number, number] =>
  haloTint(c).map((v) => 0.45 + 0.55 * v) as [number, number, number];

/**
 * MODULE A — "yasbahun": bodies swimming in their orbits.
 *
 * Each body rides the curved fabric. Motion follows Kepler's laws: the mean
 * anomaly advances at n = √(GM / a³), and Kepler's equation turns that into a
 * position on the ellipse, so bodies speed up near the centre and slow down
 * far out. A faint outline shows each whole orbit. With the mass set to zero
 * there is nothing to orbit: the bodies fly off in straight lines.
 */
export function OrbitingBodies() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) group.current.visible = sim.expand < 0.02;
  });

  return (
    <group ref={group}>
      {ORBITS.map((o, i) => (
        <Body key={i} orbit={o} />
      ))}
    </group>
  );
}

type Mode = "orbit" | "flying" | "gone";

function Body({ orbit }: { orbit: Orbit }) {
  const size = useThree((s) => s.size);
  const resets = useLab((s) => s.resets);
  const halos = useHalosEnabled();
  const mesh = useRef<THREE.Mesh>(null);
  const outline = useRef<THREE.LineLoop>(null);
  const trailMesh = useRef<THREE.Mesh>(null);

  const cos = Math.cos(orbit.tilt);
  const sin = Math.sin(orbit.tilt);
  const b = orbit.a * Math.sqrt(1 - orbit.e * orbit.e);

  /** Position in the plane for a mean anomaly (ellipse with the mass at one focus). */
  const planar = (anomaly: number, out: THREE.Vector2) => {
    const E = solveKepler(anomaly, orbit.e);
    const px = orbit.a * (Math.cos(E) - orbit.e);
    const pz = b * Math.sin(E);
    return out.set(px * cos - pz * sin, px * sin + pz * cos);
  };
  const lift = (p: THREE.Vector2) => wellHeight(p.length(), sim.m) + orbit.size + 0.05;

  const [state] = useState(() => {
    const flat = planar(orbit.phase, new THREE.Vector2());
    return {
      anomaly: orbit.phase,
      mode: "orbit" as Mode,
      flat,
      velocity: new THREE.Vector2(),
      scratch: new THREE.Vector2(),
      appear: 1,
      outlineMass: -1,
      start: new THREE.Vector3(flat.x, lift(flat), flat.y),
    };
  });

  // Trail: a preallocated MeshLine shifted in place every frame (no per-frame garbage).
  const [trail] = useState(() => {
    const geometry = new MeshLineGeometry();
    geometry.setPoints(filledPoints(state.start), (t: number) => t * t);
    const material = new MeshLineMaterial({
      color: new THREE.Color(orbit.trail),
      lineWidth: orbit.size * 0.45,
      sizeAttenuation: 1,
      resolution: new THREE.Vector2(1, 1),
    });
    material.transparent = true;
    material.depthWrite = false;
    return { geometry, material };
  });

  const [outlineGeometry] = useState(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(OUTLINE_POINTS * 3), 3));
    return g;
  });

  useEffect(() => {
    trail.material.uniforms.resolution.value.set(size.width, size.height);
  }, [size, trail]);

  useEffect(
    () => () => {
      trail.geometry.dispose();
      trail.material.dispose();
      outlineGeometry.dispose();
    },
    [trail, outlineGeometry],
  );

  const respawn = () => {
    const y = lift(state.flat);
    mesh.current?.position.set(state.flat.x, y, state.flat.y);
    trail.geometry.setPoints(filledPoints(new THREE.Vector3(state.flat.x, y, state.flat.y)), (t: number) => t * t);
  };

  // Reset all: back to the starting point of the orbit.
  useEffect(() => {
    if (resets === 0) return;
    state.anomaly = orbit.phase;
    state.mode = "orbit";
    state.appear = 1;
    planar(state.anomaly, state.flat);
    respawn();
    // `planar` and `respawn` only close over refs and constants.
  }, [resets]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const dt = sim.dt;
    const massOn = useLab.getState().mass > 0;

    if (state.mode === "orbit") {
      if (!massOn || sim.m < ORBIT_RELEASE_MASS) {
        // The mass has been removed: carry on at the current orbital velocity, in a straight line.
        const n = Math.sqrt(orbitalGM(Math.max(sim.m, ORBIT_RELEASE_MASS)) / Math.pow(orbit.a, 3)) * ORBIT_SPEED;
        planar(state.anomaly + 1e-3, state.scratch);
        planar(state.anomaly, state.flat);
        state.velocity.subVectors(state.scratch, state.flat).multiplyScalar(n / 1e-3);
        state.mode = "flying";
      } else if (dt > 0) {
        const n = Math.sqrt(orbitalGM(sim.m) / Math.pow(orbit.a, 3)) * ORBIT_SPEED;
        state.anomaly = (state.anomaly + n * dt) % (Math.PI * 2);
        planar(state.anomaly, state.flat);
      }
    }

    if (state.mode === "flying") {
      state.flat.addScaledVector(state.velocity, dt);
      if (state.flat.length() > ESCAPE_RADIUS) state.mode = "gone";
    }

    if (state.mode !== "orbit" && massOn && sim.m >= ORBIT_RELEASE_MASS) {
      // The mass is back: return to the orbit and fade in again.
      state.mode = "orbit";
      state.appear = 0;
      planar(state.anomaly, state.flat);
      respawn();
    }

    state.appear = Math.min(1, state.appear + dt * 2);
    const r = state.flat.length();
    // Released bodies keep full size inside the well and shrink away beyond it.
    const fadeOut = state.mode === "orbit" ? 1 : Math.min(1, Math.max(0, 1 - (r - WELL_RADIUS) / (ESCAPE_RADIUS - WELL_RADIUS)));
    const scale = Math.max(0.001, state.appear * fadeOut);
    m.scale.setScalar(scale);
    m.visible = state.mode !== "gone";
    m.position.set(state.flat.x, lift(state.flat), state.flat.y);

    if (dt > 0) trail.geometry.advance(m.position);
    if (trailMesh.current) trailMesh.current.visible = state.mode !== "gone";
    trail.material.uniforms.opacity.value = scale;

    // Outline of the whole orbit, re-draped only when the mass changes.
    const line = outline.current;
    if (line) {
      line.visible = state.mode === "orbit";
      if (line.visible && Math.abs(state.outlineMass - sim.m) > 1e-3) {
        state.outlineMass = sim.m;
        const arr = outlineGeometry.attributes.position.array as Float32Array;
        for (let k = 0; k < OUTLINE_POINTS; k++) {
          // Sample by eccentric anomaly for an evenly spaced outline.
          const E = (k / OUTLINE_POINTS) * Math.PI * 2;
          const px = orbit.a * (Math.cos(E) - orbit.e);
          const pz = b * Math.sin(E);
          const x = px * cos - pz * sin;
          const z = px * sin + pz * cos;
          arr[k * 3] = x;
          arr[k * 3 + 1] = wellHeight(Math.sqrt(x * x + z * z), sim.m) + 0.06;
          arr[k * 3 + 2] = z;
        }
        outlineGeometry.attributes.position.needsUpdate = true;
      }
    }

    if (orbit.label) {
      const label = getAnchor(orbit.label);
      label.world.set(m.position.x, m.position.y + 0.9, m.position.z);
      label.visible = state.mode === "orbit" && sim.expand < 0.02;
      label.opacity = state.appear;
    }
  });

  return (
    <group>
      <lineLoop ref={outline} geometry={outlineGeometry} frustumCulled={false}>
        <lineBasicMaterial
          color={orbit.trail}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineLoop>
      <mesh ref={trailMesh} geometry={trail.geometry} material={trail.material} frustumCulled={false} />
      <mesh ref={mesh} position={state.start}>
        <sphereGeometry args={[orbit.size, 24, 16]} />
        <meshBasicMaterial color={halos ? pastelTint(orbit.color) : orbit.color} toneMapped={false} />
        <Halo color={haloTint(orbit.color)} size={orbit.size * 6} opacity={0.9} />
      </mesh>
    </group>
  );
}

function filledPoints(p: THREE.Vector3) {
  const pts = new Float32Array(TRAIL_POINTS * 3);
  for (let i = 0; i < TRAIL_POINTS; i++) {
    pts[i * 3] = p.x;
    pts[i * 3 + 1] = p.y;
    pts[i * 3 + 2] = p.z;
  }
  return pts;
}
