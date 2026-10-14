import { BODIES, PLANET_IDS, SUN_RADIUS, visualRadius, type PlanetId } from "./solar";

/**
 * The Solar System's gravity fabric (chapter S): the rubber-sheet picture of
 * curved spacetime from chapter 1, laid under the real orbits. The Sun sinks
 * a deep well in it and every planet a dent of its own, which travels with
 * the planet as it orbits.
 *
 * Like chapter 1's well, each dent is a softened Newtonian potential (1/r),
 * re-normalised to be flat at its edge. The depths are not to scale: the
 * Sun's real well is about 1,000 times Jupiter's and 330,000 times Earth's,
 * so the dents are drawn ∝ mass^(1/5), which keeps their order but makes
 * even Mercury's visible.
 */

/** The sheet lies this far below the plane of the orbits, clear of the planets and the asteroid belt. */
export const FABRIC_Y = -1.6;
/** Radius of the sheet (scene units; Neptune orbits at about 49). */
export const FABRIC_RADIUS = 58;

/** The Sun's well: depth at the centre and softening width (scene units). */
export const SUN_WELL_DEPTH = 9;
export const SUN_WELL_WIDTH = SUN_RADIUS * 1.2;

/** Scale and exponent for the planets' dents: depth = scale · (M / M_sun)^exponent. */
const DENT_SCALE = 11;
const DENT_EXPONENT = 0.2;
/** A planet's dent reaches this many softening widths before the sheet is flat again. */
export const DENT_REACH = 4;

/** Depth of a planet's dent (scene units). */
export function dentDepth(id: PlanetId) {
  return DENT_SCALE * (BODIES[id].gm / BODIES.sun.gm) ** DENT_EXPONENT;
}

/** Softening width of a planet's dent: a little wider than the planet as drawn. */
export function dentWidth(id: PlanetId) {
  return 1.1 + 1.6 * visualRadius(id);
}

/** Depth and width of every planet's dent, in PLANET_IDS order. */
export const DENTS = PLANET_IDS.map((id) => ({ depth: dentDepth(id), width: dentWidth(id) }));

/**
 * Softened 1/r well of width `s`, 1 at the centre and 0 at `reach` and
 * beyond. The same formula is in the fabric's vertex shader.
 */
export function wellShape(d: number, s: number, reach: number) {
  if (d >= reach) return 0;
  const edge = s / Math.hypot(reach, s);
  return (s / Math.hypot(d, s) - edge) / (1 - edge);
}

/** The Sun's well at distance `r` from the Sun, 0..1. */
export function sunWell(r: number) {
  return wellShape(r, SUN_WELL_WIDTH, FABRIC_RADIUS);
}

/**
 * How far the sheet is pushed down at (x, z) by the Sun and the planets at
 * `centres` (flat x, z pairs in PLANET_IDS order), times `grow` (0..1, the
 * fabric settling in when it is switched on).
 */
export function fabricDepth(x: number, z: number, centres: ArrayLike<number>, grow: number) {
  let depth = SUN_WELL_DEPTH * sunWell(Math.hypot(x, z));
  for (let i = 0; i < DENTS.length; i++) {
    const { depth: d, width } = DENTS[i];
    depth += d * wellShape(Math.hypot(x - centres[i * 2], z - centres[i * 2 + 1]), width, width * DENT_REACH);
  }
  return depth * grow;
}

/** How far the fabric has settled in (0 = off … 1 = fully on); SolarFabric writes it every frame. */
export const fabricState = { grow: 0 };

/**
 * The bottom of a body's well: the Sun's well under (x, z) plus the body's
 * own dent (`index` in PLANET_IDS, or -1 for the Sun). Other planets' dents
 * are left out; they are too far away to matter here.
 */
export function wellBottom(index: number, x: number, z: number, grow: number) {
  const own = index < 0 ? 0 : DENTS[index].depth;
  return FABRIC_Y - (SUN_WELL_DEPTH * sunWell(Math.hypot(x, z)) + own) * grow;
}

/**
 * Camera distance (45° field of view) that shows a body of `radius` and its
 * well `gap` below it, with room for the navigation, the date and the dock.
 */
export function framingDistance(radius: number, gap: number) {
  return ((gap / 2 + radius) * 1.6 + 1) / Math.tan(Math.PI / 8);
}
