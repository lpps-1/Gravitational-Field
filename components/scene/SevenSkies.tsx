"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getAnchor } from "@/lib/anchors";
import { prefersReducedMotion } from "@/lib/hooks";
import { SKY_COUNT, SKY_RADIUS, THROAT_RADIUS, TRANSIT_SECONDS, TUNNEL_BOTTOM, TUNNEL_TOP, skyHeight } from "@/lib/physics";
import { createSkiesMaterial } from "@/lib/shaders";
import { sim, useLab } from "@/lib/store";
import { Halo } from "./Halo";

/**
 * Line density of the skies. All seven together are the heaviest thing in the
 * scene (61k line vertices at full detail), so software rendering gets a
 * quarter of the lines.
 */
const DETAIL = {
  full: { ringStep: 0.45, ringSegments: 128, spokes: 36, spokeStep: 0.12 },
  lite: { ringStep: 0.9, ringSegments: 72, spokes: 24, spokeStep: 0.3 },
};

/** Bottom sky is cool blue, rising through violet to a golden seventh sky. */
export const SKY_HEX = ["#6fb7ff", "#7fa8ff", "#9c98ff", "#c08cf5", "#e693d0", "#f5b08f", "#ffd47a"];
/** Labels sit on the right flank as seen from the default camera, clear of the tunnel. */
const LABEL_ANGLE = -0.62;
const LABEL_RADIUS = SKY_RADIUS + 1.6;

/** The tunnel light starts below the first sky and leaves above the seventh. */
const TRANSIT_OVERSHOOT = 4;
const TRANSIT_START = TUNNEL_BOTTOM - TRANSIT_OVERSHOOT;
const TRANSIT_END = TUNNEL_TOP + TRANSIT_OVERSHOOT;
/** How long the glowing trace stays in the tunnel after the light has passed. */
const TRACE_SECONDS = 3;
/** Pause between the tunnel opening and the first light. */
const LAUNCH_DELAY = 0.5;

/**
 * MODULE D — the Seven Skies and the Miraj fold.
 *
 * Seven polar wireframe discs, drawn from static geometry that the vertex
 * shader lifts apart (uExpand) and folds (uFold): the centre of each sky is
 * pinched into a funnel, and together the funnels merge into one vertical
 * tunnel, a wormhole-style bridge. Once it is open, a light particle rises
 * through all seven skies in a fraction of a second.
 */
export function SevenSkies() {
  const lines = useRef<THREE.LineSegments>(null);
  const tunnel = useRef<THREE.Mesh>(null);
  // Built once for the tier the canvas started with.
  const geometry = useMemo(() => buildSkies(DETAIL[useLab.getState().tier === "cpu" ? "lite" : "full"]), []);
  const material = useMemo(createSkiesMaterial, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    if (sim.stage !== "lab") return; // hidden while another stage is shown
    const { expand, fold } = sim;
    const visible = expand > 0.001;
    if (lines.current) lines.current.visible = visible;
    material.uniforms.uExpand.value = expand;
    material.uniforms.uFold.value = fold;

    if (tunnel.current) {
      const opacity = Math.pow(fold, 3) * 0.05;
      tunnel.current.visible = opacity > 0.002;
      (tunnel.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }

    for (let i = 0; i < SKY_COUNT; i++) {
      const label = getAnchor(`sky${i}`);
      label.world.set(Math.cos(LABEL_ANGLE) * LABEL_RADIUS, skyHeight(i, expand), Math.sin(LABEL_ANGLE) * LABEL_RADIUS);
      label.opacity = Math.max(0, (expand - 0.4) / 0.6);
      label.visible = visible;
      label.highlight = sim.transitActive && sim.skyPassed >= i;
    }
    const tunnelLabel = getAnchor("tunnel");
    // Beside the throat low down, clear of the step caption at the top of the view and of the Sky labels.
    tunnelLabel.world.set(THROAT_RADIUS + 0.6, skyHeight(0.5, expand), 0);
    tunnelLabel.visible = fold > 0.95;
    tunnelLabel.opacity = Math.min(1, (fold - 0.95) * 20);
  });

  return (
    <group>
      <lineSegments ref={lines} geometry={geometry} material={material} frustumCulled={false} visible={false} />
      <mesh ref={tunnel} position={[0, (TUNNEL_BOTTOM + TUNNEL_TOP) / 2, 0]} visible={false}>
        <cylinderGeometry args={[THROAT_RADIUS * 0.96, THROAT_RADIUS * 0.96, TUNNEL_TOP - TUNNEL_BOTTOM, 48, 1, true]} />
        <meshBasicMaterial
          color={[0.9, 0.75, 1.6]}
          transparent
          opacity={0}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Traveler />
    </group>
  );
}

/** The light particle that rises through the tunnel, leaving a fading trace. */
function Traveler() {
  const shots = useLab((s) => s.photonShots);
  const resets = useLab((s) => s.resets);
  const head = useRef<THREE.Group>(null);
  const streak = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const state = useRef({ pending: false, active: false, t: 0, trace: -1, ringT: -1, openFor: 0, launchedThisOpening: false });

  // A photon fired while the Miraj is engaged travels through the tunnel.
  useEffect(() => {
    if (shots > 0 && useLab.getState().miraj) state.current.pending = true;
  }, [shots]);

  useEffect(() => {
    if (resets === 0) return;
    Object.assign(state.current, { pending: false, active: false, t: 0, trace: -1, ringT: -1, openFor: 0, launchedThisOpening: false });
    sim.transitActive = false;
    sim.skyPassed = -1;
  }, [resets]);

  useFrame(() => {
    if (sim.stage !== "lab") return; // hidden while another stage is shown
    const st = state.current;
    const dt = sim.dt;
    const open = sim.fold >= 1;
    st.openFor = open ? st.openFor + dt : 0;
    if (!open) st.launchedThisOpening = false;
    if (sim.fold < 0.9) {
      // The tunnel is closing: end any transit, trace and flare, and clear the sky highlights.
      st.active = false;
      st.trace = -1;
      st.ringT = -1;
      st.pending = st.pending && useLab.getState().miraj;
      sim.transitActive = false;
      sim.skyPassed = -1;
    }

    // Launch automatically shortly after the tunnel opens, or on request.
    const autoLaunch = open && !st.launchedThisOpening && st.openFor >= LAUNCH_DELAY;
    if (open && !st.active && (autoLaunch || st.pending)) {
      st.active = true;
      st.pending = false;
      st.launchedThisOpening = true;
      st.t = 0;
      st.trace = -1;
      sim.skyPassed = -1;
    }

    const streakMat = streak.current?.material as THREE.MeshBasicMaterial | undefined;
    if (st.active) {
      st.t += dt;
      const k = Math.min(1, st.t / TRANSIT_SECONDS);
      const y = TRANSIT_START + (TRANSIT_END - TRANSIT_START) * k;
      sim.transitActive = true;
      let passed = -1;
      for (let i = 0; i < SKY_COUNT; i++) if (y >= skyHeight(i, 1)) passed = i;
      sim.skyPassed = passed;
      if (head.current) {
        head.current.visible = true;
        head.current.position.y = y;
      }
      if (streak.current && streakMat) {
        streak.current.visible = y > TRANSIT_START + 0.01;
        streak.current.position.y = (y + TRANSIT_START) / 2;
        streak.current.scale.y = Math.max(0.001, y - TRANSIT_START);
        streakMat.opacity = 1;
      }
      if (k >= 1) {
        st.active = false;
        st.trace = 0;
        st.ringT = 0;
        sim.transits += 1;
      }
    } else if (head.current) {
      head.current.visible = false;
    }

    // After the transit the trace lingers in the tunnel, then fades.
    if (!st.active && streak.current && streakMat) {
      if (st.trace >= 0 && st.trace < TRACE_SECONDS) {
        st.trace += dt;
        streak.current.visible = true;
        streakMat.opacity = Math.max(0, 1 - st.trace / TRACE_SECONDS);
      } else {
        streak.current.visible = false;
        if (st.trace >= TRACE_SECONDS) {
          st.trace = -1;
          sim.transitActive = false;
          sim.skyPassed = -1;
        }
      }
    }

    // Exit flare: a ring of light opening out of the top of the tunnel.
    if (ring.current) {
      const show = st.ringT >= 0 && st.ringT < 1.2;
      ring.current.visible = show;
      if (show) {
        st.ringT += dt;
        const k = st.ringT / 1.2;
        ring.current.scale.setScalar(prefersReducedMotion() ? THROAT_RADIUS + 2 : THROAT_RADIUS + k * 9);
        (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
      } else st.ringT = -1;
    }
  });

  return (
    <group>
      <group ref={head} visible={false}>
        <mesh>
          <sphereGeometry args={[0.22, 20, 14]} />
          <meshBasicMaterial color={[8, 7.5, 6]} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.7, 20, 14]} />
          <meshBasicMaterial
            color={[1.8, 1.5, 2.4]}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <Halo color={[0.85, 0.78, 1.0]} size={1.5} opacity={0.85} />
      </group>
      <mesh ref={streak} visible={false}>
        <cylinderGeometry args={[0.07, 0.07, 1, 10, 1, true]} />
        <meshBasicMaterial
          color={[4, 3.6, 5]}
          transparent
          opacity={1}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, TUNNEL_TOP + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.92, 1, 96]} />
        <meshBasicMaterial
          color={[3, 2.6, 1.6]}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Rings and spokes for all seven skies in one static LineSegments geometry.
 * `position` holds (rest radius, angle, sky index); the shader does the rest.
 */
function buildSkies({ ringStep, ringSegments, spokes, spokeStep }: (typeof DETAIL)["full"]) {
  const pos: number[] = [];
  const tint: number[] = [];
  const index: number[] = [];
  const colors = SKY_HEX.map((c) => new THREE.Color(c));
  let n = 0;

  const add = (r: number, angle: number, sky: number) => {
    const e = r / SKY_RADIUS;
    const fade = Math.pow(1 - Math.min(1, Math.max(0, (e - 0.6) / 0.4)), 1.4);
    const c = colors[sky];
    pos.push(r, angle, sky);
    tint.push(c.r * fade, c.g * fade, c.b * fade);
    return n++;
  };

  for (let sky = 0; sky < SKY_COUNT; sky++) {
    // Concentric rings.
    for (let radius = 0.3; radius <= SKY_RADIUS + 1e-6; radius += ringStep) {
      const first = n;
      for (let s = 0; s < ringSegments; s++) {
        add(radius, (s / ringSegments) * Math.PI * 2, sky);
        index.push(first + s, first + ((s + 1) % ringSegments));
      }
    }
    // Radial spokes, sampled finely so they bend smoothly into the tunnel.
    const samples = Math.round(SKY_RADIUS / spokeStep);
    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2 + (sky % 2) * (Math.PI / spokes);
      const first = n;
      for (let k = 0; k <= samples; k++) {
        add(0.3 + (k / samples) * (SKY_RADIUS - 0.3), angle, sky);
        if (k > 0) index.push(first + k - 1, first + k);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("aTint", new THREE.Float32BufferAttribute(tint, 3));
  geometry.setIndex(index);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, 0), SKY_RADIUS * 2);
  return geometry;
}
