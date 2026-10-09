"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getAnchor, type Anchor } from "@/lib/anchors";
import { cameraFollow } from "@/lib/camera";
import { stageOf } from "@/lib/chapters";
import { TIERS, type Tier } from "@/lib/quality";
import {
  BODIES,
  BODY_IDS,
  PLANET_IDS,
  SATURN_RINGS,
  SUN_RADIUS,
  followDistance,
  meanLongitude,
  meanMotion,
  moonDirection,
  orbitPath,
  orbitalPeriodDays,
  planetPosition,
  sceneDistance,
  semiMajorAxis,
  spinAxis,
  spinRate,
  visualRadius,
  type OrbitPoint,
  type PlanetId,
} from "@/lib/solar";
import { daysSinceJ2000, sim, useLab, type BodyId } from "@/lib/store";
import { haloTexture } from "./Halo";

/**
 * Chapter S: the real Solar System, on today's date.
 *
 * Every body is placed from NASA JPL's orbital elements (lib/solar.ts) and
 * the simulated clock runs at days per second. Sizes are enlarged and
 * distances compressed so all eight planets fit; tilts, spins, orbits and
 * the Moon's phase are real. It is drawn for computers without a graphics
 * card: small custom shaders (no scene lights, so other stages never
 * recompile), sprite glows instead of post-processing, surface maps fetched
 * only when the app is idle, and no allocation per frame.
 */

const TEXTURES = ["sun", "earth", "jupiter", "saturn", "mars", "venus", "mercury", "uranus", "neptune", "moon"] as const;
type TextureName = (typeof TEXTURES)[number];

/** Points per orbit line. */
const ORBIT_SEGMENTS = 256;
/** Redraw the orbit lines after this many simulated days (their slow precession). */
const ORBIT_REFRESH_DAYS = 3650;
/** Fastest visible spin (rad/s): at a year per second Jupiter would turn 880 times a second and strobe. */
const SPIN_CAP = 1.2;
const SUN_SPIN_CAP = 0.15;
/** The Moon is drawn this far from Earth (scene units; not to scale) and this big. */
const MOON_DISTANCE = 0.75;
const MOON_RADIUS = visualRadius("earth") * Math.sqrt(1737.4 / BODIES.earth.radiusKm);
/** Smallest click target around a body, in CSS pixels (Mercury is a pixel or two across from afar). */
const MIN_TARGET_PX = 11;
/** Which label stays when two would overlap: the followed body, then Earth (home), the Sun, the giants, and the rest. */
const LABEL_ORDER = (["earth", "sun", "jupiter", "saturn", "uranus", "neptune", "mars", "venus", "mercury"] as const).map((id) =>
  BODY_IDS.indexOf(id),
);

/**
 * Surface look per body: the map's mean colour (shown until the map has
 * loaded), an atmosphere glow at the lit limb, and a veil over the map.
 * Venus's map is its radar-mapped ground; from space we see only its
 * cream clouds, so the ground shows faintly through a veil.
 */
const LOOK: Record<PlanetId | "moon", { base: string; atmosphere?: [string, number]; veil?: [string, number] }> = {
  mercury: { base: "#858483" },
  venus: { base: "#c57128", atmosphere: ["#f6e7c1", 0.55], veil: ["#e9d9b2", 0.72] },
  earth: { base: "#546582", atmosphere: ["#5d95ff", 0.95] },
  mars: { base: "#b76348", atmosphere: ["#e0a283", 0.22] },
  jupiter: { base: "#a7a196", atmosphere: ["#e2d2b4", 0.2] },
  saturn: { base: "#d0c1a3", atmosphere: ["#eadcb6", 0.2] },
  uranus: { base: "#9bcbd2", atmosphere: ["#b8f4ff", 0.42] },
  neptune: { base: "#364fa8", atmosphere: ["#7d9cff", 0.45] },
  moon: { base: "#979392" },
};

/** Asteroid belt and Jupiter's Trojans (points). */
const BELT: Record<Tier, { belt: number; trojans: number }> = {
  high: { belt: 2000, trojans: 300 },
  low: { belt: 2000, trojans: 300 },
  cpu: { belt: 1200, trojans: 200 },
};

/* ------------------------------------------------------------------------ */
/* Shaders                                                                   */
/* ------------------------------------------------------------------------ */

const PLANET_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vToSun;
varying vec3 vToEye;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalMatrix * normal;
  // The Sun sits at the world origin; viewMatrix[3] is where the origin lies in view space.
  vToSun = viewMatrix[3].xyz - mv.xyz;
  vToEye = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const PLANET_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 base;
uniform vec4 veil;
uniform vec3 atmosphere;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vToSun;
varying vec3 vToEye;
void main() {
  vec3 n = normalize(vNormal);
  vec3 l = normalize(vToSun);
  vec3 v = normalize(vToEye);
  // Until the map arrives the texture samples as transparent black: show the mean colour.
  vec4 tex = texture2D(map, vUv);
  vec3 albedo = mix(mix(base, tex.rgb, tex.a), veil.rgb, veil.a);
  float ndl = dot(n, l);
  // Sunlight, plus a little starlight so the night side is dark but not a hole.
  vec3 color = albedo * (0.035 + max(ndl, 0.0));
  // Atmosphere: a thin bright rim on the day side, where we look through the most air.
  float rim = 1.0 - max(dot(n, v), 0.0);
  color += atmosphere * (rim * rim * rim) * smoothstep(-0.25, 0.45, ndl);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

const SUN_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vToEye;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalMatrix * normal;
  vToEye = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const SUN_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform float gain;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vToEye;
void main() {
  vec4 tex = texture2D(map, vUv);
  // The map's brightness (granulation and active regions) drives a colour ramp from deep orange to yellow-white.
  float b = mix(0.75, clamp(dot(tex.rgb, vec3(0.75, 0.6, 0.2)) * 1.2, 0.0, 1.0), tex.a);
  b *= b;
  vec3 hot = mix(vec3(0.85, 0.24, 0.03), vec3(1.0, 0.86, 0.5), b) * (0.8 + 0.5 * b);
  // Limb darkening: near the edge we see higher, cooler gas, dimmer and redder.
  float edge = 1.0 - max(dot(normalize(vNormal), normalize(vToEye)), 0.0);
  vec3 limb = vec3(1.0 - 0.4 * edge, 1.0 - 0.7 * edge, 1.0 - 0.9 * edge);
  gl_FragColor = vec4(hot * limb * gain, 1.0);
  #include <colorspace_fragment>
}`;

const RING_VERTEX = /* glsl */ `
varying float vRadius;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vRadius = uv.x;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const RING_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 planet;
uniform float planetRadius;
varying float vRadius;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 t = texture2D(map, vec2(vRadius, 0.5));
  vec3 l = normalize(-vWorld);
  vec3 v = normalize(cameraPosition - vWorld);
  float mu0 = dot(vNormal, l);
  float mu = dot(vNormal, v);
  // Icy particles scatter like a dusty surface (Lommel-Seeliger): bright even when lit at a slant.
  float lit = 2.0 * abs(mu0) / (abs(mu0) + abs(mu) + 0.02);
  // From the unlit face we only see light that filters through: thin rings glow, the dense B ring stays dark.
  if (mu0 * mu < 0.0) lit *= 2.2 * (1.0 - t.a);
  // Saturn's shadow falls across the rings behind it.
  vec3 oc = vWorld - planet;
  float b = dot(oc, l);
  float shadow = b < 0.0 ? smoothstep(0.92, 1.0, (dot(oc, oc) - b * b) / (planetRadius * planetRadius)) : 1.0;
  gl_FragColor = vec4(t.rgb * (0.03 + lit * shadow), t.a);
  #include <colorspace_fragment>
}`;

const ORBIT_VERTEX = /* glsl */ `
attribute float anomaly;
uniform float head;
varying float vBehind;
void main() {
  // How far round the orbit this point lies behind the planet (0 = at the planet, 1 = just ahead of it).
  vBehind = fract((head - anomaly) / 6.28318530718);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ORBIT_FRAGMENT = /* glsl */ `
uniform vec3 color;
uniform float opacity;
varying float vBehind;
void main() {
  // A trail: brightest just behind the planet, fading round the orbit to a faint line.
  float trail = 1.0 - vBehind;
  gl_FragColor = vec4(color, opacity * (0.28 + 0.72 * trail * trail * trail));
  #include <colorspace_fragment>
}`;

/**
 * Each point stores its orbit (position = scene radius, height, angle at
 * J2000) and its motion (rate in radians per day, brightness), so the whole
 * belt turns at the real Kepler rates on the GPU with one uniform.
 */
const BELT_VERTEX = /* glsl */ `
attribute vec2 motion;
uniform float day;
uniform float pointScale;
varying float vShade;
void main() {
  float r = position.x;
  float angle = position.z + motion.x * day;
  vec4 mv = modelViewMatrix * vec4(r * cos(angle), position.y, -r * sin(angle), 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(pointScale * 0.05 / -mv.z, 1.0, 2.5);
  vShade = motion.y;
}`;

const BELT_FRAGMENT = /* glsl */ `
varying float vShade;
void main() {
  // Faint and warm: a dusty band, as the belt is drawn in charts (from afar it would be invisible).
  gl_FragColor = vec4(vec3(0.07, 0.058, 0.043) * vShade, 1.0);
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------------------ */
/* Assets                                                                     */
/* ------------------------------------------------------------------------ */

function colorVec(hex: string) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

/** An empty texture: the image is fetched later, into the same object, so no shader changes. */
function surfaceTexture(anisotropy: number) {
  const t = new THREE.Texture();
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function bodyMaterial(map: THREE.Texture, look: (typeof LOOK)[keyof typeof LOOK]) {
  const veil = look.veil ? new THREE.Color(look.veil[0]) : new THREE.Color(0);
  const atmosphere = look.atmosphere ? new THREE.Color(look.atmosphere[0]).multiplyScalar(look.atmosphere[1]) : new THREE.Color(0);
  return new THREE.ShaderMaterial({
    vertexShader: PLANET_VERTEX,
    fragmentShader: PLANET_FRAGMENT,
    uniforms: {
      map: { value: map },
      base: { value: colorVec(look.base) },
      veil: { value: new THREE.Vector4(veil.r, veil.g, veil.b, look.veil?.[1] ?? 0) },
      atmosphere: { value: new THREE.Vector3(atmosphere.r, atmosphere.g, atmosphere.b) },
    },
  });
}

/**
 * Saturn's rings as a strip of colour and opacity across their width, from
 * the real ring radii: the faint C ring, the bright B ring, the dark
 * Cassini Division, and the A ring with the Encke Gap.
 */
function ringTexture(inner: number, outer: number) {
  const width = 1024;
  const data = new Uint8Array(width * 4);
  const R = SATURN_RINGS;
  for (let i = 0; i < width; i++) {
    const km = inner + ((i + 0.5) / width) * (outer - inner);
    let color: [number, number, number] = [0, 0, 0];
    let alpha = 0;
    if (km >= R.cInner && km < R.bInner) {
      const f = (km - R.cInner) / (R.bInner - R.cInner);
      color = [150, 136, 120];
      alpha = 0.1 + 0.14 * f;
    } else if (km >= R.bInner && km < R.cassiniInner) {
      const f = (km - R.bInner) / (R.cassiniInner - R.bInner);
      color = [226, 207, 172];
      alpha = 0.72 + 0.24 * Math.sin(Math.min(1, f * 1.4) * Math.PI * 0.5);
    } else if (km >= R.cassiniInner && km < R.aInner) {
      color = [120, 108, 96];
      alpha = 0.07;
    } else if (km >= R.aInner && km < R.aOuter) {
      color = [196, 182, 158];
      alpha = km >= R.enckeInner && km < R.enckeOuter ? 0.05 : 0.6;
    }
    // Ringlets: a few incommensurate ripples, so the bands are not flat.
    const ripple = 0.86 + 0.08 * Math.sin(km * 0.0031) + 0.06 * Math.sin(km * 0.00071 + 1.7);
    data[i * 4] = Math.min(255, color[0] * ripple);
    data[i * 4 + 1] = Math.min(255, color[1] * ripple);
    data[i * 4 + 2] = Math.min(255, color[2] * ripple);
    data[i * 4 + 3] = Math.round(255 * Math.min(1, alpha * (0.9 + 0.1 * ripple)));
  }
  const t = new THREE.DataTexture(data, width, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** A soft glow sprite texture; `profile` gives brightness against distance from the centre (0..1 of the sprite's radius). */
function glowTexture(profile: (r: number) => number) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 32; i++) {
    const r = i / 32;
    g.addColorStop(r, `rgba(255,255,255,${Math.max(0, Math.min(1, profile(r))).toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Streamers: soft radial rays like the corona seen in a total eclipse,
 * longer along the Sun's equator. Drawn once on a canvas.
 */
function streamerTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const disc = c / STREAMER_SPAN;
  const random = mulberry32(7);
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(3px)";
  for (let i = 0; i < 28; i++) {
    const angle = random() * Math.PI * 2;
    // Equatorial streamers reach further than polar plumes.
    const equator = Math.abs(Math.cos(angle));
    const length = disc * (1.6 + (1.2 + 2.6 * equator) * random());
    const width = disc * (0.12 + 0.3 * random());
    const g = ctx.createLinearGradient(0, 0, length, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(disc / length, `rgba(255,255,255,${(0.25 + 0.3 * random()).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -width);
    ctx.quadraticCurveTo(length * 0.55, -width * 0.25, length, 0);
    ctx.quadraticCurveTo(length * 0.55, width * 0.25, 0, width);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Inner corona: 3.2 Sun radii across the sprite's radius, falling off like the real K-corona (≈ r^-2.5). */
const CORONA_SPAN = 3.2;
/** Streamers reach up to about 5.5 Sun radii. */
const STREAMER_SPAN = 6;
/** Outer glare: a wide, faint scattering halo. */
const GLARE_SPAN = 13;

function createAssets(tier: Tier) {
  const [w, h] = tier === "cpu" ? [32, 16] : [48, 24];
  const anisotropy = tier === "cpu" ? 1 : tier === "low" ? 2 : 4;
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

  const sphere = keep(new THREE.SphereGeometry(1, w, h));
  const hitSphere = keep(new THREE.SphereGeometry(1, 12, 8));
  const hitMaterial = keep(new THREE.MeshBasicMaterial({ visible: false }));

  const textures = {} as Record<TextureName, THREE.Texture>;
  for (const name of TEXTURES) textures[name] = keep(surfaceTexture(anisotropy));

  const sunMaterial = keep(
    new THREE.ShaderMaterial({
      vertexShader: SUN_VERTEX,
      fragmentShader: SUN_FRAGMENT,
      uniforms: { map: { value: textures.sun }, gain: { value: 1 } },
    }),
  );
  const corona = keep(
    new THREE.SpriteMaterial({
      map: keep(glowTexture((r) => 0.6 * (1 - r * r) ** 2 * Math.min(1, (r * CORONA_SPAN) ** -3))),
      color: new THREE.Color(1.0, 0.66, 0.34),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const streamers = keep(
    new THREE.SpriteMaterial({
      map: keep(streamerTexture()),
      color: new THREE.Color(1.0, 0.72, 0.42),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const glare = keep(
    new THREE.SpriteMaterial({
      map: keep(glowTexture((r) => (1 - r) ** 2 / (1 + ((Math.max(0, r * GLARE_SPAN - 1) / 2.2) ** 2)))),
      color: new THREE.Color(1.0, 0.5, 0.16),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );

  const materials = {} as Record<PlanetId | "moon", THREE.ShaderMaterial>;
  for (const id of [...PLANET_IDS, "moon"] as const) materials[id] = keep(bodyMaterial(textures[id], LOOK[id]));

  // Saturn's rings, in its equatorial plane, with u running from the inner to the outer edge.
  const saturnEq = (visualRadius("saturn") * BODIES.saturn.equatorialKm) / BODIES.saturn.radiusKm;
  const ringInner = (SATURN_RINGS.cInner / BODIES.saturn.equatorialKm) * saturnEq;
  const ringOuter = (SATURN_RINGS.aOuter / BODIES.saturn.equatorialKm) * saturnEq;
  const ringGeometry = keep(new THREE.RingGeometry(ringInner, ringOuter, tier === "cpu" ? 96 : 160, 1).rotateX(-Math.PI / 2));
  const ringPos = ringGeometry.attributes.position;
  const ringUv = ringGeometry.attributes.uv;
  for (let i = 0; i < ringPos.count; i++) {
    ringUv.setXY(i, (Math.hypot(ringPos.getX(i), ringPos.getZ(i)) - ringInner) / (ringOuter - ringInner), 0.5);
  }
  const ringMaterial = keep(
    new THREE.ShaderMaterial({
      vertexShader: RING_VERTEX,
      fragmentShader: RING_FRAGMENT,
      uniforms: {
        map: { value: keep(ringTexture(SATURN_RINGS.cInner, SATURN_RINGS.aOuter)) },
        planet: { value: new THREE.Vector3() },
        planetRadius: { value: saturnEq },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  // Orbit lines, with each point's eccentric anomaly for the trail.
  const orbits = PLANET_IDS.map((id) => {
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ORBIT_SEGMENTS * 3), 3));
    geometry.setAttribute("anomaly", new THREE.BufferAttribute(new Float32Array(ORBIT_SEGMENTS), 1));
    const material = keep(
      new THREE.ShaderMaterial({
        vertexShader: ORBIT_VERTEX,
        fragmentShader: ORBIT_FRAGMENT,
        uniforms: { color: { value: new THREE.Color(BODIES[id].hue) }, opacity: { value: 0.5 }, head: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    );
    return { geometry, material };
  });

  // The asteroid belt (2.1–3.3 au, avoiding the Kirkwood gaps Jupiter clears) and Jupiter's Trojans,
  // which share its orbit 60° ahead and behind.
  const random = mulberry32(2026);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const { belt, trojans } = BELT[tier];
  const count = belt + trojans;
  const orbit = new Float32Array(count * 3);
  const motion = new Float32Array(count * 2);
  const KIRKWOOD = [2.502, 2.825, 2.958, 3.279];
  const jupiterA = semiMajorAxis("jupiter", 0);
  const jupiterL = meanLongitude("jupiter", 0);
  const jupiterRate = (Math.PI * 2) / orbitalPeriodDays("jupiter");
  for (let i = 0; i < count; i++) {
    let au: number;
    let angle: number;
    let rate: number;
    let incl: number;
    if (i < belt) {
      do au = 2.1 + random() * 1.2;
      while (KIRKWOOD.some((k) => Math.abs(au - k) < 0.025));
      angle = random() * Math.PI * 2;
      rate = meanMotion(au);
      incl = gauss() * 0.11;
    } else {
      // Trojans circle the Sun with Jupiter, gathered 60° ahead of it and 60° behind.
      au = jupiterA + gauss() * 0.08;
      angle = jupiterL + (i % 2 ? 1 : -1) * (Math.PI / 3) + gauss() * 0.22;
      rate = jupiterRate;
      incl = gauss() * 0.2;
    }
    const r = sceneDistance(au);
    orbit[i * 3] = r;
    orbit[i * 3 + 1] = r * Math.sin(incl) * 0.6;
    orbit[i * 3 + 2] = angle;
    motion[i * 2] = rate;
    motion[i * 2 + 1] = 0.35 + 0.65 * random() ** 2;
  }
  const beltGeometry = keep(new THREE.BufferGeometry());
  beltGeometry.setAttribute("position", new THREE.BufferAttribute(orbit, 3));
  beltGeometry.setAttribute("motion", new THREE.BufferAttribute(motion, 2));
  const beltMaterial = keep(
    new THREE.ShaderMaterial({
      vertexShader: BELT_VERTEX,
      fragmentShader: BELT_FRAGMENT,
      uniforms: { day: { value: 0 }, pointScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  // Planet markers: from far away each planet is a pixel or two, so a soft glint in its colour keeps it visible.
  const markerGeometry = keep(new THREE.BufferGeometry());
  markerGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PLANET_IDS.length * 3), 3));
  const markerColors = new Float32Array(PLANET_IDS.length * 3);
  PLANET_IDS.forEach((id, i) => new THREE.Color(BODIES[id].hue).toArray(markerColors, i * 3));
  markerGeometry.setAttribute("color", new THREE.BufferAttribute(markerColors, 3));
  const markerMaterial = keep(
    new THREE.PointsMaterial({
      size: 9,
      sizeAttenuation: false,
      map: haloTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );

  // Spin axes (body group local +y → the real pole direction).
  const up = new THREE.Vector3(0, 1, 0);
  const axes = {} as Record<BodyId, THREE.Quaternion>;
  for (const id of BODY_IDS) {
    const a = spinAxis(id, new THREE.Vector3()) as THREE.Vector3;
    axes[id] = new THREE.Quaternion().setFromUnitVectors(up, a);
  }

  return {
    sphere,
    hitSphere,
    hitMaterial,
    textures,
    sunMaterial,
    corona,
    streamers,
    glare,
    materials,
    ringGeometry,
    ringMaterial,
    orbits,
    beltGeometry,
    beltMaterial,
    markerGeometry,
    markerMaterial,
    axes,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------------ */
/* Surface maps                                                               */
/* ------------------------------------------------------------------------ */

/**
 * Fetch the surface maps one at a time, decoded off the main thread and
 * uploaded straight away, so neither the first load nor the first frame of
 * the chapter pays for them.
 */
async function loadSurfaces(textures: Record<TextureName, THREE.Texture>, gl: THREE.WebGLRenderer, signal: { cancelled: boolean }) {
  for (const name of TEXTURES) {
    if (signal.cancelled) return;
    const texture = textures[name];
    if (texture.image) continue;
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = `/textures/planets/${name}.jpg`;
      await img.decode();
      if (signal.cancelled) return;
      texture.image = img;
      texture.needsUpdate = true;
      gl.initTexture(texture);
    } catch {
      // Offline or blocked: the body keeps its mean colour.
    }
    if (sim.stage !== "solar") await idle();
  }
}

function idle() {
  return new Promise<void>((resolve) => requestIdle(resolve, 2000));
}

/** requestIdleCallback where available (Safari has none): returns a cancel function. */
function requestIdle(callback: () => void, timeout: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => callback(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, Math.min(timeout, 1500));
  return () => window.clearTimeout(id);
}

/** Only bodies on show can be clicked: the meshes stay mounted (and raycastable) on the other stages. */
function solarRaycast(this: THREE.Mesh, raycaster: THREE.Raycaster, hits: THREE.Intersection[]) {
  if (sim.stage === "solar") THREE.Mesh.prototype.raycast.call(this, raycaster, hits);
}

/* ------------------------------------------------------------------------ */
/* Scene                                                                      */
/* ------------------------------------------------------------------------ */

export function SolarSystem() {
  const gl = useThree((s) => s.gl);
  const [tier] = useState(() => useLab.getState().tier);
  const [a] = useState(() => createAssets(tier));
  const [state] = useState(() => ({
    points: PLANET_IDS.map((): OrbitPoint => ({ x: 0, y: 0, z: 0, r: 0, E: 0 })),
    spin: new Float32Array(BODY_IDS.length),
    orbitEpoch: Number.NaN,
    moon: new THREE.Vector3(),
    anchors: BODY_IDS.map((id) => getAnchor(`solar:${id}`)),
    /** Label screen positions and which are shown, for decluttering. */
    labelXY: new Float32Array(BODY_IDS.length * 2),
    labelShown: new Uint8Array(BODY_IDS.length),
    projected: new THREE.Vector3(),
    hover: 0,
    /** Surface maps: fetching has started (it runs to the end), or the scene was unmounted. */
    loading: false,
    signal: { cancelled: false },
  }));

  const root = useRef<THREE.Group>(null);
  const sunSpin = useRef<THREE.Mesh>(null);
  const bodies = useRef<(THREE.Group | null)[]>([]);
  const spins = useRef<(THREE.Mesh | null)[]>([]);
  const hits = useRef<(THREE.Mesh | null)[]>([]);
  const moon = useRef<THREE.Mesh>(null);

  useEffect(() => {
    state.signal.cancelled = false;
    return () => {
      state.signal.cancelled = true;
      a.dispose();
    };
  }, [a, state]);

  // Surface maps: as soon as the chapter opens, or in idle time once the app is ready.
  const solarShown = useLab((s) => stageOf(s.focus) === "solar");
  const ready = useLab((s) => s.ready);
  useEffect(() => {
    if (state.loading || (!solarShown && !ready)) return;
    const start = () => {
      if (state.loading) return;
      state.loading = true;
      loadSurfaces(a.textures, gl, state.signal);
    };
    if (solarShown) return start();
    return requestIdle(start, 4000);
  }, [a, gl, ready, solarShown, state]);

  // With bloom (full tier) the glow pass already spreads the Sun's light (its bright parts exceed 1),
  // so the disc is drawn a touch dimmer and the sprites fainter; without bloom the sprites are the glow.
  const bloom = useLab((s) => TIERS[s.tier].bloom && s.settings.glow);
  useEffect(() => {
    a.sunMaterial.uniforms.gain.value = bloom ? 0.95 : 1;
    a.corona.opacity = bloom ? 0.45 : 0.95;
    a.streamers.opacity = bloom ? 0.25 : 0.42;
    a.glare.opacity = bloom ? 0.12 : 0.26;
  }, [a, bloom]);

  // "Back to today".
  const solarResets = useLab((s) => s.solarResets);
  useEffect(() => {
    if (solarResets > 0) sim.solarDay = daysSinceJ2000(new Date());
  }, [solarResets]);

  // Point the camera at a newly chosen body at once: the camera rig starts its flight in the same
  // update, before this scene's next frame would have written the position.
  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        if (s.solarFocus !== prev.solarFocus) writeFollow(s.solarFocus, state.points);
        // Leaving the chapter under a hovered body: the pointer-out only comes with the next move.
        if (state.hover && stageOf(s.focus) !== "solar") {
          state.hover = 0;
          document.body.style.cursor = "";
        }
      }),
    [state],
  );
  useEffect(
    () => () => {
      if (state.hover) document.body.style.cursor = "";
      cameraFollow.active = false;
    },
    [state],
  );

  useFrame(({ camera, size, viewport }) => {
    const g = root.current;
    if (!g) return;
    const on = sim.stage === "solar";
    g.visible = on;
    if (!on) return;

    const { solarSpeed, solarFocus } = useLab.getState();
    sim.solarDay += sim.dt * solarSpeed;
    const day = sim.solarDay;

    if (!(Math.abs(day - state.orbitEpoch) < ORBIT_REFRESH_DAYS)) {
      state.orbitEpoch = day;
      PLANET_IDS.forEach((id, i) => {
        const geo = a.orbits[i].geometry;
        orbitPath(id, day, geo.attributes.position.array as Float32Array, geo.attributes.anomaly.array as Float32Array);
        geo.attributes.position.needsUpdate = true;
        geo.attributes.anomaly.needsUpdate = true;
        geo.computeBoundingSphere();
      });
    }

    // Click targets keep a minimum size on screen.
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
    const pxPerUnitAt1 = size.height / (2 * Math.tan((fov * Math.PI) / 360));
    const markers = a.markerGeometry.attributes.position;
    const markerArray = markers.array as Float32Array;

    // Sun.
    state.spin[0] += Math.min(spinRate("sun") * solarSpeed, SUN_SPIN_CAP) * sim.dt;
    if (sunSpin.current) sunSpin.current.rotation.y = state.spin[0];
    placeTarget(hits.current[0], SUN_RADIUS, camera.position.length(), pxPerUnitAt1);
    const sunLabel = state.anchors[0];
    sunLabel.visible = true;
    sunLabel.highlight = solarFocus === "sun";
    sunLabel.world.set(0, SUN_RADIUS + 0.9, 0);

    // Planets.
    for (let i = 0; i < PLANET_IDS.length; i++) {
      const id = PLANET_IDS[i];
      const p = planetPosition(id, day, state.points[i]);
      const body = bodies.current[i];
      if (!body) continue;
      body.position.set(p.x, p.y, p.z);
      markerArray[i * 3] = p.x;
      markerArray[i * 3 + 1] = p.y;
      markerArray[i * 3 + 2] = p.z;

      state.spin[i + 1] += Math.min(spinRate(id) * solarSpeed, SPIN_CAP) * sim.dt;
      const spin = spins.current[i];
      if (spin) spin.rotation.y = state.spin[i + 1];

      const r = visualRadius(id);
      placeTarget(hits.current[i + 1], r, camera.position.distanceTo(body.position), pxPerUnitAt1);
      const label = state.anchors[i + 1];
      label.visible = true;
      label.highlight = solarFocus === id;
      label.world.set(p.x, p.y + r + 0.35, p.z);

      const orbit = a.orbits[i].material.uniforms;
      orbit.head.value = p.E;
      orbit.opacity.value = solarFocus === null || solarFocus === "sun" ? 0.5 : solarFocus === id ? 0.85 : 0.26;
      if (id === "saturn") a.ringMaterial.uniforms.planet.value.copy(body.position);
    }
    markers.needsUpdate = true;

    // The Moon, at its real phase, keeping one face to Earth.
    const m = moonDirection(day, state.moon);
    if (moon.current) {
      moon.current.position.set(m.x * MOON_DISTANCE, m.z * MOON_DISTANCE, -m.y * MOON_DISTANCE);
      moon.current.rotation.y = Math.atan2(-m.y, -m.x);
    }

    declutterLabels(state, solarFocus ? BODY_IDS.indexOf(solarFocus) : -1, camera, size);

    // Asteroids turn on the GPU; only the clock and the point scale change here.
    a.beltMaterial.uniforms.day.value = day;
    a.beltMaterial.uniforms.pointScale.value = pxPerUnitAt1 * viewport.dpr;

    if (solarFocus) writeFollow(solarFocus, state.points);
    else cameraFollow.active = false;
  }, -1);

  const onOver = () => {
    if (sim.stage !== "solar") return;
    state.hover++;
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    state.hover = Math.max(0, state.hover - 1);
    if (!state.hover) document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // A drag that starts and ends on a planet is the view being turned, not a choice.
    if (sim.stage !== "solar" || e.delta > 4) return;
    e.stopPropagation();
    useLab.getState().setSolarFocus(e.eventObject.userData.body as BodyId);
  };
  const target = (i: number, id: BodyId) => (
    <mesh
      ref={(m) => void (hits.current[i] = m)}
      geometry={a.hitSphere}
      material={a.hitMaterial}
      userData={{ body: id }}
      raycast={solarRaycast}
      onClick={onClick}
      onPointerOver={onOver}
      onPointerOut={onOut}
    />
  );

  return (
    <group ref={root} visible={false}>
      {/* The Sun: textured, self-lit, with a corona and a wide glare. */}
      <group quaternion={a.axes.sun}>
        <mesh ref={sunSpin} geometry={a.sphere} material={a.sunMaterial} scale={SUN_RADIUS} />
      </group>
      <sprite material={a.corona} scale={[SUN_RADIUS * 2 * CORONA_SPAN, SUN_RADIUS * 2 * CORONA_SPAN, 1]} />
      <sprite material={a.streamers} scale={[SUN_RADIUS * 2 * STREAMER_SPAN, SUN_RADIUS * 2 * STREAMER_SPAN, 1]} />
      <sprite material={a.glare} scale={[SUN_RADIUS * 2 * GLARE_SPAN, SUN_RADIUS * 2 * GLARE_SPAN, 1]} />
      {target(0, "sun")}

      {PLANET_IDS.map((id, i) => {
        const b = BODIES[id];
        const r = visualRadius(id);
        return (
          <group key={id} ref={(g) => void (bodies.current[i] = g)}>
            <group quaternion={a.axes[id]}>
              <mesh
                ref={(m) => void (spins.current[i] = m)}
                geometry={a.sphere}
                material={a.materials[id]}
                scale={[(r * b.equatorialKm) / b.radiusKm, (r * b.polarKm) / b.radiusKm, (r * b.equatorialKm) / b.radiusKm]}
              />
              {id === "saturn" && <mesh geometry={a.ringGeometry} material={a.ringMaterial} />}
            </group>
            {id === "earth" && <mesh ref={moon} geometry={a.sphere} material={a.materials.moon} scale={MOON_RADIUS} />}
            {target(i + 1, id)}
          </group>
        );
      })}

      {a.orbits.map((o, i) => (
        <lineLoop key={PLANET_IDS[i]} geometry={o.geometry} material={o.material} />
      ))}
      <points geometry={a.beltGeometry} material={a.beltMaterial} frustumCulled={false} />
      <points geometry={a.markerGeometry} material={a.markerMaterial} frustumCulled={false} />
    </group>
  );
}

/**
 * From afar the inner planets' labels pile up on the Sun's: show a label
 * only where it does not cover one that matters more.
 */
function declutterLabels(
  state: { anchors: Anchor[]; labelXY: Float32Array; labelShown: Uint8Array; projected: THREE.Vector3 },
  focus: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
) {
  const { anchors, labelXY, labelShown, projected: v } = state;
  labelShown.fill(0);
  for (let k = -1; k < LABEL_ORDER.length; k++) {
    const i = k < 0 ? focus : LABEL_ORDER[k];
    if (i < 0 || (k >= 0 && i === focus)) continue;
    const a = anchors[i];
    v.copy(a.world).project(camera);
    // Behind the camera: the projector hides it anyway, and it covers nothing.
    if (v.z > 1) continue;
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    const w = a.width || 72;
    const h = a.height || 24;
    let free = true;
    for (let j = 0; j < labelShown.length && free; j++) {
      if (!labelShown[j]) continue;
      const b = anchors[j];
      free =
        Math.abs(x - labelXY[j * 2]) > (w + (b.width || 72)) / 2 + 4 || Math.abs(y - labelXY[j * 2 + 1]) > Math.max(h, b.height || 24) + 2;
    }
    a.visible = free;
    if (!free) continue;
    labelShown[i] = 1;
    labelXY[i * 2] = x;
    labelXY[i * 2 + 1] = y;
  }
}

/** Scale a body's click target to its size, but never smaller than MIN_TARGET_PX on screen. */
function placeTarget(hit: THREE.Mesh | null, radius: number, distance: number, pxPerUnitAt1: number) {
  if (!hit) return;
  hit.scale.setScalar(Math.max(radius * 1.15, (MIN_TARGET_PX * distance) / pxPerUnitAt1));
}

/** Hand the followed body's position and viewing distance to the camera rig. */
function writeFollow(id: BodyId | null, points: OrbitPoint[]) {
  if (!id) {
    cameraFollow.active = false;
    return;
  }
  if (id === "sun") cameraFollow.position.set(0, 0, 0);
  else {
    const i = PLANET_IDS.indexOf(id);
    const p = planetPosition(id, sim.solarDay, points[i]);
    cameraFollow.position.set(p.x, p.y, p.z);
  }
  cameraFollow.distance = followDistance(id);
  cameraFollow.active = true;
}
