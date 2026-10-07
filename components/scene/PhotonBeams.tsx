"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Line2, LineGeometry } from "three-stdlib";
import { GRID_HALF, IMPACT_SEQUENCE, PHOTON_LIFT, tracePhoton, wellHeight, type PhotonPath } from "@/lib/physics";
import { mirajPhases, sim, useLab } from "@/lib/store";

/** Photon speed along its path, in grid units per second. */
const SPEED = 24;
/** Length of the bright streak behind the photon. */
const STREAK = 7;
/** How long the faint record of the path lingers after the photon exits. */
const AFTERGLOW = 3.5;
/** Faint brightness of the path already travelled. */
const RESIDUAL = 0.14;

const BEAM_COLOR = new THREE.Color(1.0, 0.86, 0.55);

interface Shot {
  id: number;
  path: PhotonPath;
  mass: number;
}

/**
 * MODULE B — gravitational lensing.
 *
 * Every press of "Fire Photon Beam" traces a photon across the grid using the
 * mass the slider is set to. With no mass it flies dead straight; with a
 * heavy mass its path is bent around (or swallowed by) the well. A dashed
 * guide shows the straight line it would have taken through flat space.
 */
export function PhotonBeams() {
  const shots = useLab((s) => s.photonShots);
  const [beams, setBeams] = useState<Shot[]>([]);

  useEffect(() => {
    if (shots === 0) return;
    const { mass, miraj } = useLab.getState();
    if (miraj) return; // In Miraj mode the photon travels through the wormhole instead.
    const m = mass / 100;
    const impact = IMPACT_SEQUENCE[(shots - 1) % IMPACT_SEQUENCE.length];
    const path = tracePhoton(m, impact);
    sim.lastShot = { deflection: path.deflection, captured: path.captured, impact, mass };
    setBeams((prev) => [...prev.slice(-5), { id: shots, path, mass: m }]);
  }, [shots]);

  const remove = useCallback((id: number) => setBeams((prev) => prev.filter((b) => b.id !== id)), []);

  // Beams belong to the gravity-well grid; hide them while the Seven Skies are up.
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = mirajPhases().expand < 0.02;
  });

  return (
    <group ref={group}>
      {beams.map((b) => (
        <Beam key={b.id} shot={b} onDone={remove} />
      ))}
    </group>
  );
}

function Beam({ shot, onDone }: { shot: Shot; onDone: (id: number) => void }) {
  const { path, mass } = shot;
  const lineRef = useRef<Line2>(null);
  const guideRef = useRef<Line2>(null);
  const head = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);
  const age = useRef(0);
  const cursor = useRef(0);
  const finished = useRef(false);

  const count = path.arc.length;
  const points = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let k = 0; k < count; k++) out.push([path.points[k * 3], path.points[k * 3 + 1], path.points[k * 3 + 2]]);
    return out;
  }, [path, count]);
  const blackColors = useMemo(() => points.map(() => [0, 0, 0] as [number, number, number]), [points]);

  // The straight line the photon would follow through flat spacetime, draped on the fabric.
  const guide = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let x = -GRID_HALF; x <= GRID_HALF; x += 0.5) {
      out.push([x, wellHeight(Math.hypot(x, path.impact), mass) + PHOTON_LIFT * 0.5, path.impact]);
    }
    return out;
  }, [path.impact, mass]);

  useFrame((_, delta) => {
    const line = lineRef.current;
    if (!line || finished.current) return;
    age.current += Math.min(delta, 0.1);
    const travel = path.length / SPEED;
    const s = Math.min(path.length, age.current * SPEED);
    const after = Math.max(0, age.current - travel);
    const residual = RESIDUAL * Math.max(0, 1 - after / AFTERGLOW);

    if (after >= AFTERGLOW) {
      finished.current = true;
      onDone(shot.id);
      return;
    }

    // Repaint the streak: bright just behind the head, a faint record further back.
    const geom = line.geometry as LineGeometry;
    const attr = geom.attributes.instanceColorStart as THREE.InterleavedBufferAttribute;
    const arr = attr.data.array as Float32Array;
    const fadeHead = after > 0 ? Math.max(0, 1 - after * 3) : 1;
    const intensity = (k: number) => {
      const d = s - path.arc[k];
      if (d < 0) return 0;
      const streak = d < STREAK ? Math.pow(1 - d / STREAK, 1.6) * 3.2 * fadeHead : 0;
      return streak + residual;
    };
    let prev = intensity(0);
    for (let k = 0; k < count - 1; k++) {
      const next = intensity(k + 1);
      const o = k * 6;
      arr[o] = BEAM_COLOR.r * prev;
      arr[o + 1] = BEAM_COLOR.g * prev;
      arr[o + 2] = BEAM_COLOR.b * prev;
      arr[o + 3] = BEAM_COLOR.r * next;
      arr[o + 4] = BEAM_COLOR.g * next;
      arr[o + 5] = BEAM_COLOR.b * next;
      prev = next;
    }
    attr.data.needsUpdate = true;

    // Move the glowing head along the path.
    while (cursor.current < count - 2 && path.arc[cursor.current + 1] < s) cursor.current++;
    const i = cursor.current;
    const a0 = path.arc[i];
    const a1 = path.arc[i + 1] ?? a0;
    const f = a1 > a0 ? Math.min(1, (s - a0) / (a1 - a0)) : 0;
    if (head.current) {
      head.current.position.set(
        THREE.MathUtils.lerp(path.points[i * 3], path.points[(i + 1) * 3] ?? path.points[i * 3], f),
        THREE.MathUtils.lerp(path.points[i * 3 + 1], path.points[(i + 1) * 3 + 1] ?? path.points[i * 3 + 1], f),
        THREE.MathUtils.lerp(path.points[i * 3 + 2], path.points[(i + 1) * 3 + 2] ?? path.points[i * 3 + 2], f),
      );
      head.current.visible = after === 0;
    }

    // A captured photon ends in a brief flare at the central body.
    if (flash.current) {
      const show = path.captured && after > 0;
      flash.current.visible = show;
      if (show) {
        const k = Math.min(1, after / 0.9);
        flash.current.scale.setScalar(0.4 + k * 2.4);
        (flash.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      }
    }

    if (guideRef.current) {
      const g = mass > 0.02 ? 0.35 * Math.max(0, 1 - after / AFTERGLOW) : 0;
      guideRef.current.material.color.setRGB(0.55 * g, 0.85 * g, 1.0 * g);
    }
  });

  const end = points[points.length - 1];

  return (
    <group>
      <Line
        ref={guideRef}
        points={guide}
        color="black"
        lineWidth={1.2}
        dashed
        dashSize={0.45}
        gapSize={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      <Line
        ref={lineRef}
        points={points}
        vertexColors={blackColors}
        lineWidth={3.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      <group ref={head} position={points[0]}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshBasicMaterial color={[6, 5.2, 3.6]} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshBasicMaterial
            color={[1.6, 1.2, 0.6]}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh ref={flash} position={end} visible={false}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          color={[3, 1.8, 0.8]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
