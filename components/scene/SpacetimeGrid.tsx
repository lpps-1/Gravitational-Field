"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID_HALF, MAX_DEPTH, wellHeight } from "@/lib/physics";
import { mirajPhases, sim } from "@/lib/store";

/** Sample points per side. Lines are drawn every LINE_EVERY samples. */
const SAMPLES = 161;
const LINE_EVERY = 4;

const BASE = new THREE.Color("#9fd3ff");
const DEEP = new THREE.Color("#ffb45a");

/**
 * MODULE A — the fabric of spacetime.
 *
 * A square lattice of points, joined into grid lines. Each frame the lattice
 * is displaced downward by the gravity-well profile of the current mass, and
 * coloured from cool blue (flat) to amber (deep) so the curvature reads at a
 * glance. Lines fade out toward the edges of the grid.
 */
export function SpacetimeGrid() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const last = useRef({ m: -1, fade: -1 });

  const { geometry, radii, edgeFade } = useMemo(() => {
    const n = SAMPLES;
    const positions = new Float32Array(n * n * 3);
    const colors = new Float32Array(n * n * 3);
    const radii = new Float32Array(n * n);
    const edgeFade = new Float32Array(n * n);
    const step = (GRID_HALF * 2) / (n - 1);

    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = -GRID_HALF + i * step;
        const z = -GRID_HALF + j * step;
        positions[k * 3] = x;
        positions[k * 3 + 2] = z;
        radii[k] = Math.hypot(x, z);
        const edge = Math.max(Math.abs(x), Math.abs(z)) / GRID_HALF;
        edgeFade[k] = Math.pow(1 - Math.min(1, Math.max(0, (edge - 0.55) / 0.45)), 1.6);
      }
    }

    const index: number[] = [];
    for (let j = 0; j < n; j += LINE_EVERY) {
      for (let i = 0; i < n - 1; i++) index.push(j * n + i, j * n + i + 1);
    }
    for (let i = 0; i < n; i += LINE_EVERY) {
      for (let j = 0; j < n - 1; j++) index.push(j * n + i, (j + 1) * n + i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(index);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -MAX_DEPTH / 2, 0), GRID_HALF * 1.5);
    return { geometry, radii, edgeFade };
  }, []);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const { expand } = mirajPhases();
    // Cross-fade out while the Seven Skies take over.
    const fade = 1 - expand;
    line.visible = fade > 0.001;
    if (!line.visible) return;
    if (Math.abs(last.current.m - sim.m) < 1e-5 && Math.abs(last.current.fade - fade) < 1e-5) return;
    last.current = { m: sim.m, fade };

    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const c = new THREE.Color();
    for (let k = 0; k < radii.length; k++) {
      const y = wellHeight(radii[k], sim.m);
      pos[k * 3 + 1] = y;
      const depth = Math.min(1, -y / MAX_DEPTH);
      c.copy(BASE).lerp(DEEP, Math.pow(depth, 0.7));
      const glow = (0.32 + 1.1 * depth) * edgeFade[k] * fade;
      col[k * 3] = c.r * glow;
      col[k * 3 + 1] = c.g * glow;
      col[k * 3 + 2] = c.b * glow;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}
