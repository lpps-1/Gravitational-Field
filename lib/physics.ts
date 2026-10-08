/**
 * Physics model for the Spacetime Lab.
 *
 * Everything here is in dimensionless "simulation units" (1 grid square =
 * 1 unit). The goal is a faithful *qualitative* picture of General Relativity
 * (deeper potential well → stronger light bending → slower clocks); the
 * effects are hugely exaggerated so they can be seen, and nothing is to scale.
 *
 * `m` is always the normalised central mass in [0, 1] (slider value / 100).
 */

/** Half-width of the square spacetime grid (grid spans -GRID_HALF..GRID_HALF). */
export const GRID_HALF = 20;
/** Beyond this radius the fabric is flat (where the far-away clock lives). */
export const WELL_RADIUS = 19;
/** Depth of the well at the centre when m = 1. */
export const MAX_DEPTH = 7.5;
/** Softening length: stops the 1/r profile from becoming infinitely sharp. */
export const WELL_SOFTENING = 2.2;

const edgeTerm = WELL_SOFTENING / Math.sqrt(WELL_RADIUS * WELL_RADIUS + WELL_SOFTENING * WELL_SOFTENING);

/**
 * Shape of the well, 0 (flat) … 1 (centre), independent of mass.
 * A softened Newtonian-potential (1/r) profile, re-normalised so that it is
 * exactly flat at WELL_RADIUS and beyond. The grid's vertex shader reads this
 * precomputed per vertex, so the GPU and the CPU always agree on the shape.
 */
export function wellProfile(r: number): number {
  if (r >= WELL_RADIUS) return 0;
  return (WELL_SOFTENING / Math.sqrt(r * r + WELL_SOFTENING * WELL_SOFTENING) - edgeTerm) / (1 - edgeTerm);
}

/** Height of the spacetime fabric at radius `r` for mass `m`. */
export function wellHeight(r: number, m: number): number {
  if (m <= 0) return 0;
  return -MAX_DEPTH * m * wellProfile(r);
}

/** Radius of the glowing central body (grows with mass). */
export function centralBodyRadius(m: number): number {
  return 0.25 + 0.85 * m;
}

/** Plain-language description of the curvature for a slider value 0–100. */
export function curvatureLevel(mass: number): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
  if (mass <= 0) return { label: "None (flat)", level: 0 };
  if (mass < 35) return { label: "Gentle", level: 1 };
  if (mass < 75) return { label: "Deep", level: 2 };
  if (mass < 100) return { label: "Very deep", level: 3 };
  return { label: "Extreme", level: 4 };
}

/* ------------------------------------------------------------------------ */
/* Module C — gravitational time dilation                                    */
/* ------------------------------------------------------------------------ */

/** Where Clock B sits: deep inside the well, just outside the central body. */
export const CLOCK_B_RADIUS = 2.4;
/** Bearing of Clock B around the well (toward the default camera). */
export const CLOCK_B_ANGLE = Math.PI * 0.28;
/** Where Clock A sits: out on the flat edge of the grid, standing in for "very far away". */
export const CLOCK_A_POSITION: [number, number, number] = [-8, 0, 17.5];

/**
 * Proper-time rate of Clock B relative to the far-away Clock A, using the
 * Schwarzschild form dτ/dt = √(1 − rₛ / r). We tie rₛ / r to how deep the
 * clock sits in the well, so a deeper well always means a slower clock.
 * At m = 1 the clock runs at ≈ 0.32 s per second of Clock A.
 */
export function dilationFactor(m: number): number {
  const depth = -wellHeight(CLOCK_B_RADIUS, m) / MAX_DEPTH; // 0..~0.63
  const rsOverR = Math.min(0.99, depth * 1.42);
  return Math.sqrt(1 - rsOverR);
}

/**
 * Inverts the Schwarzschild rate: how far from a black hole (in Schwarzschild
 * radii) a hovering clock would have to be to tick at this rate.
 */
export function equivalentRadius(rate: number): number {
  return 1 / Math.max(1e-6, 1 - rate * rate);
}

/* ------------------------------------------------------------------------ */
/* Module A — "yasbahun" orbits                                              */
/* ------------------------------------------------------------------------ */

/**
 * Effective gravitational parameter for the orbiting bodies. With no mass
 * there is nothing to orbit, so the bodies fly off in straight lines instead
 * (handled in OrbitingBodies).
 */
export function orbitalGM(m: number): number {
  return 2.6 * m;
}

/**
 * Below this (eased) mass there is no central mass: the body is hidden and the
 * orbiting bodies are released. Half the smallest non-zero slider value (1 → 0.01),
 * so every setting the readouts call "in orbit" really is.
 */
export const ORBIT_RELEASE_MASS = 0.005;

/** Solve Kepler's equation M = E − e·sin(E) for the eccentric anomaly E. */
export function solveKepler(meanAnomaly: number, e: number): number {
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 8; i++) {
    E -= (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }
  return E;
}

/* ------------------------------------------------------------------------ */
/* Module B — gravitational lensing                                          */
/* ------------------------------------------------------------------------ */

/** Lensing strength. GR bends light twice as much as Newtonian gravity would. */
const LENS_GM = 0.45;
const LENS_SOFTENING = 0.35;
const PHOTON_STEP = 0.05;
/** How high above the fabric the photon glides. */
export const PHOTON_LIFT = 0.18;
/** Range and default of the "aim" control: how far from the centre the beam is aimed. */
export const AIM_MIN = 0.5;
export const AIM_MAX = 10;
export const AIM_DEFAULT = 3;
/** Most points a traced path can have (sizes the GPU buffers once). */
export const PHOTON_MAX_POINTS = 2400;
/** Real deflection of starlight grazing the Sun, for the scale note. */
export const SUN_DEFLECTION_DEG = 1.75 / 3600;

export interface PhotonPath {
  /** Flat xyz array of points along the path. */
  points: Float32Array;
  /** Cumulative arc length at each point. */
  arc: Float32Array;
  /** Number of points used. */
  count: number;
  /** Total arc length. */
  length: number;
  /** True when the photon ran into the central body. */
  captured: boolean;
  /** Deflection angle in degrees (0 when it hit the mass or there is no mass). */
  deflection: number;
  /** Aim used: sideways distance from the centre at which the beam was fired. */
  impact: number;
  /** Final direction of travel in the plane (x, z), unit length. */
  exitDir: [number, number];
}

/**
 * Trace a photon fired along +x from the left edge of the grid, aimed `b`
 * units to the side of the centre (along z).
 *
 * Integration is done in the plane: the photon's direction is continually
 * turned toward the mass with a strength 2·GM/r² (the factor of 2 is the
 * General-Relativistic doubling first tested by Eddington in 1919). The path
 * is then draped over the curved fabric so it visibly rides the well.
 */
export function tracePhoton(m: number, b: number): PhotonPath {
  const pts: number[] = [];
  const arc: number[] = [];
  let x = -GRID_HALF;
  let z = b;
  let vx = 1;
  let vz = 0;
  let s = 0;
  let captured = false;
  const captureR = centralBodyRadius(m) * 0.9;
  const record = (px: number, pz: number) => {
    const r = Math.sqrt(px * px + pz * pz);
    pts.push(px, wellHeight(r, m) + PHOTON_LIFT, pz);
    arc.push(s);
  };
  record(x, z);

  for (let i = 0; i < 6000 && arc.length < PHOTON_MAX_POINTS - 1; i++) {
    const r2 = x * x + z * z;
    const r = Math.sqrt(r2);
    if (m > ORBIT_RELEASE_MASS && r < captureR) {
      captured = true;
      break;
    }
    const g = (2 * LENS_GM * m) / Math.pow(r2 + LENS_SOFTENING * LENS_SOFTENING, 1.5);
    vx -= g * x * PHOTON_STEP;
    vz -= g * z * PHOTON_STEP;
    const n = Math.sqrt(vx * vx + vz * vz);
    vx /= n;
    vz /= n;
    x += vx * PHOTON_STEP;
    z += vz * PHOTON_STEP;
    s += PHOTON_STEP;
    if (i % 2 === 1) record(x, z);
    if (Math.abs(x) > GRID_HALF + 2 || Math.abs(z) > GRID_HALF + 2) break;
  }
  record(x, z);

  const deflection = captured ? 0 : (Math.abs(Math.atan2(vz, vx)) * 180) / Math.PI;
  return {
    points: Float32Array.from(pts),
    arc: Float32Array.from(arc),
    count: arc.length,
    length: s,
    captured,
    deflection,
    impact: b,
    exitDir: [vx, vz],
  };
}

/* ------------------------------------------------------------------------ */
/* Module D — the Seven Skies and the fold                                   */
/* ------------------------------------------------------------------------ */

export const SKY_COUNT = 7;
/** Vertical gap between consecutive skies once fully expanded. */
export const SKY_GAP = 2.7;
/** Height of the centre of the stack. */
export const SKY_CENTER_Y = 1.5;
/** Radius of each sky disc. */
export const SKY_RADIUS = 15;
/** Radius inside which the fabric is drawn into the funnel. */
export const FUNNEL_RADIUS = 7.5;
/** Radius of the tunnel's throat (the cylinder). */
export const THROAT_RADIUS = 1.35;
/** Fraction of the funnel region (inner part) that becomes straight tube. */
export const TUBE_FRACTION = 0.62;
/** Max flare height of each funnel lip. */
export const FLARE = 1.1;

/** Resting height of sky `i` (0 = first sky, bottom) for expansion `e` ∈ [0,1]. */
export function skyHeight(i: number, e: number): number {
  const mid = (SKY_COUNT - 1) / 2;
  return SKY_CENTER_Y + (i - mid) * SKY_GAP * e;
}

/** Bottom and top of the fully formed tunnel. */
export const TUNNEL_BOTTOM = skyHeight(0, 1);
export const TUNNEL_TOP = skyHeight(SKY_COUNT - 1, 1);
/** Route lengths compared on screen: straight up the tunnel vs edge-to-edge across every sky. */
export const ROUTE_THROUGH_TUNNEL = TUNNEL_TOP - TUNNEL_BOTTOM;
export const ROUTE_ACROSS_SKIES = SKY_COUNT * SKY_RADIUS * 2;

/**
 * Timeline of the Miraj sequence in seconds of simulation time:
 * the skies separate, hold for a moment, then fold into the tunnel.
 */
export const MIRAJ_EXPAND_SECONDS = 3;
export const MIRAJ_HOLD_SECONDS = 1.2;
export const MIRAJ_FOLD_SECONDS = 4.5;
export const MIRAJ_TOTAL_SECONDS = MIRAJ_EXPAND_SECONDS + MIRAJ_HOLD_SECONDS + MIRAJ_FOLD_SECONDS;
/** Time for the light to cross the whole tunnel (a fraction of a second). */
export const TRANSIT_SECONDS = 0.6;
