"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { formatDegrees } from "@/lib/format";
import { createFatLine, disposeFatLine, lineColorArray, writeLinePoints, type FatLine } from "@/lib/lines";
import { GRID_HALF, PHOTON_LIFT, PHOTON_MAX_POINTS, SUN_DEFLECTION_DEG, tracePhoton, type PhotonPath } from "@/lib/physics";
import { TIERS } from "@/lib/quality";
import { sim, useLab } from "@/lib/store";
import { createHaloSprite, halosEnabled } from "./Halo";

/** Photon speed along its path, in grid units per second of simulation time. */
const SPEED = 16;
/** Length of the bright streak behind the photon. */
const STREAK = 6;
/** Brightness of a finished path: the latest shot, and older ones. */
const LATEST = 0.6;
const OLDER = 0.22;
/** Number of paths kept on the grid at once. */
const POOL = 3;
/** Moving the mass slider by more than this makes old paths stale, so they fade out. */
const STALE_MASS = 2;

const BEAM = new THREE.Color(1.0, 0.86, 0.55);
const STAR_HALO = new THREE.Color(1.0, 0.88, 0.62);

type SlotState = "idle" | "flying" | "shown" | "fading";

interface Slot {
  group: THREE.Group;
  path: FatLine;
  guide: FatLine;
  sight: FatLine;
  head: THREE.Group;
  flash: THREE.Mesh;
  star: THREE.Mesh;
  ghost: THREE.Mesh;
  observer: THREE.Mesh;
  headHalo: THREE.Sprite;
  starHalo: THREE.Sprite;
  state: SlotState;
  data: PhotonPath | null;
  massSlider: number;
  age: number;
  cursor: number;
  /** Arc length the light has reached (Infinity once it has arrived). */
  reach: number;
  level: number;
  fade: number;
  latest: boolean;
  apparent: THREE.Vector3 | null;
}

/**
 * MODULE B — gravitational lensing.
 *
 * "Fire Photon Beam" traces light from a distant star across the grid,
 * aimed the chosen distance from the centre. With no mass it flies straight;
 * with mass its path bends around (or into) the well. When it arrives, the
 * classic lensing diagram appears: the star's true position, the observer,
 * and — along the dotted sight-line — where the observer sees the star.
 *
 * Every object is created once (a pool of three paths) and reused, so firing
 * never triggers a shader compile or a React re-render.
 */
export function PhotonBeams() {
  const size = useThree((s) => s.size);
  const shots = useLab((s) => s.photonShots);
  const clears = useLab((s) => s.pathClears);
  const resets = useLab((s) => s.resets);
  const [pool] = useState(createPool);

  useEffect(() => {
    pool.slots.forEach((slot) => {
      for (const fat of [slot.path, slot.guide, slot.sight]) fat.material.resolution.set(size.width, size.height);
    });
  }, [size, pool]);

  useEffect(() => () => pool.dispose(), [pool]);

  // Fire.
  useEffect(() => {
    if (shots === 0) return;
    if (useLab.getState().miraj) return; // In Miraj mode the light travels through the tunnel instead.
    // While the grid is still coming back from the Miraj, the shot waits for it.
    if (sim.expand >= 0.02) pool.queued = true;
    else fire(pool);
  }, [shots, pool]);

  // Clear paths (also part of Reset all).
  useEffect(() => {
    if (clears === 0) return;
    pool.queued = false;
    pool.slots.forEach((s) => {
      if (s.state !== "idle") s.state = "fading";
    });
  }, [clears, pool]);

  useEffect(() => {
    if (resets === 0) return;
    pool.slots.forEach(hide);
    sim.photonFlying = false;
  }, [resets, pool]);

  useFrame(({ camera }, raw) => {
    const { mass, miraj } = useLab.getState();
    // The Miraj takes over the view: light on the grid is dropped, without a result.
    const away = miraj || sim.expand >= 0.02;
    pool.group.visible = sim.expand < 0.02;
    if (miraj) pool.queued = false;
    else if (pool.queued && !away) {
      pool.queued = false;
      fire(pool);
    }
    const halos = halosEnabled();
    let flying = false;
    let latest: Slot | null = null;

    for (const slot of pool.slots) {
      slot.headHalo.visible = slot.starHalo.visible = halos;
      if (slot.state === "idle") continue;
      if (away) {
        hide(slot);
        continue;
      }
      if (slot.latest) latest = slot;

      // A path traced for a different mass no longer matches the fabric.
      if ((slot.state === "shown" || slot.state === "flying") && Math.abs(mass - slot.massSlider) > STALE_MASS) {
        slot.state = "fading";
      }

      if (slot.state === "flying") {
        flying = true;
        fly(slot, sim.dt);
      } else if (slot.state === "shown") {
        const target = slot.latest ? LATEST : OLDER;
        if (slot.level !== target) paint(slot, Infinity, (slot.level = target));
        showDiagram(slot, slot.latest);
        slot.ghost.quaternion.copy(camera.quaternion);
      } else if (slot.state === "fading") {
        slot.fade = Math.max(0, slot.fade - Math.min(raw, 0.1) * 3);
        // Only the part the light has flown, without its bright head.
        paint(slot, slot.reach, slot.level * slot.fade, false);
        showDiagram(slot, false);
        slot.guide.line.visible = false;
        slot.head.visible = false;
        if (slot.fade <= 0) hide(slot);
      }
    }
    sim.photonFlying = flying || pool.queued;
    updateLabels(latest, camera);
  });

  return <primitive object={pool.group} />;
}

/* ------------------------------------------------------------------------ */

type Pool = ReturnType<typeof createPool>;

function fire(pool: Pool) {
  const { mass, aim } = useLab.getState();
  const data = tracePhoton(mass / 100, aim);
  const slot = pool.slots[pool.next];
  pool.next = (pool.next + 1) % POOL;
  pool.slots.forEach((s) => (s.latest = false));
  launch(slot, data, mass);
}

function launch(slot: Slot, data: PhotonPath, massSlider: number) {
  slot.data = data;
  slot.massSlider = massSlider;
  slot.state = "flying";
  slot.age = 0;
  slot.cursor = 0;
  slot.reach = 0;
  slot.fade = 1;
  slot.level = LATEST;
  slot.latest = true;
  slot.apparent = null;

  writeLinePoints(slot.path, data.points, data.count);
  paint(slot, 0, LATEST);
  slot.path.line.visible = true;

  // The straight line the light would follow through flat space.
  const b = data.impact;
  writeLinePoints(slot.guide, [-GRID_HALF, PHOTON_LIFT, b, GRID_HALF, PHOTON_LIFT, b], 2);
  slot.guide.material.color.setRGB(0.35, 0.6, 0.75);
  slot.guide.line.visible = massSlider > 0;

  slot.star.position.set(data.points[0], data.points[1], data.points[2]);
  slot.star.visible = true;
  slot.head.position.copy(slot.star.position);
  slot.head.visible = true;
  slot.flash.visible = false;
  showDiagram(slot, false);
}

function fly(slot: Slot, dt: number) {
  const data = slot.data!;
  slot.age += dt;
  const s = Math.min(data.length, slot.age * SPEED);
  slot.reach = s;
  paint(slot, s, LATEST);

  // Move the glowing head along the path.
  const arc = data.arc;
  while (slot.cursor < data.count - 2 && arc[slot.cursor + 1] < s) slot.cursor++;
  const i = slot.cursor;
  const a0 = arc[i];
  const a1 = arc[Math.min(i + 1, data.count - 1)];
  const f = a1 > a0 ? Math.min(1, (s - a0) / (a1 - a0)) : 0;
  const p = data.points;
  const j = Math.min(i + 1, data.count - 1);
  slot.head.position.set(
    p[i * 3] + (p[j * 3] - p[i * 3]) * f,
    p[i * 3 + 1] + (p[j * 3 + 1] - p[i * 3 + 1]) * f,
    p[i * 3 + 2] + (p[j * 3 + 2] - p[i * 3 + 2]) * f,
  );

  if (s >= data.length) arrive(slot);
}

function arrive(slot: Slot) {
  const data = slot.data!;
  slot.state = "shown";
  slot.reach = Infinity;
  slot.head.visible = false;
  paint(slot, Infinity, LATEST);

  const n = data.count - 1;
  const end = new THREE.Vector3(data.points[n * 3], data.points[n * 3 + 1], data.points[n * 3 + 2]);
  if (data.captured) {
    slot.flash.position.copy(end);
    slot.flash.visible = true;
    slot.flash.scale.setScalar(1.2);
  } else {
    slot.observer.position.copy(end);
    // Where the observer sees the star: straight back along the arriving light, at the true star's
    // distance (as in a lensing diagram), but never past an inset edge of the grid, where it would
    // sit under the controls or out of view.
    const [dx, dz] = data.exitDir;
    const starDistance = Math.hypot(end.x - data.points[0], end.z - data.points[2]);
    const t = Math.min(sightDistance(end.x, end.z, dx, dz, GRID_HALF - 2), starDistance);
    if (data.deflection > 0.5 && t > 1) {
      slot.apparent = new THREE.Vector3(end.x - dx * t, PHOTON_LIFT, end.z - dz * t);
      writeLinePoints(slot.sight, [end.x, PHOTON_LIFT, end.z, slot.apparent.x, slot.apparent.y, slot.apparent.z], 2);
      slot.ghost.position.copy(slot.apparent);
    }
  }

  // An older, slower shot landing after a newer one must not replace its result.
  if (!slot.latest) return;
  sim.lastShot = { deflection: data.deflection, captured: data.captured, impact: data.impact, mass: slot.massSlider };
  const lab = useLab.getState();
  if (data.captured) lab.announce("The light fell into the central mass.");
  else if (data.deflection < 0.05) lab.announce("The light went straight: with no mass, spacetime is flat.");
  else
    lab.announce(
      `The light bent by ${formatDegrees(data.deflection)}. (Real starlight grazing the Sun bends by only ${formatDegrees(SUN_DEFLECTION_DEG, 4)}.)`,
    );
}

/**
 * How far back from the observer (x, z) the line of sight runs against the
 * arriving direction (dx, dz) before it leaves the square |x|, |z| <= half
 * (0 if it never crosses it).
 */
function sightDistance(x: number, z: number, dx: number, dz: number, half: number): number {
  let near = 0;
  let far = Infinity;
  for (const [p, d] of [
    [x, -dx],
    [z, -dz],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (Math.abs(p) > half) return 0;
      continue;
    }
    const t1 = (-half - p) / d;
    const t2 = (half - p) / d;
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return far > near ? far : 0;
}

/** Colour the path up to arc length `s`: `level`, plus a bright streak just behind `s` when `streak` is set. */
function paint(slot: Slot, s: number, level: number, streak = true) {
  const data = slot.data;
  if (!data) return;
  const { array, commit } = lineColorArray(slot.path);
  // Drawn straight to the screen (no bloom), the path's overlapping segments add up and would
  // clip to white, so the latest path would look no brighter than older ones.
  const gain = TIERS[useLab.getState().tier].bloom ? 1 : 0.45;
  const intensity = (k: number) => {
    const d = s - data.arc[k];
    if (d < 0) return 0;
    return gain * (level + (streak && d < STREAK ? Math.pow(1 - d / STREAK, 1.6) * 3 : 0));
  };
  let prev = intensity(0);
  for (let k = 0; k < data.count - 1; k++) {
    const next = intensity(k + 1);
    const o = k * 6;
    array[o] = BEAM.r * prev;
    array[o + 1] = BEAM.g * prev;
    array[o + 2] = BEAM.b * prev;
    array[o + 3] = BEAM.r * next;
    array[o + 4] = BEAM.g * next;
    array[o + 5] = BEAM.b * next;
    prev = next;
  }
  commit();
}

function showDiagram(slot: Slot, on: boolean) {
  const data = slot.data;
  const arrived = slot.state === "shown";
  slot.star.visible = on || slot.state === "flying";
  slot.observer.visible = on && arrived && !!data && !data.captured;
  slot.ghost.visible = on && arrived && !!slot.apparent;
  slot.sight.line.visible = on && arrived && !!slot.apparent;
  slot.guide.line.visible = (on || slot.state === "flying") && slot.massSlider > 0;
  if (slot.flash.visible && !(on && arrived)) slot.flash.visible = false;
}

function hide(slot: Slot) {
  slot.state = "idle";
  slot.latest = false;
  slot.data = null;
  for (const o of [slot.path.line, slot.guide.line, slot.sight.line, slot.head, slot.flash, slot.star, slot.ghost, slot.observer]) {
    o.visible = false;
  }
}

const screenUp = new THREE.Vector3();
const guidePoint = new THREE.Vector3();

function updateLabels(latest: Slot | null, camera: THREE.Camera) {
  const data = latest?.data;
  const arrived = latest?.state === "shown";
  // Lift labels towards the top of the screen, so a camera looking straight down does not put them on their object.
  screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  const set = (id: string, visible: boolean, p?: THREE.Vector3, lift = 1) => {
    const a = getAnchor(id);
    a.visible = visible && sim.expand < 0.02;
    if (visible && p) a.world.copy(p).addScaledVector(screenUp, lift);
  };
  set("lens-star", !!latest && (arrived || latest.state === "flying"), latest?.star.position);
  set("lens-observer", !!data && arrived && !data.captured, latest?.observer.position);
  set("lens-apparent", !!latest && arrived && !!latest.apparent, latest?.apparent ?? undefined);
  set("lens-hit", !!data && arrived && data.captured, latest?.flash.position, 1.6);
  if (latest && data && (arrived || latest.state === "flying") && latest.massSlider > 0) {
    set("lens-guide", true, guidePoint.set(GRID_HALF - 3, PHOTON_LIFT, data.impact), 0.6);
  } else set("lens-guide", false);
}

/* ------------------------------------------------------------------------ */

function createPool() {
  const group = new THREE.Group();
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const octa = new THREE.OctahedronGeometry(1, 0);
  const ring = new THREE.RingGeometry(0.78, 1, 48);
  const headCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 3.6), toneMapped: false });
  const headGlow = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.6, 1.2, 0.6),
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const starMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.8, 2.0), toneMapped: false });
  // The apparent star is an outline below the bloom threshold, so the true star stays the brightest dot.
  const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.57, 0.48, 0.3), toneMapped: false });
  const observerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 2.4, 2.4), wireframe: true, toneMapped: false });
  const flashMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3, 1.8, 0.8),
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, scale: number) => {
    const m = new THREE.Mesh(geometry, material);
    m.scale.setScalar(scale);
    m.visible = false;
    return m;
  };

  const slots: Slot[] = [];
  for (let i = 0; i < POOL; i++) {
    const path = createFatLine({ maxPoints: PHOTON_MAX_POINTS, width: 3.2, vertexColors: true });
    const guide = createFatLine({ maxPoints: 2, width: 1.6, dashed: true, dashSize: 0.6, gapSize: 0.4 });
    const sight = createFatLine({ maxPoints: 2, width: 1.6, dashed: true, dashSize: 0.25, gapSize: 0.3 });
    sight.material.color.setRGB(0.9, 0.8, 0.55);

    const head = new THREE.Group();
    head.add(mesh(sphere, headCore, 0.16), mesh(sphere, headGlow, 0.45));
    head.children.forEach((c) => (c.visible = true));
    head.visible = false;
    const headHalo = createHaloSprite(BEAM, 1.2, 0.85);
    head.add(headHalo);
    const star = mesh(sphere, starMat, 0.3);
    const starHalo = createHaloSprite(STAR_HALO, 0.9 / 0.3, 0.8);
    star.add(starHalo);

    const slot: Slot = {
      group: new THREE.Group(),
      path,
      guide,
      sight,
      head,
      flash: mesh(sphere, flashMat, 1),
      star,
      ghost: mesh(ring, ghostMat, 0.45),
      observer: mesh(octa, observerMat, 0.32),
      headHalo,
      starHalo,
      state: "idle",
      data: null,
      massSlider: 0,
      age: 0,
      cursor: 0,
      reach: 0,
      level: LATEST,
      fade: 1,
      latest: false,
      apparent: null,
    };
    slot.group.add(path.line, guide.line, sight.line, head, slot.flash, slot.star, slot.ghost, slot.observer);
    group.add(slot.group);
    slots.push(slot);
  }

  return {
    group,
    slots,
    next: 0,
    /** A shot fired while the grid was still returning from the Miraj. */
    queued: false,
    dispose: () => {
      slots.forEach((s) => {
        [s.path, s.guide, s.sight].forEach(disposeFatLine);
        [s.headHalo, s.starHalo].forEach((h) => h.material.dispose());
      });
      [sphere, octa, ring].forEach((g) => g.dispose());
      [headCore, headGlow, starMat, ghostMat, observerMat, flashMat].forEach((m) => m.dispose());
    },
  };
}
