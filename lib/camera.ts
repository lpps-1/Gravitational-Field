import * as THREE from "three";
import type { ViewName } from "./store";
import { SKY_CENTER_Y, TUNNEL_BOTTOM } from "./physics";

type Vec3 = [number, number, number];

/** Preset camera views: where the camera sits and what it looks at. */
export const VIEWS: Record<ViewName, { position: Vec3; target: Vec3; label: string }> = {
  overview: { position: [26.5, 19, 31], target: [0, -2, 0], label: "Overview" },
  top: { position: [0, 56, 0.01], target: [0, -2, 0], label: "Above" },
  side: { position: [0, 2.5, 40], target: [0, -3, 0], label: "Side" },
  clocks: { position: [9, 9, 31], target: [-2.5, -2.5, 7], label: "Clocks" },
  skies: { position: [36, 12, 36], target: [0, SKY_CENTER_Y, 0], label: "Skies" },
  under: { position: [0.01, TUNNEL_BOTTOM - 15, 0.01], target: [0, SKY_CENTER_Y, 0], label: "Up the tunnel" },
  // Solar System stage: the Sun at the origin, the ecliptic in the XZ plane (lib/solar.ts).
  solar: { position: [0, 38, 78], target: [0, 0, 0], label: "Overview" },
  solarTop: { position: [0, 120, 0.01], target: [0, 0, 0], label: "Above" },
  // Follows the chosen body (CameraRig reads cameraFollow); this is only the offset it starts from.
  planet: { position: [0, 2.5, 7], target: [0, 0, 0], label: "Follow" },
  // Black hole stage: the hole at the origin, horizon radius 1, disk in the XZ plane (lib/blackhole.ts).
  bh: { position: [0, 3.6, 25.8], target: [0, 0, 0], label: "Edge-on" },
  bhTop: { position: [0, 27, 9], target: [0, 0, 0], label: "Above" },
};

/** Camera distance limits per stage. */
export const STAGE_DISTANCE: Record<"lab" | "solar" | "blackhole", [number, number]> = {
  lab: [3, 95],
  solar: [1.2, 190],
  // The light-bending table assumes the camera stays well outside the disk.
  blackhole: [14, 60],
};

/**
 * A body the camera follows (Solar System "planet" view). The scene that owns
 * the body writes its world position here every frame; CameraRig keeps the
 * orbit target on it.
 */
export const cameraFollow = {
  active: false,
  position: new THREE.Vector3(),
  /** Suggested viewing distance for the followed body. */
  distance: 6,
  /** Side to look from (horizontal unit vector), or null to keep the camera's current side. */
  side: null as THREE.Vector3 | null,
};

/**
 * Imperative camera handle, filled in by the CameraRig inside the Canvas so
 * keyboard and on-screen camera buttons (outside the Canvas) can drive it.
 */
export const cameraApi = {
  /** Orbit around the target: azimuth and polar deltas in radians. */
  orbit: (_azimuth: number, _polar: number) => {},
  /** Multiply the distance to the target (below 1 zooms in). */
  zoom: (_factor: number) => {},
};
