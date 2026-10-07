import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/**
 * Wide ("fat") lines whose buffers are allocated once and then rewritten in
 * place. Re-creating Line2 geometry or materials per shot would make three.js
 * recompile shaders mid-animation, which is what used to freeze the photon.
 */
export interface FatLine {
  line: Line2;
  geometry: LineGeometry;
  material: LineMaterial;
  maxPoints: number;
}

export function createFatLine(opts: {
  maxPoints: number;
  width: number;
  dashed?: boolean;
  vertexColors?: boolean;
  dashSize?: number;
  gapSize?: number;
}): FatLine {
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(opts.maxPoints * 3));
  if (opts.vertexColors) geometry.setColors(new Float32Array(opts.maxPoints * 3));
  const material = new LineMaterial({
    linewidth: opts.width,
    vertexColors: Boolean(opts.vertexColors),
    dashed: Boolean(opts.dashed),
    dashSize: opts.dashSize ?? 0.45,
    gapSize: opts.gapSize ?? 0.35,
    transparent: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  material.color.set(opts.vertexColors ? 0xffffff : 0x000000);
  const line = new Line2(geometry, material);
  if (opts.dashed) line.computeLineDistances();
  line.frustumCulled = false;
  line.visible = false;
  return { line, geometry, material, maxPoints: opts.maxPoints };
}

/** Write `count` points (flat xyz) into the line without reallocating. */
export function writeLinePoints(fat: FatLine, points: ArrayLike<number>, count: number) {
  const n = Math.min(count, fat.maxPoints);
  const attr = fat.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
  const seg = attr.data.array as Float32Array;
  for (let i = 0; i < n - 1; i++) {
    const o = i * 6;
    seg[o] = points[i * 3];
    seg[o + 1] = points[i * 3 + 1];
    seg[o + 2] = points[i * 3 + 2];
    seg[o + 3] = points[i * 3 + 3];
    seg[o + 4] = points[i * 3 + 4];
    seg[o + 5] = points[i * 3 + 5];
  }
  attr.data.needsUpdate = true;
  fat.geometry.instanceCount = Math.max(0, n - 1);

  // Dashed lines also need the running distance along the line.
  const dist = fat.geometry.attributes.instanceDistanceStart as THREE.InterleavedBufferAttribute | undefined;
  if (dist) {
    const d = dist.data.array as Float32Array;
    let total = 0;
    for (let i = 0; i < n - 1; i++) {
      const o = i * 6;
      d[i * 2] = total;
      total += Math.hypot(seg[o + 3] - seg[o], seg[o + 4] - seg[o + 1], seg[o + 5] - seg[o + 2]);
      d[i * 2 + 1] = total;
    }
    dist.data.needsUpdate = true;
  }
}

/** Colour accessor for in-place per-segment colour writes (rgb at segment start, rgb at end). */
export function lineColorArray(fat: FatLine) {
  const attr = fat.geometry.attributes.instanceColorStart as THREE.InterleavedBufferAttribute;
  return {
    array: attr.data.array as Float32Array,
    commit: () => {
      attr.data.needsUpdate = true;
    },
  };
}

export function disposeFatLine(fat: FatLine) {
  fat.geometry.dispose();
  fat.material.dispose();
}
