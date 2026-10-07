/**
 * Physics model for the Spacetime Lab.
 *
 * Everything here is in dimensionless "simulation units". The goal is a
 * faithful *qualitative* picture of General Relativity (deeper potential well
 * → stronger light bending → slower clocks), not a to-scale calculation.
 *
 * `m` is always the normalised central mass in [0, 1] (slider value / 100).
 */

/** Half-width of the square spacetime grid (grid spans -GRID_HALF..GRID_HALF). */
export const GRID_HALF = 20;
/** Beyond this radius the fabric is flat (where the observer clock lives). */
export const WELL_RADIUS = 19;
/** Depth of the well at the centre when m = 1. */
export const MAX_DEPTH = 7.5;
/** Softening length: stops the 1/r profile from becoming infinitely sharp. */
const WELL_SOFTENING = 2.2;

const edgeTerm = WELL_SOFTENING / Math.hypot(WELL_RADIUS, WELL_SOFTENING);

/**
 * Height of the spacetime fabric at radius `r` for mass `m`.
 * A softened Newtonian-potential (1/r) profile, re-normalised so that it is
 * exactly flat (y = 0) at WELL_RADIUS and beyond.
 */
export function wellHeight(r: number, m: number): number {
  if (m <= 0 || r >= WELL_RADIUS) return 0;
  const profile = (WELL_SOFTENING / Math.hypot(r, WELL_SOFTENING) - edgeTerm) / (1 - edgeTerm);
  return -MAX_DEPTH * m * profile;
}

/** Radius of the glowing central body (grows with mass). */
export function centralBodyRadius(m: number): number {
  return 0.25 + 0.85 * m;
}

/* ------------------------------------------------------------------------ */
/* Module C — gravitational time dilation                                    */
/* ------------------------------------------------------------------------ */

/** Where Clock B sits: deep inside the well, just outside the central body. */
export const CLOCK_B_RADIUS = 2.4;
/** Where Clock A sits: out on the flat edge of the grid. */
export const CLOCK_A_POSITION: [number, number, number] = [-8, 0, 17.5];

/**
 * Proper-time rate of Clock B relative to the far-away observer, using the
 * Schwarzschild form dτ/dt = √(1 − r_s / r). We tie r_s / r to how deep the
 * clock sits in the well, so a deeper well always means a slower clock.
 * At m = 1 the clock runs at ≈ 0.32 s per observer second.
 */
export function dilationFactor(m: number): number {
  const depth = -wellHeight(CLOCK_B_RADIUS, m) / MAX_DEPTH; // 0..~0.63
  const rsOverR = Math.min(0.99, depth * 1.42);
  return Math.sqrt(1 - rsOverR);
}

/* ------------------------------------------------------------------------ */
/* Module A — "yasbahun" orbits                                              */
/* ------------------------------------------------------------------------ */

/**
 * Effective gravitational parameter for the orbiting bodies. A small floor
 * keeps the bodies drifting when the mass is switched off, so the scene
 * never freezes during a presentation.
 */
export function orbitalGM(m: number): number {
  return 0.06 + 2.6 * m;
}

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

export interface PhotonPath {
  /** Flat xyz array of points along the path. */
  points: Float32Array;
  /** Cumulative arc length at each point. */
  arc: Float32Array;
  /** Total arc length. */
  length: number;
  /** True when the photon fell into the central body. */
  captured: boolean;
  /** Deflection angle in degrees (0 when captured or massless). */
  deflection: number;
  /** Impact parameter used. */
  impact: number;
}

/**
 * Trace a photon fired along +x from the left edge of the grid with impact
 * parameter `b` (its sideways offset from the centre, along z).
 *
 * Integration is done in the plane: the photon's direction is continually
 * turned toward the mass with a strength 2·GM/r² (the factor of 2 is the
 * General-Relativistic doubling measured by Eddington in 1919). The path is
 * then draped over the curved fabric so it visibly rides into the well.
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
    const r = Math.hypot(px, pz);
    pts.push(px, wellHeight(r, m) + PHOTON_LIFT, pz);
    arc.push(s);
  };
  record(x, z);

  for (let i = 0; i < 6000; i++) {
    const r2 = x * x + z * z;
    const r = Math.sqrt(r2);
    if (m > 0.005 && r < captureR) {
      captured = true;
      break;
    }
    const g = (2 * LENS_GM * m) / Math.pow(r2 + LENS_SOFTENING * LENS_SOFTENING, 1.5);
    vx -= g * x * PHOTON_STEP;
    vz -= g * z * PHOTON_STEP;
    const n = Math.hypot(vx, vz);
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
    length: s,
    captured,
    deflection,
    impact: b,
  };
}

/** Impact parameters cycled through on successive shots (alternating sides). */
export const IMPACT_SEQUENCE = [3.2, -4.4, 2.4, -6.0, 3.8, -2.8, 8.0];

/* ------------------------------------------------------------------------ */
/* Module D — the Seven Skies / Einstein–Rosen bridge                        */
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
/** Radius of the wormhole throat (the cylinder). */
export const THROAT_RADIUS = 1.35;
/** Fraction of the funnel region (inner part) that becomes straight tube. */
export const TUBE_FRACTION = 0.62;
/** Max flare height of each funnel lip. */
const FLARE = 1.1;

/** Resting height of sky `i` (0 = first sky, bottom) for expansion `e` ∈ [0,1]. */
export function skyHeight(i: number, e: number): number {
  const mid = (SKY_COUNT - 1) / 2;
  return SKY_CENTER_Y + (i - mid) * SKY_GAP * e;
}

/** Bottom and top of the fully formed tunnel. */
export const TUNNEL_BOTTOM = skyHeight(0, 1);
export const TUNNEL_TOP = skyHeight(SKY_COUNT - 1, 1);

/**
 * Deform a point of sky `i` that rests at radius `r` (height `h`) according
 * to the fold amount `p` ∈ [0,1].
 *
 * The inner disc of every sky is stretched into a Flamm-paraboloid-like
 * funnel that turns into a vertical tube. Skies below the middle stretch
 * upward, skies above stretch downward, so together their tubes overlap into
 * one continuous cylinder spanning all seven layers.
 *
 * Returns [radius, height].
 */
export function foldPoint(r: number, h: number, i: number, p: number, out: [number, number]) {
  if (p <= 0 || r >= FUNNEL_RADIUS) {
    out[0] = r;
    out[1] = h;
    return out;
  }
  const midY = SKY_CENTER_Y;
  const dir = Math.sign(midY - h);
  const reach = Math.abs(midY - h);
  const flare = Math.min(FLARE, reach);
  const s = r / FUNNEL_RADIUS;
  let fr: number;
  let fy: number;
  if (s >= TUBE_FRACTION) {
    const t = (s - TUBE_FRACTION) / (1 - TUBE_FRACTION);
    fr = THROAT_RADIUS + (FUNNEL_RADIUS - THROAT_RADIUS) * t * t;
    fy = h + dir * flare * (1 - Math.sqrt(t));
  } else {
    const t = s / TUBE_FRACTION;
    fr = THROAT_RADIUS;
    fy = h + dir * (flare + (reach - flare) * (1 - t));
  }
  // Points closer to the centre move later, so the pinch visibly propagates
  // inward and the fabric looks like it is being drawn down a drain.
  const delay = (1 - s) * 0.35;
  const local = Math.min(1, Math.max(0, (p - delay) / (1 - delay)));
  const k = local * local * (3 - 2 * local);
  out[0] = r + (fr - r) * k;
  out[1] = h + (fy - h) * k;
  return out;
}
