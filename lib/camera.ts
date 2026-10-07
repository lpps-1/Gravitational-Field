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
