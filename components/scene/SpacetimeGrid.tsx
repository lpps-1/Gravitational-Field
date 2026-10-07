"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GRID_HALF, MAX_DEPTH, wellProfile } from "@/lib/physics";
import { createGridMaterial } from "@/lib/shaders";
import { sim } from "@/lib/store";

/** Sample points per side. Lines are drawn every LINE_EVERY samples (1 grid unit apart). */
const SAMPLES = 161;
const LINE_EVERY = 4;

/**
 * MODULE A — the fabric of spacetime.
 *
 * A square lattice of grid lines. The geometry never changes: its vertex
 * shader lowers every point by the well profile times the current mass and
 * colours it from cool blue (flat) to amber (deeply curved), so moving the
 * mass slider costs the CPU nothing. Lines fade out toward the grid edge.
 */
export function SpacetimeGrid() {
  const lineRef = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(buildGrid, []);
  const material = useMemo(createGridMaterial, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    // Cross-fade out while the Seven Skies take over.
    const fade = 1 - sim.expand;
    line.visible = fade > 0.001;
    material.uniforms.uMass.value = sim.m;
    material.uniforms.uFade.value = fade;
  });

  return <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Only the vertices that lie on a drawn line are kept (11.5k of the 26k lattice points). */
function buildGrid() {
  const n = SAMPLES;
  const step = (GRID_HALF * 2) / (n - 1);
  const ids = new Int32Array(n * n).fill(-1);
  const positions: number[] = [];
  const profile: number[] = [];
  const edge: number[] = [];

  const vertex = (i: number, j: number) => {
    const key = j * n + i;
    if (ids[key] >= 0) return ids[key];
    const x = -GRID_HALF + i * step;
    const z = -GRID_HALF + j * step;
    const e = Math.max(Math.abs(x), Math.abs(z)) / GRID_HALF;
    positions.push(x, 0, z);
    profile.push(wellProfile(Math.sqrt(x * x + z * z)));
    edge.push(Math.pow(1 - Math.min(1, Math.max(0, (e - 0.55) / 0.45)), 1.6));
    ids[key] = profile.length - 1;
    return ids[key];
  };

  const index: number[] = [];
  for (let j = 0; j < n; j += LINE_EVERY) {
    for (let i = 0; i < n - 1; i++) index.push(vertex(i, j), vertex(i + 1, j));
  }
  for (let i = 0; i < n; i += LINE_EVERY) {
    for (let j = 0; j < n - 1; j++) index.push(vertex(i, j), vertex(i, j + 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aProfile", new THREE.Float32BufferAttribute(profile, 1));
  geometry.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 1));
  geometry.setIndex(index);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -MAX_DEPTH / 2, 0), GRID_HALF * 1.5);
  return geometry;
}
