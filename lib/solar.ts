import type { BodyId } from "./store";

/**
 * The real Solar System: where each planet is on a given date, how the scene
 * maps that onto the screen, and the physical data behind the chapter's facts.
 *
 * Positions come from NASA JPL's "Approximate Positions of the Planets"
 * (E. M. Standish), Table 1: mean Keplerian elements at J2000.0 and their
 * rates per century, good to a few arcminutes between 1800 and 2050.
 */

export type PlanetId = Exclude<BodyId, "sun">;

export const PLANET_IDS: readonly PlanetId[] = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
export const BODY_IDS: readonly BodyId[] = ["sun", ...PLANET_IDS];

/** Years the orbital elements are valid for; outside them positions slowly lose accuracy. */
export const ELEMENTS_VALID = [1800, 2050] as const;

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
/** Speed of light, m/s. */
const C = 299_792_458;
export const AU_KM = 149_597_870.7;
const JULIAN_YEAR_S = 365.25 * 86_400;
/** Obliquity of the ecliptic at J2000.0, for turning equatorial pole directions into ecliptic ones. */
const OBLIQUITY = 23.43928 * DEG;

export interface Body {
  name: string;
  /** Mean radius (km): sets the drawn size and the radius shown. */
  radiusKm: number;
  /** Equatorial and polar radii (km). Gravity is quoted at the equator, as NASA's fact sheets do. */
  equatorialKm: number;
  polarKm: number;
  /** Sidereal rotation period (hours); negative = spins backwards (retrograde). */
  rotationHours: number;
  /** Tilt of the equator to the orbit (for the Sun: to the ecliptic), degrees. */
  tiltDeg: number;
  /** Gravitational parameter GM, m³/s². */
  gm: number;
  /** IAU north pole at J2000.0: equatorial right ascension and declination (degrees). */
  pole: readonly [number, number];
  /** Where the radius is measured: the giants have no solid ground. */
  surface: "surface" | "cloud tops";
  /** Orbit line and marker colour. */
  hue: string;
  /** One short, true, striking fact. */
  fact: string;
}

export const BODIES: Record<BodyId, Body> = {
  sun: {
    name: "Sun",
    radiusKm: 695_700,
    equatorialKm: 695_700,
    polarKm: 695_700,
    rotationHours: 609.12,
    tiltDeg: 7.25,
    gm: 1.32712440018e20,
    pole: [286.13, 63.87],
    surface: "surface",
    hue: "#ffc46b",
    fact: "The Sun holds 99.86% of the Solar System's mass. Its light takes 8 minutes 20 seconds to reach Earth.",
  },
  mercury: {
    name: "Mercury",
    radiusKm: 2439.7,
    equatorialKm: 2440.5,
    polarKm: 2438.3,
    rotationHours: 1407.6,
    tiltDeg: 0.03,
    gm: 2.2032e13,
    pole: [281.0103, 61.4155],
    surface: "surface",
    hue: "#b9b4ad",
    fact: "Mercury's orbit slowly turns, 43 arcseconds a century more than Newton's gravity allows. Einstein's General Relativity explained it exactly in 1915.",
  },
  venus: {
    name: "Venus",
    radiusKm: 6051.8,
    equatorialKm: 6051.8,
    polarKm: 6051.8,
    rotationHours: -5832.5,
    tiltDeg: 177.4,
    gm: 3.24859e14,
    pole: [272.76, 67.16],
    surface: "surface",
    hue: "#e9cf98",
    fact: "Venus turns once every 243 days, longer than its 225-day year, and it spins backwards.",
  },
  earth: {
    name: "Earth",
    radiusKm: 6371.0,
    equatorialKm: 6378.137,
    polarKm: 6356.752,
    rotationHours: 23.934,
    tiltDeg: 23.44,
    gm: 3.986004e14,
    pole: [0, 90],
    surface: "surface",
    hue: "#6ea8ff",
    fact: "GPS satellites sit higher in Earth's gravity, so their clocks run fast. Without correcting for General Relativity, positions would drift about 10 km a day.",
  },
  mars: {
    name: "Mars",
    radiusKm: 3389.5,
    equatorialKm: 3396.2,
    polarKm: 3376.2,
    rotationHours: 24.623,
    tiltDeg: 25.19,
    gm: 4.282837e13,
    pole: [317.68143, 52.8865],
    surface: "surface",
    hue: "#e0805a",
    fact: "Olympus Mons, the tallest volcano known, rises about 22 km: two and a half times the height of Everest.",
  },
  jupiter: {
    name: "Jupiter",
    radiusKm: 69_911,
    equatorialKm: 71_492,
    polarKm: 66_854,
    rotationHours: 9.925,
    tiltDeg: 3.13,
    gm: 1.26686534e17,
    pole: [268.0566, 64.4953],
    surface: "cloud tops",
    hue: "#d8b48c",
    fact: "Jupiter has two and a half times the mass of all the other planets together, yet it spins once in under ten hours.",
  },
  saturn: {
    name: "Saturn",
    radiusKm: 58_232,
    equatorialKm: 60_268,
    polarKm: 54_364,
    rotationHours: 10.656,
    tiltDeg: 26.73,
    gm: 3.7931187e16,
    pole: [40.589, 83.537],
    surface: "cloud tops",
    hue: "#e6d29f",
    fact: "Saturn is less dense than water. Its rings are about 270,000 km across, yet mostly only tens of metres thick.",
  },
  uranus: {
    name: "Uranus",
    radiusKm: 25_362,
    equatorialKm: 25_559,
    polarKm: 24_973,
    rotationHours: -17.24,
    tiltDeg: 97.77,
    gm: 5.793939e15,
    pole: [257.311, -15.175],
    surface: "cloud tops",
    hue: "#9fe0e6",
    fact: "Uranus rolls on its side: each pole has about 42 years of daylight, then 42 years of night.",
  },
  neptune: {
    name: "Neptune",
    radiusKm: 24_622,
    equatorialKm: 24_764,
    polarKm: 24_341,
    rotationHours: 16.11,
    tiltDeg: 28.32,
    gm: 6.836529e15,
    pole: [299.334, 42.95],
    surface: "cloud tops",
    hue: "#6f8cff",
    fact: "Neptune was found by mathematics: in 1846 Le Verrier worked out where it had to be from its pull on Uranus, and it was seen within 1° of that spot.",
  },
};

/** Mean elements [a (au), e, I (°), L (°), long. perihelion ϖ (°), long. ascending node Ω (°)]. */
type Elements = readonly [number, number, number, number, number, number];

/** J2000.0 elements and their rates per Julian century (JPL Table 1). Earth is the Earth–Moon barycentre. */
const ORBITS: Record<PlanetId, { at: Elements; rate: Elements }> = {
  mercury: {
    at: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  },
  venus: {
    at: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    rate: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  },
  earth: {
    at: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  },
  mars: {
    at: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  },
  jupiter: {
    at: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  },
  saturn: {
    at: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rate: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  },
  uranus: {
    at: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  },
  neptune: {
    at: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  },
};

/* ------------------------------------------------------------------------ */
/* Orbits                                                                     */
/* ------------------------------------------------------------------------ */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** A body on its orbit: position (scene units), true distance from the Sun (au), eccentric anomaly (radians, 0..2π). */
export interface OrbitPoint extends Vec3Like {
  r: number;
  E: number;
}

const scratch: OrbitPoint = { x: 0, y: 0, z: 0, r: 0, E: 0 };

/** One orbit at one epoch: size, shape, and the rotation from the orbital plane to the ecliptic. */
const frame = { a: 0, e: 0, b: 0, M: 0, xx: 0, xy: 0, yx: 0, yy: 0, zx: 0, zy: 0 };

function setFrame(id: PlanetId, day: number) {
  const { at, rate } = ORBITS[id];
  const T = day / 36525;
  const a = at[0] + rate[0] * T;
  const e = at[1] + rate[1] * T;
  const I = (at[2] + rate[2] * T) * DEG;
  const L = at[3] + rate[3] * T;
  const peri = at[4] + rate[4] * T;
  const node = at[5] + rate[5] * T;
  const w = (peri - node) * DEG;
  const O = node * DEG;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(O);
  const sO = Math.sin(O);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  frame.a = a;
  frame.e = e;
  frame.b = a * Math.sqrt(1 - e * e);
  frame.M = wrap180(L - peri) * DEG;
  frame.xx = cw * cO - sw * sO * cI;
  frame.xy = -sw * cO - cw * sO * cI;
  frame.yx = cw * sO + sw * cO * cI;
  frame.yy = -sw * sO + cw * cO * cI;
  frame.zx = sw * sI;
  frame.zy = cw * sI;
}

function wrap180(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Solve Kepler's equation E − e·sin E = M by Newton's method. */
function solveKepler(M: number, e: number) {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) {
    const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

/** Writes the point at eccentric anomaly E of the current frame, in ecliptic au, mapped to the scene. */
function framePoint(E: number, out: Vec3Like) {
  const xp = frame.a * (Math.cos(E) - frame.e);
  const yp = frame.b * Math.sin(E);
  return toScene(frame.xx * xp + frame.xy * yp, frame.yx * xp + frame.yy * yp, frame.zx * xp + frame.zy * yp, out);
}

/** Scene units per √au. Distances are compressed (r → 9√r) so all eight orbits fit on one screen. */
export const SCENE_SCALE = 9;

/**
 * Map a heliocentric ecliptic vector (au) into the scene: ecliptic x → x,
 * ecliptic y → −z, ecliptic north → +y (so the planets go round
 * anticlockwise seen from above), with the distance compressed. Returns the
 * true distance in au.
 */
export function toScene(x: number, y: number, z: number, out: Vec3Like): number {
  const r = Math.hypot(x, y, z);
  const k = r > 0 ? SCENE_SCALE / Math.sqrt(r) : 0;
  out.x = x * k;
  out.y = z * k;
  out.z = -y * k;
  return r;
}

/** Scene distance from the Sun for a true distance in au. */
export function sceneDistance(au: number) {
  return SCENE_SCALE * Math.sqrt(au);
}

/** Where a planet is on a date (days since J2000.0). */
export function planetPosition(id: PlanetId, day: number, out: OrbitPoint): OrbitPoint {
  setFrame(id, day);
  const E = solveKepler(frame.M, frame.e);
  out.r = framePoint(E, out);
  out.E = ((E % TAU) + TAU) % TAU;
  return out;
}

/**
 * A planet's whole orbit at a date, as scene points evenly spaced in
 * eccentric anomaly (finer where the orbit curves most), plus each point's
 * anomaly so a trail can fade behind the planet.
 */
export function orbitPath(id: PlanetId, day: number, points: Float32Array, anomalies: Float32Array) {
  setFrame(id, day);
  const n = anomalies.length;
  for (let i = 0; i < n; i++) {
    const E = (i / n) * TAU;
    framePoint(E, scratch);
    points[i * 3] = scratch.x;
    points[i * 3 + 1] = scratch.y;
    points[i * 3 + 2] = scratch.z;
    anomalies[i] = E;
  }
}

/** Mean longitude (radians) and semi-major axis (au) on a date. */
export function meanLongitude(id: PlanetId, day: number) {
  const { at, rate } = ORBITS[id];
  return (at[3] + (rate[3] * day) / 36525) * DEG;
}

export function semiMajorAxis(id: PlanetId, day: number) {
  const { at, rate } = ORBITS[id];
  return at[0] + (rate[0] * day) / 36525;
}

/** Sidereal orbital period in days, from the mean motion. */
export function orbitalPeriodDays(id: PlanetId) {
  return (360 / ORBITS[id].rate[3]) * 36525;
}

/** Mean orbital rate in radians per day, for bodies on near-circular orbits at `au` (Kepler's third law). */
export function meanMotion(au: number) {
  return TAU / (365.25 * au * Math.sqrt(au));
}

/**
 * Direction from Earth to the Moon (ecliptic unit vector), from the Moon's
 * mean elements and its largest periodic term: good to a degree or two, so
 * its phase is the real one.
 */
export function moonDirection(day: number, out: Vec3Like): Vec3Like {
  const L = 218.316 + 13.176396 * day;
  const M = (134.963 + 13.064993 * day) * DEG;
  const F = (93.272 + 13.22935 * day) * DEG;
  const lon = (L + 6.289 * Math.sin(M)) * DEG;
  const lat = 5.128 * Math.sin(F) * DEG;
  out.x = Math.cos(lat) * Math.cos(lon);
  out.y = Math.cos(lat) * Math.sin(lon);
  out.z = Math.sin(lat);
  return out;
}

export const MOON_PERIOD_DAYS = 27.32;

/* ------------------------------------------------------------------------ */
/* Bodies                                                                     */
/* ------------------------------------------------------------------------ */

/** Drawn radius of the Sun (scene units). Not to scale: it would hide Mercury's orbit. */
export const SUN_RADIUS = 2.2;

/** Drawn (mean) radius in scene units: planets 0.28·√(R / R_Earth), so the giants stay large but not huge. */
export function visualRadius(id: BodyId) {
  return id === "sun" ? SUN_RADIUS : 0.28 * Math.sqrt(BODIES[id].radiusKm / BODIES.earth.radiusKm);
}

/** Saturn's main rings (km from Saturn's centre). */
export const SATURN_RINGS = {
  cInner: 74_658,
  bInner: 92_000,
  cassiniInner: 117_580,
  aInner: 122_170,
  enckeInner: 133_410,
  enckeOuter: 133_740,
  aOuter: 136_775,
};

/** Camera distance for following a body: room for Saturn's rings, and the Sun's corona. */
export function followDistance(id: BodyId) {
  if (id === "sun") return 9;
  const r = visualRadius(id);
  if (id === "saturn") return ((r * SATURN_RINGS.aOuter) / BODIES.saturn.radiusKm) * 3.2 + 1.5;
  return r * 5 + 1.5;
}

/**
 * Spin axis as a scene unit vector, from the IAU pole. Venus and Uranus turn
 * backwards about their IAU north pole, so their axis of spin (the
 * anticlockwise one) is the opposite pole: tilts of 177° and 98°.
 */
export function spinAxis(id: BodyId, out: Vec3Like): Vec3Like {
  const b = BODIES[id];
  const ra = b.pole[0] * DEG;
  const dec = b.pole[1] * DEG;
  const xe = Math.cos(dec) * Math.cos(ra);
  const ye = Math.cos(dec) * Math.sin(ra);
  const ze = Math.sin(dec);
  const s = b.rotationHours < 0 ? -1 : 1;
  // Equatorial → ecliptic, then ecliptic → scene (x, north, −y).
  const y = ye * Math.cos(OBLIQUITY) + ze * Math.sin(OBLIQUITY);
  const z = -ye * Math.sin(OBLIQUITY) + ze * Math.cos(OBLIQUITY);
  out.x = s * xe;
  out.y = s * z;
  out.z = -s * y;
  return out;
}

/** Spin rate in radians per day (always positive: the direction is in the axis). */
export function spinRate(id: BodyId) {
  return TAU / (Math.abs(BODIES[id].rotationHours) / 24);
}

/* ------------------------------------------------------------------------ */
/* Facts                                                                      */
/* ------------------------------------------------------------------------ */

/** Gravity at the equator, m/s² (GM/R²). */
export function surfaceGravity(id: BodyId) {
  const R = BODIES[id].equatorialKm * 1000;
  return BODIES[id].gm / (R * R);
}

/**
 * Seconds a year a clock on the body's surface loses to the body's own
 * gravity, against a clock far away (weak field: GM / Rc² per second).
 */
export function ownDilationPerYear(id: BodyId) {
  return (BODIES[id].gm / (BODIES[id].equatorialKm * 1000 * C * C)) * JULIAN_YEAR_S;
}

/** Seconds a year a clock at `au` from the Sun loses to the Sun's gravity (weak field). */
export function solarDilationPerYear(au: number) {
  return (BODIES.sun.gm / (au * AU_KM * 1000 * C * C)) * JULIAN_YEAR_S;
}

/** Distance from the Sun on a date, in au. */
export function sunDistance(id: PlanetId, day: number) {
  return planetPosition(id, day, scratch).r;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** The calendar date (UTC) of a day count since J2000.0, e.g. "8 Oct 2026". */
export function formatSolarDate(day: number) {
  const d = new Date(J2000_MS + day * 86_400_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Calendar year of a day count since J2000.0. */
export function solarYear(day: number) {
  return new Date(J2000_MS + day * 86_400_000).getUTCFullYear();
}
