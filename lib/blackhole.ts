import { DataUtils } from "three";

/**
 * Black hole chapter: Schwarzschild light bending for the picture, and the
 * gravitational clock rates for the three clocks.
 *
 * Picture units: the horizon radius rₛ = 2GM/c² is 1, so M = 1/2 (G = c = 1).
 * The hole sits at the origin; its accretion disk lies in the XZ plane and
 * turns anticlockwise seen from +y.
 */

/** Mass in picture units (rₛ = 2M = 1). */
export const BH_MASS = 0.5;
/** Impact parameter of the photon sphere, 3√3·M: light aimed closer falls in. Also the shadow's radius. */
export const B_CRIT = (3 * Math.sqrt(3)) / 2;
/** Inner edge of the disk: the innermost stable circular orbit, 6M. */
export const DISK_INNER = 3;
export const DISK_OUTER = 12;
/** Radius of the hottest ring of a thin disk: 49/36 of the inner edge. */
export const DISK_PEAK = (49 / 36) * DISK_INNER;

/* ------------------------------------------------------------------------ */
/* Light-bending table                                                        */
/* ------------------------------------------------------------------------ */

/**
 * A ray of light with impact parameter b follows u'' + u = 3M·u², with
 * u = 1/r and ' = d/dφ. Every ray from far away is the same curve up to a
 * rotation, so the curves are integrated once (from infinity, u = 0,
 * u' = 1/b) and stored as a texture of u by (φ, b): the shader then follows
 * each pixel's bent ray with a handful of texture reads instead of
 * integrating it.
 */
export const TABLE_PHI = 512;
export const TABLE_B = 1024;
/** Rays are followed for one and a half turns; light that circles longer is lost in the photon ring. */
export const PHI_MAX = 3 * Math.PI;
/** Rays beyond this impact parameter never come near the disk: the shader uses the weak-field bending. */
export const B_MAX = 30;
/** Rows crowd around B_CRIT, where the bending changes fastest: b = B_CRIT + B_SOFT·sinh(s). */
export const B_SOFT = 0.1;
export const B_S0 = Math.asinh(-B_CRIT / B_SOFT);
export const B_S1 = Math.asinh((B_MAX - B_CRIT) / B_SOFT);

/** RK4 steps per table column. */
const SUBSTEPS = 4;
/** Largest value written to the table (half floats stop at 65504). */
const U_CAP = 6e4;

/** Impact parameter of a table row. */
export function rowImpact(row: number): number {
  const s = B_S0 + ((B_S1 - B_S0) * row) / (TABLE_B - 1);
  return Math.max(1e-4, B_CRIT + B_SOFT * Math.sinh(s));
}

export interface GeodesicTable {
  /** u(φ, b) as half floats: TABLE_B rows of TABLE_PHI columns, φ from 0 to PHI_MAX. */
  u: Uint16Array;
  /**
   * Per row, as half floats: (φ_end − π, captured). φ_end is where the ray
   * falls through the horizon (captured = 1) or escapes back to infinity
   * (captured = 0). Stored relative to π so escaping rays keep their
   * precision. Rays still circling at PHI_MAX count as captured.
   */
  end: Uint16Array;
}

/** Integrates every ray of the table (about 10 ms; run it once, when the chapter is first needed). */
export function buildGeodesicTable(): GeodesicTable {
  const table = new Uint16Array(TABLE_PHI * TABLE_B);
  const end = new Uint16Array(TABLE_B * 2);
  const half = DataUtils.toHalfFloat;
  const ONE = half(1);
  const h = PHI_MAX / (TABLE_PHI - 1);
  const hs = h / SUBSTEPS;
  const k = 3 * BH_MASS;
  const accel = (u: number) => k * u * u - u;

  for (let row = 0; row < TABLE_B; row++) {
    const b = rowImpact(row);
    const base = row * TABLE_PHI;
    let u = 0;
    let v = 1 / b;
    let phiEnd = PHI_MAX;
    let captured = 1;
    let fill = -1;
    table[base] = 0;

    columns: for (let i = 1; i < TABLE_PHI; i++) {
      const u0 = u;
      const phi0 = (i - 1) * h;
      for (let s = 0; s < SUBSTEPS; s++) {
        const prev = u;
        const k1u = v;
        const k1v = accel(u);
        const k2u = v + 0.5 * hs * k1v;
        const k2v = accel(u + 0.5 * hs * k1u);
        const k3u = v + 0.5 * hs * k2v;
        const k3v = accel(u + 0.5 * hs * k2u);
        const k4u = v + hs * k3v;
        const k4v = accel(u + hs * k3u);
        u += (hs / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
        v += (hs / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        // Through the horizon (u = 1) or back out to infinity (u = 0): find the crossing between substeps.
        const target = u >= 1 ? 1 : u < 0 ? 0 : -1;
        if (target < 0) continue;
        phiEnd = phi0 + (s + (prev - target) / (prev - u)) * hs;
        captured = target;
        // The last column continues the straight line through the crossing, so that
        // filtering between it and the column before stays right up to φ_end.
        const extended = u0 + ((target - u0) * h) / Math.max(phiEnd - phi0, 1e-9);
        table[base + i] = half(Math.max(-U_CAP, Math.min(U_CAP, extended)));
        fill = i + 1;
        break columns;
      }
      table[base + i] = half(u);
    }
    // Past the end: u = 1 (never on the disk) for captured rays, 0 for escaped ones.
    if (fill > 0) table.fill(captured ? ONE : 0, base + fill, base + TABLE_PHI);
    end[row * 2] = half(phiEnd - Math.PI);
    end[row * 2 + 1] = captured ? ONE : 0;
  }
  return { u: table, end };
}

/* ------------------------------------------------------------------------ */
/* The three clocks                                                           */
/* ------------------------------------------------------------------------ */

/** Sun's gravitational parameter GM☉ (m³/s²), nominal radius (m) and the speed of light (m/s). */
const GM_SUN = 1.32712440018e20;
const R_SUN = 6.957e8;
const C = 299_792_458;
/** The Sun's horizon radius over its actual radius, 2GM☉/(R☉c²) ≈ 4.245 × 10⁻⁶. */
const SUN_DEPTH = (2 * GM_SUN) / (R_SUN * C * C);

/** Rate of a clock on the Sun's surface against one in deep space: √(1 − 2GM☉/(R☉c²)) ≈ 0.999 997 9. */
export const RATE_SUN = Math.sqrt(1 - SUN_DEPTH);
/** 1 − RATE_SUN, computed without cancellation (≈ 2.1225 × 10⁻⁶). */
export const LAG_SUN = SUN_DEPTH / (1 + RATE_SUN);

export const YEAR_SECONDS = 365.25 * 86_400;
/** Time-lapse: one year every ten seconds. */
export const TIMELAPSE_SCALE = YEAR_SECONDS / 10;

/** Rate of a clock hovering at r horizon radii from a black hole: √(1 − rₛ/r). */
export function hoverRate(r: number): number {
  return Math.sqrt(1 - 1 / r);
}
