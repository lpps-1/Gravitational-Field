"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  FUNNEL_RADIUS,
  SKY_COUNT,
  SKY_RADIUS,
  THROAT_RADIUS,
  TUNNEL_BOTTOM,
  TUNNEL_TOP,
  TUBE_FRACTION,
  foldPoint,
  skyHeight,
} from "@/lib/physics";
import { getAnchor } from "@/lib/anchors";
import { mirajPhases, sim, useLab } from "@/lib/store";

const RING_STEP = 0.45;
const RING_SEGMENTS = 128;
const SPOKES = 36;
const SPOKE_STEP = 0.12;

/** Bottom sky is cool blue, rising through violet to a golden seventh sky. */
export const SKY_HEX = ["#6fb7ff", "#7fa8ff", "#9c98ff", "#c08cf5", "#e693d0", "#f5b08f", "#ffd47a"];
const SKY_COLORS = SKY_HEX.map((c) => new THREE.Color(c));
/** Labels sit on the left flank as seen from the default camera, clear of the tunnel. */
const LABEL_ANGLE = Math.PI * 0.78;

/** Time for the light to cross the whole tunnel. */
const TRANSIT_SECONDS = 0.42;
const TRANSIT_OVERSHOOT = 4;

/**
 * MODULE D — the Seven Skies and the Miraj fold.
 *
 * Seven polar wireframe discs. Engaging the Miraj first lifts them apart into
 * a stack, then pinches the centre of every disc into a funnel. The funnels
 * of the lower skies reach up and those of the upper skies reach down, so
 * together they merge into one vertical cylinder — an Einstein–Rosen bridge.
 * Once the bridge is open, a light particle shoots straight up through it.
 */
export function SevenSkies() {
  const lines = useRef<THREE.LineSegments>(null);
  const tunnel = useRef<THREE.Mesh>(null);
  const last = useRef({ expand: -1, fold: -1 });

  const { geometry, baseR, theta, layer, fade } = useMemo(() => buildSkies(), []);

  useFrame(() => {
    const ls = lines.current;
    if (!ls) return;
    const { expand, fold } = mirajPhases();
    const visible = expand > 0.001;
    ls.visible = visible;
    if (tunnel.current) {
      tunnel.current.visible = fold > 0.01;
      (tunnel.current.material as THREE.MeshBasicMaterial).opacity = Math.pow(fold, 3) * 0.05;
    }
    for (let i = 0; i < SKY_COUNT; i++) {
      const label = getAnchor(`sky${i}`);
      label.world.set(Math.cos(LABEL_ANGLE) * (SKY_RADIUS + 1.2), skyHeight(i, expand), Math.sin(LABEL_ANGLE) * (SKY_RADIUS + 1.2));
      label.opacity = Math.max(0, (expand - 0.5) * 2);
      label.visible = visible;
    }
    if (!visible) return;
    if (last.current.expand === expand && last.current.fold === fold) return;
    last.current = { expand, fold };

    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;
    const out: [number, number] = [0, 0];
    const fadeIn = expand * expand * (3 - 2 * expand);
    for (let k = 0; k < baseR.length; k++) {
      const i = layer[k];
      foldPoint(baseR[k], skyHeight(i, expand), i, fold, out);
      pos[k * 3] = Math.cos(theta[k]) * out[0];
      pos[k * 3 + 1] = out[1];
      pos[k * 3 + 2] = Math.sin(theta[k]) * out[0];
      // Seven tubes overlap in the throat, so the fabric there is dimmed to keep
      // the tunnel readable; the funnel lips glow brighter as they are stretched.
      const sN = baseR[k] / FUNNEL_RADIUS;
      const tube = sN < TUBE_FRACTION ? 1 - 0.8 * fold : 1;
      const lip = sN >= TUBE_FRACTION && sN < 1 ? fold * 0.45 * (1 - (sN - TUBE_FRACTION) / (1 - TUBE_FRACTION)) : 0;
      const glow = fade[k] * fadeIn * (0.42 * tube + lip);
      const c = SKY_COLORS[i];
      col[k * 3] = c.r * glow;
      col[k * 3 + 1] = c.g * glow;
      col[k * 3 + 2] = c.b * glow;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments ref={lines} geometry={geometry} frustumCulled={false} visible={false}>
        <lineBasicMaterial vertexColors blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <mesh ref={tunnel} position={[0, (TUNNEL_BOTTOM + TUNNEL_TOP) / 2, 0]} visible={false}>
        <cylinderGeometry args={[THROAT_RADIUS * 0.96, THROAT_RADIUS * 0.96, TUNNEL_TOP - TUNNEL_BOTTOM, 48, 1, true]} />
        <meshBasicMaterial
          color={[0.9, 0.75, 1.6]}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Traveler />
    </group>
  );
}

/** The light particle that shoots up through the wormhole. */
function Traveler() {
  const shots = useLab((s) => s.photonShots);
  const head = useRef<THREE.Group>(null);
  const streak = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const state = useRef({ pending: false, active: false, t: 0, ringT: -1, wasOpen: false });

  // A photon fired while the Miraj is engaged travels through the tunnel.
  useEffect(() => {
    if (shots > 0 && useLab.getState().miraj) state.current.pending = true;
  }, [shots]);

  useFrame((_, delta) => {
    const st = state.current;
    const dt = Math.min(delta, 0.05);
    const { fold } = mirajPhases();
    const open = fold >= 1;

    // Launch automatically the moment the bridge opens, or on request.
    if (open && (!st.wasOpen || st.pending) && !st.active) {
      st.active = true;
      st.pending = false;
      st.t = 0;
    }
    st.wasOpen = open;
    if (!open && fold < 0.9) {
      st.active = false;
      st.pending = st.pending && useLab.getState().miraj;
    }

    const start = TUNNEL_BOTTOM - TRANSIT_OVERSHOOT;
    const end = TUNNEL_TOP + TRANSIT_OVERSHOOT;
    if (st.active) {
      st.t += dt;
      const k = Math.min(1, st.t / TRANSIT_SECONDS);
      const y = start + (end - start) * k;
      if (head.current) {
        head.current.visible = true;
        head.current.position.y = y;
      }
      if (streak.current) {
        const tail = Math.max(start, y - 9);
        streak.current.visible = y - tail > 0.01;
        streak.current.position.y = (y + tail) / 2;
        streak.current.scale.y = Math.max(0.001, y - tail);
      }
      if (k >= 1) {
        st.active = false;
        st.ringT = 0;
        sim.transits += 1;
        sim.transitTime = TRANSIT_SECONDS;
      }
    } else {
      if (head.current) head.current.visible = false;
      if (streak.current) streak.current.visible = false;
    }

    // Exit flare: a ring of light blooming out of the top of the tunnel.
    if (ring.current) {
      const show = st.ringT >= 0 && st.ringT < 1.2;
      ring.current.visible = show;
      if (show) {
        st.ringT += dt;
        const k = st.ringT / 1.2;
        ring.current.scale.setScalar(THROAT_RADIUS + k * 9);
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
      </group>
      <mesh ref={streak} visible={false}>
        <cylinderGeometry args={[0.07, 0.07, 1, 10, 1, true]} />
        <meshBasicMaterial color={[4, 3.6, 5]} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
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

/** Build rings and spokes for all seven skies in one LineSegments geometry. */
function buildSkies() {
  const r: number[] = [];
  const th: number[] = [];
  const ly: number[] = [];
  const index: number[] = [];

  for (let i = 0; i < SKY_COUNT; i++) {
    // Concentric rings.
    for (let radius = 0.3; radius <= SKY_RADIUS + 1e-6; radius += RING_STEP) {
      const first = r.length;
      for (let s = 0; s < RING_SEGMENTS; s++) {
        r.push(radius);
        th.push((s / RING_SEGMENTS) * Math.PI * 2);
        ly.push(i);
        index.push(first + s, first + ((s + 1) % RING_SEGMENTS));
      }
    }
    // Radial spokes, sampled finely so they bend smoothly into the tunnel.
    for (let s = 0; s < SPOKES; s++) {
      const angle = (s / SPOKES) * Math.PI * 2 + (i % 2) * (Math.PI / SPOKES);
      const first = r.length;
      const samples = Math.round(SKY_RADIUS / SPOKE_STEP);
      for (let k = 0; k <= samples; k++) {
        r.push(0.3 + (k / samples) * (SKY_RADIUS - 0.3));
        th.push(angle);
        ly.push(i);
        if (k > 0) index.push(first + k - 1, first + k);
      }
    }
  }

  const n = r.length;
  const baseR = Float32Array.from(r);
  const theta = Float32Array.from(th);
  const layer = Uint8Array.from(ly);
  const fade = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const e = baseR[k] / SKY_RADIUS;
    fade[k] = Math.pow(1 - Math.min(1, Math.max(0, (e - 0.6) / 0.4)), 1.4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geometry.setIndex(index);
  return { geometry, baseR, theta, layer, fade };
}
