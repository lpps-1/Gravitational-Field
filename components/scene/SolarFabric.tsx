"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { DENT_REACH, DENTS, FABRIC_RADIUS, FABRIC_Y, fabricDepth, fabricState } from "@/lib/fabric";
import { prefersReducedMotion } from "@/lib/hooks";
import type { Tier } from "@/lib/quality";
import { createDentRingsMaterial, createFabricMaterial } from "@/lib/shaders";
import { BODIES, PLANET_IDS, visualRadius, type OrbitPoint } from "@/lib/solar";
import { sim, useLab } from "@/lib/store";
import { haloTexture } from "./Halo";

/**
 * Grid line spacing and samples per line spacing, per graphics tier. Lines
 * any closer would hide the orbits; the samples keep the dents smooth.
 */
const DENSITY: Record<Tier, { spacing: number; samples: number }> = {
  high: { spacing: 2, samples: 6 },
  low: { spacing: 2, samples: 4 },
  cpu: { spacing: 2, samples: 3 },
};

/** Seconds for the fabric to settle in or fade out. */
const EASE_RATE = 3;

/**
 * Chapter S: the gravity fabric (switch "Gravity fabric", key G).
 *
 * Chapter 1's spacetime grid laid under the real orbits (lib/fabric.ts): the
 * Sun sinks a deep well and each planet a dent in its own colour, which
 * travels with it. The geometry never changes; the vertex shaders move the
 * dents (and a set of rings around each planet) to the planets' positions
 * every frame. A thin line drops from each planet to the bottom of its dent,
 * so it is clear whose dent is whose.
 *
 * `points` are the planets' positions, written by SolarSystem earlier in the
 * same frame.
 */
export function SolarFabric({ points }: { points: OrbitPoint[] }) {
  const [a] = useState(() => createAssets(useLab.getState().tier));
  const [state] = useState(() => ({ show: 0, centres: new Float32Array(PLANET_IDS.length * 2) }));

  useEffect(() => () => a.dispose(), [a]);

  useFrame((_, delta) => {
    if (sim.stage !== "solar") return;
    const target = useLab.getState().solarFabric ? 1 : 0;
    // Real time, not simulation time: the switch still eases while the clock is paused.
    if (prefersReducedMotion()) state.show = target;
    else {
      state.show += (target - state.show) * (1 - Math.exp(-Math.min(delta, 0.1) * EASE_RATE));
      if (Math.abs(target - state.show) < 0.002) state.show = target;
    }
    const t = state.show;
    const grow = t * t * (3 - 2 * t);
    fabricState.grow = grow;
    const on = t > 0.001;
    a.group.visible = on;
    if (!on) return;

    const uniforms = a.material.uniforms;
    uniforms.uGrow.value = grow;
    uniforms.uFade.value = t;
    a.drops.opacity = t;
    a.glints.opacity = t;

    const dents = uniforms.uDents.value as THREE.Vector4[];
    for (let i = 0; i < PLANET_IDS.length; i++) {
      const p = points[i];
      state.centres[i * 2] = p.x;
      state.centres[i * 2 + 1] = p.z;
      dents[i].x = p.x;
      dents[i].y = p.z;
    }

    // Drop lines and glints: from just under each planet to the bottom of its dent.
    const line = a.dropGeometry.attributes.position.array as Float32Array;
    const glint = a.glintGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PLANET_IDS.length; i++) {
      const p = points[i];
      const bottom = FABRIC_Y - fabricDepth(p.x, p.z, state.centres, grow);
      line[i * 6] = line[i * 6 + 3] = glint[i * 3] = p.x;
      line[i * 6 + 2] = line[i * 6 + 5] = glint[i * 3 + 2] = p.z;
      line[i * 6 + 1] = p.y - visualRadius(PLANET_IDS[i]) * 1.1;
      line[i * 6 + 4] = glint[i * 3 + 1] = bottom;
    }
    a.dropGeometry.attributes.position.needsUpdate = true;
    a.glintGeometry.attributes.position.needsUpdate = true;
  });

  return <primitive object={a.group} />;
}

function createAssets(tier: Tier) {
  const geometry = buildSheet(DENSITY[tier]);
  const material = createFabricMaterial();
  // The rings share the sheet's uniforms, so one update per frame moves both.
  const ringMaterial = createDentRingsMaterial();
  for (const key of ["uDents", "uHues", "uGrow", "uFade"]) ringMaterial.uniforms[key] = material.uniforms[key];
  const ringGeometry = buildRings();
  const hues = material.uniforms.uHues.value as THREE.Color[];
  const dents = material.uniforms.uDents.value as THREE.Vector4[];
  PLANET_IDS.forEach((id, i) => {
    hues[i].set(BODIES[id].hue);
    dents[i].set(0, 0, DENTS[i].depth, DENTS[i].width);
  });
  const sheet = new THREE.LineSegments(geometry, material);
  sheet.frustumCulled = false;
  const rings = new THREE.LineSegments(ringGeometry, ringMaterial);
  rings.frustumCulled = false;

  // Each drop line runs from dim under the planet to bright at its dent.
  const dropGeometry = new THREE.BufferGeometry();
  dropGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PLANET_IDS.length * 6), 3));
  const dropColors = new Float32Array(PLANET_IDS.length * 6);
  const glintColors = new Float32Array(PLANET_IDS.length * 3);
  const c = new THREE.Color();
  PLANET_IDS.forEach((id, i) => {
    c.set(BODIES[id].hue);
    dropColors.set([c.r * 0.2, c.g * 0.2, c.b * 0.2, c.r * 0.8, c.g * 0.8, c.b * 0.8], i * 6);
    c.toArray(glintColors, i * 3);
  });
  dropGeometry.setAttribute("color", new THREE.BufferAttribute(dropColors, 3));
  const drops = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const dropLines = new THREE.LineSegments(dropGeometry, drops);
  dropLines.frustumCulled = false;

  const glintGeometry = new THREE.BufferGeometry();
  glintGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PLANET_IDS.length * 3), 3));
  glintGeometry.setAttribute("color", new THREE.BufferAttribute(glintColors, 3));
  // The same settings as the planet markers, so it shares their compiled shader.
  const glints = new THREE.PointsMaterial({
    size: 9,
    sizeAttenuation: false,
    map: haloTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const glintPoints = new THREE.Points(glintGeometry, glints);
  glintPoints.frustumCulled = false;

  const group = new THREE.Group();
  group.visible = false;
  group.add(sheet, rings, dropLines, glintPoints);

  return {
    group,
    material,
    drops,
    dropGeometry,
    glints,
    glintGeometry,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      dropGeometry.dispose();
      drops.dispose();
      glintGeometry.dispose();
      glints.dispose();
    },
  };
}

/**
 * A square lattice of grid lines clipped to a disc. Only vertices on a drawn
 * line are kept; each carries a fade toward the rim.
 */
function buildSheet({ spacing, samples }: { spacing: number; samples: number }) {
  const R = FABRIC_RADIUS;
  const lines = Math.floor(R / spacing);
  const n = lines * 2 * samples + 1;
  const step = spacing / samples;
  const ids = new Int32Array(n * n).fill(-1);
  const positions: number[] = [];
  const edge: number[] = [];

  const vertex = (i: number, j: number) => {
    const key = j * n + i;
    if (ids[key] >= 0) return ids[key];
    const x = -lines * spacing + i * step;
    const z = -lines * spacing + j * step;
    const r = Math.hypot(x, z);
    positions.push(x, 0, z);
    edge.push(Math.pow(1 - Math.min(1, Math.max(0, (r / R - 0.7) / 0.3)), 1.6));
    ids[key] = edge.length - 1;
    return ids[key];
  };
  const inside = (i: number, j: number) => Math.hypot(-lines * spacing + i * step, -lines * spacing + j * step) < R;

  const index: number[] = [];
  for (let j = 0; j < n; j += samples) {
    for (let i = 0; i < n - 1; i++) if (inside(i, j) && inside(i + 1, j)) index.push(vertex(i, j), vertex(i + 1, j));
  }
  for (let i = 0; i < n; i += samples) {
    for (let j = 0; j < n - 1; j++) if (inside(i, j) && inside(i, j + 1)) index.push(vertex(i, j), vertex(i, j + 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aEdge", new THREE.Float32BufferAttribute(edge, 1));
  geometry.setIndex(index);
  return geometry;
}

/** Rings (in dent widths) and spokes drawn around each planet. */
const RING_RADII = [0.4, 0.9, 1.6, 2.5, 3.4];
const RING_SEGMENTS = 48;
const SPOKES = 12;
const SPOKE_SAMPLES = 16;

/**
 * Rings and spokes around every planet, as offsets from it: the shader adds
 * the planet's position, so they travel with it and sink into its dent.
 */
function buildRings() {
  const positions: number[] = [];
  const planet: number[] = [];
  const fade: number[] = [];
  const index: number[] = [];
  DENTS.forEach(({ width }, p) => {
    const reach = width * DENT_REACH;
    const point = (r: number, angle: number) => {
      positions.push(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      planet.push(p);
      fade.push(Math.pow(1 - r / reach, 1.3));
      return fade.length - 1;
    };
    for (const k of RING_RADII) {
      const first = point(k * width, 0);
      for (let s = 1; s < RING_SEGMENTS; s++) point(k * width, (s / RING_SEGMENTS) * Math.PI * 2);
      for (let s = 0; s < RING_SEGMENTS; s++) index.push(first + s, first + ((s + 1) % RING_SEGMENTS));
    }
    for (let s = 0; s < SPOKES; s++) {
      const angle = ((s + 0.5) / SPOKES) * Math.PI * 2;
      const first = point(0.15 * width, angle);
      for (let k = 1; k <= SPOKE_SAMPLES; k++) {
        point((0.15 + (k / SPOKE_SAMPLES) * (DENT_REACH * 0.92 - 0.15)) * width, angle);
        index.push(first + k - 1, first + k);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aPlanet", new THREE.Float32BufferAttribute(planet, 1));
  geometry.setAttribute("aFade", new THREE.Float32BufferAttribute(fade, 1));
  geometry.setIndex(index);
  return geometry;
}
