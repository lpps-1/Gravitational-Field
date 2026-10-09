"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import {
  B_CRIT,
  B_MAX,
  B_S0,
  B_S1,
  B_SOFT,
  BH_MASS,
  DISK_INNER,
  DISK_OUTER,
  DISK_PEAK,
  PHI_MAX,
  RATE_SUN,
  TABLE_B,
  TABLE_PHI,
  TIMELAPSE_SCALE,
  buildGeodesicTable,
  hoverRate,
} from "@/lib/blackhole";
import { VIEWS } from "@/lib/camera";
import { stageOf } from "@/lib/chapters";
import { useReducedMotion } from "@/lib/hooks";
import { TIERS } from "@/lib/quality";
import { sim, useLab } from "@/lib/store";

/** Disk animation: picture time units (rₛ/c) per second, so the inner edge turns once in about 8 s. */
const TIME_SCALE = 5.8;
/** The animation clock wraps (once every few hours) before float precision blurs the gas. */
const TIME_WRAP = 1e5;
/** Longest clock step: clocks catch up after a stall, but never by more than this (as SimDriver). */
const MAX_CLOCK_STEP = 0.25;
/** Colour temperature (K) of the disk's hottest ring before any shift: it then spans deep red to blue-white. */
const T_COLOR = 4600;
/** Exposure on the tiers without bloom, before the soft roll-off. */
const EXPOSURE = 1.4;
/** Effective wavelengths (µm) of the red, green and blue primaries for blackbody colours. */
const PRIMARIES = [0.56, 0.484, 0.392];
/** Normal of the galactic band's plane: tilted across the view behind the hole, so its lensing shows. */
const GALAXY = new THREE.Vector3(0.5, 0.85, 0.12).normalize().toArray();
/** Labels show while the camera is within this angle of the edge-on view they were placed for. */
const LABEL_ANGLE = THREE.MathUtils.degToRad(25);

const f = (n: number) => n.toFixed(7);
const thinDiskT4 = (r: number) => (1 - Math.sqrt(DISK_INNER / r)) / (r * r * r);

const VERTEX = /* glsl */ `
  varying vec3 vRay;
  void main() {
    // Camera ray through this corner, in world space: the inverse projection keeps
    // CameraRig's view offset, so the hole stays centred in the free part of the window.
    vec4 p = inverse(projectionMatrix) * vec4(position.xy, -1.0, 1.0);
    vRay = transpose(mat3(viewMatrix)) * (p.xyz / p.w);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uTable;
  uniform sampler2D uEnd;
  uniform float uTime;
  uniform float uReady;
  uniform float uHdr;
  uniform float uDetail;
  varying vec3 vRay;

  const float PI = 3.141592653589793;
  const float TAU = 6.283185307179586;
  const float B_CRIT = ${f(B_CRIT)};
  const float B_MAX = ${f(B_MAX)};
  const float B_SOFT = ${f(B_SOFT)};
  const float S0 = ${f(B_S0)};
  const float S_INV = ${f(1 / (B_S1 - B_S0))};
  const float ROW_Y = ${f((TABLE_B - 1) / TABLE_B)};
  const float ROW_Y0 = ${f(0.5 / TABLE_B)};
  const float PHI_X = ${f((TABLE_PHI - 1) / (PHI_MAX * TABLE_PHI))};
  const float PHI_X0 = ${f(0.5 / TABLE_PHI)};
  const float R_IN = ${f(DISK_INNER)};
  const float R_OUT = ${f(DISK_OUTER)};
  const float U_IN = ${f(1 / DISK_INNER)};
  const float U_OUT = ${f(1 / DISK_OUTER)};
  const float SQRT_R_IN = ${f(Math.sqrt(DISK_INNER))};
  const float SQRT_M = ${f(Math.sqrt(BH_MASS))};
  const float THREE_M = ${f(3 * BH_MASS)};
  const float INV_T4_PEAK = ${f(1 / thinDiskT4(DISK_PEAK))};
  const float RING_SHIFT = ${f(Math.sqrt(1 - (3 * BH_MASS) / DISK_PEAK))};
  const float RING_OMEGA = ${f(Math.sqrt(BH_MASS / DISK_PEAK ** 3))};
  const float T_COLOR = ${f(T_COLOR)};
  const float EXPOSURE = ${f(EXPOSURE)};
  const vec3 LAMBDA5 = vec3(${PRIMARIES.map((l) => f(l ** 5)).join(", ")});
  const vec3 C2_LAMBDA = vec3(${PRIMARIES.map((l) => f(14387.77 / l)).join(", ")});
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  const float STARS = 60.0;
  const vec3 GALAXY = vec3(${GALAXY.map(f).join(", ")});

  float hash12(vec2 p) {
    uvec2 q = uvec2(ivec2(p)) * uvec2(1597334673u, 3812015801u);
    uint n = (q.x ^ q.y) * 1597334673u;
    return float(n) * (1.0 / 4294967296.0);
  }

  vec4 hash43(vec3 p) {
    uvec3 q = uvec3(ivec3(p)) * uvec3(1597334673u, 3812015801u, 2798796415u);
    uvec4 m = uvec4((q.x ^ q.y ^ q.z) * 1597334673u) * uvec4(1u, 3812015801u, 2798796415u, 1664525u);
    m ^= m >> 15u;
    return vec4(m) * (1.0 / 4294967296.0);
  }

  // Colour of a blackbody, linear sRGB at unit luminance: Planck's law at effective
  // wavelengths of the three primaries (fitted to the CIE 1931 observer, 900-15000 K).
  vec3 blackbody(float kelvin) {
    vec3 p = 1.0 / (LAMBDA5 * (exp(C2_LAMBDA / max(kelvin, 700.0)) - 1.0));
    return p / dot(p, LUMA);
  }

  // One ring of gas: value noise around it, turning rigidly at the ring's own
  // Keplerian rate (the gas moves towards smaller θ). The tilt winds the streaks into a spiral.
  float ringRow(float row, float omega, float x, float theta, float cells, float seed) {
    float y = (theta + omega * uTime) * (cells / TAU) + 0.7 * x;
    float j = floor(y);
    float t = y - j;
    t = t * t * (3.0 - 2.0 * t);
    return mix(hash12(vec2(row + seed, mod(j, cells))), hash12(vec2(row + seed, mod(j + 1.0, cells))), t);
  }

  // Neighbouring rings (log-radius steps of 1/freq) blended: the pattern shears with
  // the differential rotation but never winds up into noise, however long it runs.
  float gasNoise(float logR, float theta, float freq, float cells, float seed) {
    float x = logR * freq;
    float row = floor(x);
    float t = x - row;
    t = t * t * (3.0 - 2.0 * t);
    float omega = SQRT_M * exp(-1.5 * row / freq);
    float inner = ringRow(row, omega, x, theta, cells, seed);
    float outer = ringRow(row + 1.0, omega * exp(-1.5 / freq), x, theta, cells, seed);
    return mix(inner, outer, t);
  }

  // Light from the disk at radius r along a ray with angular momentum lambda; alpha = opacity.
  vec4 disk(float r, float theta, float lambda) {
    float sr = sqrt(r);
    // Frequency shift for gas on a circular orbit: gravitational redshift and the Doppler
    // shift (the inner edge moves at half the speed of light). g > 1 on the approaching side.
    float g = sqrt(1.0 - THREE_M / r) / (1.0 - SQRT_M / (r * sr) * lambda);
    // Thin-disk temperature T ∝ r^(-3/4) (1 - sqrt(r_in/r))^(1/4); t4 = (T / T_peak)^4.
    float t4 = (1.0 - SQRT_R_IN / sr) / (r * r * r) * INV_T4_PEAK;
    float logR = log(r);
    float n = gasNoise(logR, theta, 16.0, 34.0, 0.0);
    if (uDetail > 0.5) n = mix(n, gasNoise(logR, theta, 44.0, 89.0, 211.0), 0.38);
    float g2 = g * g;
    // Observed intensity ∝ g^4 × emission; observed colour temperature ∝ g × T.
    vec3 light = blackbody(T_COLOR * g * sqrt(sqrt(t4))) * (g2 * g2 * t4 * (0.15 + 1.7 * n * n));
    float edge = smoothstep(R_IN, R_IN + 0.35, r) * (1.0 - smoothstep(R_OUT * 0.55, R_OUT, r));
    return vec4(light, edge * clamp(0.35 + 1.1 * n, 0.0, 1.0));
  }

  // Background sky in direction e: a faint galactic band and stars. ex, ey: change of
  // e * STARS across one pixel; area0: the same footprint's area without the hole.
  vec3 sky(vec3 e, vec3 ex, vec3 ey, float area0) {
    float lat = dot(e, GALAXY);
    float band = exp(-28.0 * lat * lat);
    float clouds = 0.55 + 0.45 * sin(dot(e, vec3(9.1, 4.7, -6.3))) * sin(dot(e, vec3(-3.7, 8.3, 5.1)));
    vec3 col = vec3(0.018, 0.021, 0.03) * (band * clouds);

    // One star per cell of a direction grid, mostly faint, a few bright.
    vec3 cell = floor(e * STARS);
    vec4 h = hash43(cell);
    float w8 = h.w * h.w;
    w8 *= w8;
    w8 *= w8;
    float w32 = w8 * w8;
    w32 *= w32;
    float flux = (w32 * w8 * 4.0 + w8 * 0.18) * (1.0 + 1.5 * band);
    if (flux > 0.006) {
      // Drawn as a soft dot about a pixel wide at its bent image: the offset to the
      // star is taken back through this pixel's footprint.
      vec3 star = cell + 0.25 + 0.5 * h.xyz;
      vec3 off = star - e * dot(star, e);
      float xx = dot(ex, ex);
      float xy = dot(ex, ey);
      float yy = dot(ey, ey);
      float det = max(xx * yy - xy * xy, 1e-14);
      vec2 px = vec2(yy * dot(ex, off) - xy * dot(ey, off), xx * dot(ey, off) - xy * dot(ex, off)) / det;
      // Lensing conserves surface brightness, so a magnified image is brighter.
      float magnification = min(area0 / sqrt(det), 30.0);
      vec3 tint = mix(vec3(1.0, 0.8, 0.62), vec3(0.78, 0.86, 1.0), fract(h.x * 13.7));
      col += tint * (flux * magnification * exp(-1.4 * dot(px, px)));
    }
    return col;
  }

  void main() {
    if (uReady < 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    vec3 C = cameraPosition;
    vec3 d = normalize(vRay);
    // The ray's plane through the hole: a1 points back along the incoming ray (φ = 0, at
    // infinity), a2 to its closest approach. Points on the bent ray are (1/u(φ))(cos φ a1 + sin φ a2).
    float cd = dot(C, d);
    vec3 perp = C - cd * d;
    float b = length(perp);
    vec3 a1 = -d;
    vec3 a2 = perp / max(b, 1e-6);
    float phiC = atan(b, -cd);
    // The photon's angular momentum about the disk axis per unit energy (travelling to the camera).
    float lambda = -cross(C, d).y;

    float yb = (asinh((b - B_CRIT) / B_SOFT) - S0) * S_INV * ROW_Y + ROW_Y0;
    vec2 end = texture(uEnd, vec2(yb, 0.5)).rg;
    bool distant = b >= B_MAX;
    // Distant rays: weak-field bending 4M/b plus the next order, 15πM²/(4b²).
    float phiEnd = PI + (distant ? (2.0 + ${f((15 * Math.PI) / 16)} / b) / b : end.r);
    bool falls = !distant && end.g > 0.5;
    // Looking away from the hole the ray climbs straight out, whatever its impact parameter.
    bool outward = cd > 0.0;
    bool captured = falls && !outward;
    vec3 e = falls && outward ? d : cos(phiEnd) * a1 + sin(phiEnd) * a2;

    // Pixel footprints for the stars, taken before any branch.
    vec3 ex = dFdx(e) * STARS;
    vec3 ey = dFdy(e) * STARS;
    float area0 = length(cross(dFdx(d), dFdy(d))) * STARS * STARS;

    vec3 col = vec3(0.0);
    float trans = 1.0;
    // Rays further out pass the hole beyond the disk's outer edge.
    if (b < R_OUT + 1.5) {
      // The ray meets the disk plane where (cos φ a1 + sin φ a2).y = 0: every π from phiStar.
      float phiStar = mod(atan(-a1.y, a2.y + 1e-7), PI);
      for (int k = 0; k < 4; k++) {
        float phi = phiStar + float(k) * PI;
        if (phi >= phiEnd) break;
        if (phi <= phiC) continue;
        float u = texture(uTable, vec2(phi * PHI_X + PHI_X0, yb)).r;
        if (u < U_OUT || u > U_IN) continue;
        vec3 dir = cos(phi) * a1 + sin(phi) * a2;
        vec4 gas = disk(1.0 / u, atan(dir.z, dir.x), lambda);
        col += trans * gas.a * gas.rgb;
        trans *= 1.0 - gas.a;
        if (trans < 0.02) break;
      }
    }

    // Photon ring: light that skimmed the photon sphere, from the inner disk with its Doppler shift.
    float db = b - B_CRIT;
    float ring = exp(db > 0.0 ? -7.0 * db : 28.0 * db);
    if (ring > 0.003) {
      float ringG = RING_SHIFT / (1.0 - RING_OMEGA * clamp(lambda, -B_CRIT, B_CRIT));
      float rg2 = ringG * ringG;
      col += trans * blackbody(T_COLOR * ringG) * (ring * rg2 * rg2 * (uHdr > 0.5 ? 0.35 : 0.6));
    }

    if (!captured) col += trans * sky(e, ex, ey, area0);

    // With bloom the brightest gas stays above 1 to glow; without it, a soft roll-off keeps the colour.
    if (uHdr > 0.5) col = col / (1.0 + 0.35 * col);
    else col = col * EXPOSURE / (1.0 + col * EXPOSURE);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

interface BlackHoleView {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  table: THREE.DataTexture;
  end: THREE.DataTexture;
  /** Integrates the light-bending table and hands it to the shader (once). */
  build: () => void;
  built: boolean;
  dispose: () => void;
}

function createView(): BlackHoleView {
  // One triangle covering the screen.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));

  // Created empty: the shader program is compiled once, the data arrives with build().
  const texture = (width: number, height: number, format: THREE.PixelFormat) => {
    const t = new THREE.DataTexture(null, width, height, format, THREE.HalfFloatType);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    return t;
  };
  const table = texture(TABLE_PHI, TABLE_B, THREE.RedFormat);
  const end = texture(TABLE_B, 1, THREE.RGFormat);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTable: { value: table },
      uEnd: { value: end },
      uTime: { value: 0 },
      uReady: { value: 0 },
      uHdr: { value: 0 },
      uDetail: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });

  const view: BlackHoleView = {
    geometry,
    material,
    table,
    end,
    built: false,
    build: () => {
      if (view.built) return;
      view.built = true;
      const geodesics = buildGeodesicTable();
      table.image.data = geodesics.u;
      end.image.data = geodesics.end;
      table.needsUpdate = end.needsUpdate = true;
      material.uniforms.uReady.value = 1;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      table.dispose();
      end.dispose();
    },
  };
  return view;
}

const edgeOn = new THREE.Vector3(...VIEWS.bh.position).normalize();
const toCamera = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3();

/**
 * CHAPTER H: a black hole and its accretion disk, drawn with real light
 * bending, and the three clocks of the time dilation comparison.
 *
 * The picture is one full-screen pass. Each pixel's ray is bent by looking
 * up its precomputed Schwarzschild geodesic (lib/blackhole.ts): a few
 * texture reads find where it crosses the disk, falls into the hole or
 * leaves for the star field, so the view runs without a graphics card.
 */
export function BlackHole() {
  const view = useMemo(createView, []);
  const onStage = useLab((s) => stageOf(s.focus) === "blackhole");
  const ready = useLab((s) => s.ready);
  const hdr = useLab((s) => TIERS[s.tier].bloom && s.settings.glow);
  const detail = useLab((s) => s.tier !== "cpu");
  const bhResets = useLab((s) => s.bhResets);
  const reduceMotion = useReducedMotion();
  const time = useRef(0);

  useEffect(() => () => view.dispose(), [view]);

  // Build the table when the chapter opens, or in idle time once the lab is up.
  useEffect(() => {
    if (view.built) return;
    if (onStage) {
      view.build();
      return;
    }
    if (!ready) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(view.build, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(view.build, 2000);
    return () => window.clearTimeout(id);
  }, [view, onStage, ready]);

  useEffect(() => {
    view.material.uniforms.uHdr.value = hdr ? 1 : 0;
    view.material.uniforms.uDetail.value = detail ? 1 : 0;
  }, [view, hdr, detail]);

  useEffect(() => {
    if (bhResets === 0) return;
    sim.bhDeep = 0;
    sim.bhSun = 0;
    sim.bhHole = 0;
  }, [bhResets]);

  useFrame(({ camera }, delta) => {
    if (sim.stage !== "blackhole") return;
    const { paused, speed, bhTimelapse, bhRadius } = useLab.getState();

    // The three clocks. Real seconds (sim.dt is clamped for smooth animation; a clock must not lose time).
    const raw = Number.isFinite(delta) && delta > 0 ? delta : 0;
    const dt = (paused ? sim.dt : Math.min(raw, MAX_CLOCK_STEP) * speed) * (bhTimelapse ? TIMELAPSE_SCALE : 1);
    sim.bhDeep += dt;
    sim.bhSun += dt * RATE_SUN;
    sim.bhHole += dt * hoverRate(bhRadius);

    if (!reduceMotion) time.current = (time.current + sim.dt * TIME_SCALE) % TIME_WRAP;
    view.material.uniforms.uTime.value = time.current;

    // Labels point at features of the edge-on picture, so they show only near that view.
    toCamera.copy(camera.position).normalize();
    const angle = toCamera.angleTo(edgeOn);
    const opacity = THREE.MathUtils.clamp((LABEL_ANGLE - angle) / THREE.MathUtils.degToRad(7), 0, 1);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    // Points across the line of sight through the hole land where rays with that impact parameter do.
    placeLabel("bh:shadow", opacity, 0, 0.55);
    placeLabel("bh:lensed", opacity, 0, 6.3);
    // The gas on the left comes towards a camera above the disk; the label sits over the disk's left end.
    right.y = 0;
    right.normalize();
    placeLabel("bh:approaching", opacity, -8.6, 0.9);
  });

  return (
    <mesh
      geometry={view.geometry}
      material={view.material}
      visible={onStage}
      renderOrder={-1000}
      frustumCulled={false}
    />
  );
}

/** Puts a label at `x` along the camera's right and `y` along its up, from the hole. */
function placeLabel(id: string, opacity: number, x: number, y: number) {
  const a = getAnchor(id);
  a.visible = opacity > 0;
  a.opacity = opacity;
  a.world.copy(right).multiplyScalar(x).addScaledVector(up, y);
}
