"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STAGE_DISTANCE, VIEWS, cameraApi, cameraFollow } from "@/lib/camera";
import { stageOf, type Stage } from "@/lib/chapters";
import { prefersReducedMotion, useReducedMotion } from "@/lib/hooks";
import { TIERS, lowerTier, probeGraphics, type Tier, type TierSpec } from "@/lib/quality";
import { useLab } from "@/lib/store";
import { AnchorProjector } from "./AnchorProjector";
import { BlackHole } from "./BlackHole";
import { CentralMass } from "./CentralMass";
import { OrbitingBodies } from "./OrbitingBodies";
import { PhotonBeams } from "./PhotonBeams";
import { SevenSkies } from "./SevenSkies";
import { SimDriver } from "./SimDriver";
import { SolarSystem } from "./SolarSystem";
import { SpacetimeGrid } from "./SpacetimeGrid";
import { TimeClocks } from "./TimeClocks";

/** Background of each stage: the lab's navy, and near-black space for the real sky. */
const BACKGROUND: Record<Stage, string> = { lab: "#0c2246", solar: "#020509", blackhole: "#000000" };

/** Background stars per starting tier (fixed for the session, so a tier change never rebuilds them). */
const STARS: Record<Tier, number> = { high: 2500, low: 1500, cpu: 900 };

/**
 * The 3D view. Rendering cost is kept low enough for laptops without a
 * graphics card (see lib/quality.ts):
 * - the graphics tier is chosen before the canvas is created, so nothing is
 *   built twice;
 * - only the full tier runs the bloom pass; the light tiers draw straight to
 *   the screen and use sprite halos for the glow;
 * - the resolution adapts to the measured frame rate, and software rendering
 *   is held at a steady 30 frames per second;
 * - every shader is compiled while the loading screen is up, so nothing
 *   freezes the first time a photon is fired or the Miraj is engaged.
 */
function Scene() {
  const [probe] = useState(probeGraphics);
  if (!probe.webgl) return <NoWebGL />;
  return <LabCanvas />;
}

export default memo(Scene);

function LabCanvas() {
  const tier = useLab((s) => s.tier);
  const resolution = useLab((s) => s.resolution);
  const ready = useLab((s) => s.ready);
  // Context attributes and the star count are fixed when the canvas is created.
  const [startTier] = useState(() => useLab.getState().tier);
  const gl = useMemo(
    () => ({ antialias: startTier !== "cpu", alpha: false, stencil: false, powerPreference: "high-performance" as const }),
    [startTier],
  );
  const spec = TIERS[tier];
  const stage = useLab((s) => stageOf(s.focus));

  return (
    <Canvas
      flat
      dpr={pixelRatioRange(spec, resolution)}
      frameloop={spec.fps ? "never" : "always"}
      camera={{ position: VIEWS.overview.position, fov: 45, near: 0.1, far: 400 }}
      gl={gl}
      onCreated={({ gl }) => onCreated(gl)}
      aria-hidden
      className="!absolute inset-0"
    >
      <color attach="background" args={[BACKGROUND.lab]} />
      <fog attach="fog" args={[BACKGROUND.lab, 60, 140]} />
      <StageLook stage={stage} />
      <SimDriver />
      <StarField count={STARS[startTier]} visible={stage !== "blackhole"} />
      {/* The lab's objects stay mounted (their shaders are compiled once) and simply hide. */}
      <group visible={stage === "lab"}>
        <SpacetimeGrid />
        <CentralMass />
        <OrbitingBodies />
        <PhotonBeams />
        <TimeClocks />
        <SevenSkies />
      </group>
      <SolarSystem />
      <BlackHole />
      <CameraRig stage={stage} damping={spec.fps ? 1 - Math.pow(1 - 0.08, 60 / spec.fps) : 0.08} />
      <AnchorProjector />
      <Effects />
      <ShaderWarmup />
      {spec.fps > 0 && <FrameCap fps={spec.fps} />}
      {ready && <AdaptiveQuality />}
    </Canvas>
  );
}

/** Upper end of the render resolution for a tier at a position (0..1) in its range. */
function resolutionCap(spec: TierSpec, resolution: number) {
  const [lo, hi] = spec.dpr;
  return Math.round((lo + (hi - lo) * resolution) * 100) / 100;
}

/**
 * Device pixels per CSS pixel as a range: R3F clamps the screen's own ratio
 * into it whenever the canvas reconfigures, so browser zoom or a move to
 * another display is followed.
 */
function pixelRatioRange(spec: TierSpec, resolution: number): [number, number] {
  return [spec.dpr[0], resolutionCap(spec, resolution)];
}

/** The ratio actually used at a resolution position on this screen. */
function effectiveRatio(spec: TierSpec, resolution: number) {
  return Math.min(Math.max(spec.dpr[0], window.devicePixelRatio || 1), resolutionCap(spec, resolution));
}

function onCreated(gl: THREE.WebGLRenderer) {
  // Synchronous shader error checks cost hundreds of ms per compile on Windows.
  if (process.env.NODE_ENV === "production") gl.debug.checkShaderErrors = false;

  const canvas = gl.domElement;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    useLab.getState().setGpuLost(true);
  });
  canvas.addEventListener("webglcontextrestored", () => window.location.reload());
}

/** Shown instead of the 3D view when the browser offers no WebGL 2 at all. */
function NoWebGL() {
  useEffect(() => useLab.getState().setReady(), []);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-page p-6">
      <div className="max-w-lg rounded-[22px] border border-white/16 bg-panel p-6 text-body">
        <h2 className="text-lg font-bold">3D graphics are switched off in this browser</h2>
        <p className="mt-2 text-sm text-body">
          The lab draws its 3D view with WebGL 2, which works on the processor&apos;s built-in graphics; no graphics card is
          needed. To switch it on:
        </p>
        <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-body">
          <li>
            Chrome or Edge: Settings → System → turn on <strong className="text-ink">Use graphics acceleration when available</strong>,
            then restart the browser.
          </li>
          <li>Update the graphics driver (Windows Update → Advanced options → Optional updates).</li>
          <li>Or open the lab in another up-to-date browser, such as Firefox.</li>
        </ol>
        <p className="mt-3 text-xs text-muted">The chapter notes are still available.</p>
      </div>
    </div>
  );
}

/**
 * Background colour and fog for the stage on show. The fog is pushed out of
 * range rather than removed, because removing it would recompile every shader.
 */
function StageLook({ stage }: { stage: Stage }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const color = BACKGROUND[stage];
    if (scene.background instanceof THREE.Color) scene.background.set(color);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(color);
      scene.fog.near = stage === "lab" ? 60 : 1e5;
      scene.fog.far = stage === "lab" ? 140 : 2e5;
    }
  }, [scene, stage]);
  return null;
}

function StarField({ count, visible }: { count: number; visible: boolean }) {
  const paused = useLab((s) => s.paused);
  const reduce = useReducedMotion();
  return (
    <group visible={visible}>
      <Stars radius={150} depth={50} count={count} factor={3} saturation={0} fade speed={paused || reduce ? 0 : 0.4} />
    </group>
  );
}

/** The bloom's brightness pass gains nothing from full resolution. */
const halfResolutionBloom = (bloom: BloomEffect | null) => {
  if (bloom) bloom.luminancePass.resolution.scale = 0.5;
};

/** Bloom and vignette: full tier only. The light tiers draw straight to the screen (vignette in CSS). */
function Effects() {
  const on = useLab((s) => TIERS[s.tier].bloom && s.settings.glow);
  if (!on) return null;
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        ref={halfResolutionBloom}
        mipmapBlur
        levels={6}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.2}
        intensity={1.15}
        radius={0.72}
      />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  );
}

/**
 * Compiles the shaders of every object (including the hidden photon pool,
 * the halos, the Seven Skies and the tunnel) and draws one frame with
 * everything visible, before the loading screen is lifted. On the full tier
 * it compiles both variants, for the bloom pass's buffer and for the screen,
 * so dropping to a light tier later causes no pause either.
 */
function ShaderWarmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let cancelled = false;
    const showAll = () => {
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      return hidden;
    };
    const run = async () => {
      // Let every component mount first.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const previous = gl.getRenderTarget();
      const bloom = TIERS[useLab.getState().tier].bloom;
      // Stands in for the bloom pass's input buffer: shaders differ only in their output colour space.
      const offscreen = new THREE.WebGLRenderTarget(1, 1);
      let hidden = showAll();
      try {
        gl.setRenderTarget(null);
        await gl.compileAsync(scene, camera);
        if (bloom && !cancelled) {
          gl.setRenderTarget(offscreen);
          await gl.compileAsync(scene, camera);
        }
        if (cancelled) return;
        // Components reset visibility every frame while we waited: show everything again.
        hidden.forEach((o) => (o.visible = false));
        hidden = showAll();
        gl.setRenderTarget(bloom ? offscreen : null);
        gl.render(scene, camera);
      } catch {
        // Warm-up is an optimisation only; the scene still works without it.
      } finally {
        gl.setRenderTarget(previous);
        hidden.forEach((o) => (o.visible = false));
        offscreen.dispose();
        if (!cancelled) useLab.getState().setReady();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  return null;
}

/**
 * Holds rendering to a steady rate (software rendering). R3F's own loop is
 * off (frameloop "never"); this drives it from requestAnimationFrame, so
 * camera damping and other invalidations cannot add frames above the cap.
 */
function FrameCap({ fps }: { fps: number }) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    // A frame R3F's own loop still owed from before the switch would run in
    // "never" mode with a millisecond timestamp and corrupt the clock.
    get().internal.frames = 0;
    const interval = 1000 / fps;
    let slot = performance.now();
    let prev = slot;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Pacing: render on the first display frame of each interval.
      const late = now - slot;
      if (late < interval - 4) return;
      slot = late > interval * 2 ? now : slot + interval;
      // Time: exactly what passed since the last rendered frame, counted
      // from R3F's own clock so no stray update can make it negative.
      const step = Math.min(now - prev, 250) / 1000;
      prev = now;
      const state = get();
      state.advance(state.clock.elapsedTime + step, true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps, get]);

  return null;
}

/** Milliseconds per frame-rate sample. */
const SAMPLE_MS = 1000;
/** Below this, motion looks jerky on any screen. */
const FPS_FLOOR = 24;

/**
 * Keeps the frame rate up. Each second it measures the frame rate against a
 * goal: the tier's cap or 60, but never more than the best rate this screen
 * has shown (a 30 Hz projector or a browser energy saver caps every frame
 * rate, and that must not read as a slow computer). Three slow seconds in a
 * row lower the resolution a step; at the tier's lowest resolution,
 * automatic mode moves down a tier. Five fast seconds in a row raise the
 * resolution again, but never the tier, and only a few times, so the view
 * never flickers between settings.
 */
function AdaptiveQuality() {
  const st = useRef({ frames: 0, start: 0, best: 0, slow: 0, fast: 0, settle: 2, raises: 0 });

  useFrame(() => {
    const s = st.current;
    const now = performance.now();
    if (!s.start) {
      s.start = now;
      return;
    }
    s.frames++;
    const elapsed = now - s.start;
    if (elapsed < SAMPLE_MS) return;
    const fps = (s.frames * 1000) / elapsed;
    s.frames = 0;
    s.start = now;
    // A hidden tab or a long stall (e.g. a dialog opening) says nothing about the scene.
    if (document.hidden || elapsed > SAMPLE_MS * 3) return;
    s.best = Math.max(s.best, fps);
    if (s.settle > 0) {
      s.settle--;
      return;
    }

    const lab = useLab.getState();
    const spec = TIERS[lab.tier];
    const goal = Math.min(spec.fps || 60, s.best);
    if (fps < goal * 0.75 || fps < FPS_FLOOR) {
      s.slow++;
      s.fast = 0;
    } else if (fps >= goal * 0.93) {
      s.fast++;
      s.slow = 0;
    } else {
      s.slow = s.fast = 0;
    }

    if (s.slow >= 3) {
      s.slow = 0;
      s.settle = 2;
      // Skip resolution steps that change nothing on this screen.
      const ratio = effectiveRatio(spec, lab.resolution);
      let next = lab.resolution;
      while (next > 0 && effectiveRatio(spec, next) >= ratio) next = Math.max(0, next - 0.5);
      if (effectiveRatio(spec, next) < ratio) lab.setResolution(next);
      else if (lab.settings.quality === "auto") {
        const lower = lowerTier(lab.tier);
        if (lower) lab.setTier(lower);
      }
    } else if (s.fast >= 5 && lab.resolution < 1 && s.raises < 4) {
      s.fast = 0;
      s.settle = 2;
      s.raises++;
      lab.setResolution(Math.min(1, lab.resolution + 0.5));
    }
  });

  return null;
}

/* ------------------------------------------------------------------------ */
/* Camera                                                                    */
/* ------------------------------------------------------------------------ */

const FLIGHT_SECONDS = 1.2;
const followDelta = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** An angle difference brought into −π…π. */
function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * OrbitControls (drag to rotate 360°, scroll or pinch to zoom, right-drag to
 * pan) plus preset views. A requested view is reached with a short eased
 * flight (an instant cut with reduced motion); grabbing the view cancels it.
 * The projection is offset so the scene centres in the area the console
 * leaves free.
 */
function CameraRig({ stage, damping }: { stage: Stage; damping: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  /** Last followed position, so the camera moves with the body it follows. */
  const followed = useRef(new THREE.Vector3());
  /** Bearing of the last preferred side (cameraFollow.side), so the camera turns with it; NaN = none. */
  const sideBearing = useRef(Number.NaN);
  const get = useThree((s) => s.get);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const view = useLab((s) => s.view);
  const inset = useLab((s) => s.stageInset);
  const flight = useRef<null | {
    t: number;
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    /** Following a moving body: the end of the flight is this offset from it. */
    followOffset?: THREE.Vector3;
  }>(null);

  // Centre the scene in the uncovered part of the window.
  useEffect(() => {
    const { width, height } = size;
    if (inset.right || inset.bottom) camera.setViewOffset(width, height, inset.right / 2, inset.bottom / 2, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, size, inset]);

  // Phones and portrait screens start further back so the whole grid fits.
  useEffect(() => {
    const aspect = size.width / size.height;
    if (aspect >= 1.2 || !controls.current) return;
    const c = controls.current;
    const offset = camera.position.clone().sub(c.target);
    offset.multiplyScalar(Math.pow(1.2 / aspect, 0.75));
    camera.position.copy(c.target).add(offset);
    c.update();
    // Only on first layout.
  }, []);

  // Fly to a requested view. Only a new request starts a flight: resizing the
  // window must not pull the camera back from where the user put it.
  useEffect(() => {
    const c = controls.current;
    if (!c || view.nonce === 0) return;
    const preset = VIEWS[view.name];
    let toPos = new THREE.Vector3(...preset.position);
    let toTarget = new THREE.Vector3(...preset.target);
    let followOffset: THREE.Vector3 | undefined;
    if (view.name === "planet" && cameraFollow.active) {
      // Keep looking from the current side, a little above, at the body's own viewing distance.
      followed.current.copy(cameraFollow.position);
      followOffset = cameraFollow.side ? cameraFollow.side.clone() : camera.position.clone().sub(cameraFollow.position).setY(0);
      sideBearing.current = cameraFollow.side ? Math.atan2(cameraFollow.side.x, cameraFollow.side.z) : Number.NaN;
      if (followOffset.lengthSq() < 1e-6) followOffset.set(0, 0, 1);
      followOffset.normalize().setY(0.35).setLength(cameraFollow.distance);
      toTarget = cameraFollow.position.clone();
      toPos = toTarget.clone().add(followOffset);
    }
    const { width, height } = get().size;
    const aspect = width / Math.max(1, height);
    if (aspect < 1.2)
      toPos
        .sub(toTarget)
        .multiplyScalar(Math.pow(1.2 / aspect, 0.75))
        .add(toTarget);
    if (prefersReducedMotion()) {
      camera.position.copy(toPos);
      c.target.copy(toTarget);
      c.update();
      flight.current = null;
    } else {
      flight.current = { t: 0, fromPos: camera.position.clone(), fromTarget: c.target.clone(), toPos, toTarget, followOffset };
    }
  }, [view, camera, get]);

  // Hand the controls to the keyboard / on-screen camera pad.
  useEffect(() => {
    const spherical = new THREE.Spherical();
    const offset = new THREE.Vector3();
    cameraApi.orbit = (azimuth, polar) => {
      const c = controls.current;
      if (!c) return;
      flight.current = null;
      offset.copy(camera.position).sub(c.target);
      spherical.setFromVector3(offset);
      spherical.theta += azimuth;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + polar, 0.01, Math.PI - 0.01);
      offset.setFromSpherical(spherical);
      camera.position.copy(c.target).add(offset);
      c.update();
    };
    cameraApi.zoom = (factor) => {
      const c = controls.current;
      if (!c) return;
      flight.current = null;
      offset.copy(camera.position).sub(c.target);
      const d = THREE.MathUtils.clamp(offset.length() * factor, c.minDistance, c.maxDistance);
      camera.position.copy(c.target).add(offset.setLength(d));
      c.update();
    };
  }, [camera]);

  useFrame((_, raw) => {
    const f = flight.current;
    const c = controls.current;
    if (!c) return;
    // Follow a moving body: carry the camera along with it.
    if (useLab.getState().view.name === "planet" && cameraFollow.active) {
      const delta = followDelta.copy(cameraFollow.position).sub(followed.current);
      followed.current.copy(cameraFollow.position);
      // A preferred side turns with the body as it orbits (the gravity fabric's view): turn the camera with it.
      const side = cameraFollow.side;
      const bearing = side ? Math.atan2(side.x, side.z) : Number.NaN;
      const turn = Number.isNaN(bearing) || Number.isNaN(sideBearing.current) ? 0 : wrapAngle(bearing - sideBearing.current);
      sideBearing.current = bearing;
      if (f?.followOffset) {
        if (turn) f.followOffset.applyAxisAngle(UP, turn);
        f.toTarget.copy(cameraFollow.position);
        f.toPos.copy(cameraFollow.position).add(f.followOffset);
      } else {
        camera.position.add(delta);
        c.target.add(delta);
        if (turn) {
          camera.position.sub(c.target).applyAxisAngle(UP, turn).add(c.target);
          c.update();
        }
      }
    } else sideBearing.current = Number.NaN;
    if (!f) return;
    f.t = Math.min(1, f.t + Math.min(raw, 0.1) / FLIGHT_SECONDS);
    const k = f.t < 0.5 ? 4 * f.t * f.t * f.t : 1 - Math.pow(-2 * f.t + 2, 3) / 2;
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    c.target.lerpVectors(f.fromTarget, f.toTarget, k);
    c.update();
    if (f.t >= 1) flight.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={damping}
      minDistance={STAGE_DISTANCE[stage][0]}
      maxDistance={STAGE_DISTANCE[stage][1]}
      // The black hole picture assumes the camera looks at the hole from outside the disk.
      enablePan={stage !== "blackhole"}
      target={VIEWS.overview.target}
      onStart={() => {
        flight.current = null;
      }}
    />
  );
}
