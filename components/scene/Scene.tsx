"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { VIEWS, cameraApi } from "@/lib/camera";
import { prefersReducedMotion, useReducedMotion } from "@/lib/hooks";
import { TIERS, lowerTier, probeGraphics, type Tier, type TierSpec } from "@/lib/quality";
import { useLab } from "@/lib/store";
import { AnchorProjector } from "./AnchorProjector";
import { CentralMass } from "./CentralMass";
import { OrbitingBodies } from "./OrbitingBodies";
import { PhotonBeams } from "./PhotonBeams";
import { SevenSkies } from "./SevenSkies";
import { SimDriver } from "./SimDriver";
import { SpacetimeGrid } from "./SpacetimeGrid";
import { TimeClocks } from "./TimeClocks";

const NAVY = "#1F3863";

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

  return (
    <Canvas
      flat
      dpr={pixelRatio(spec, resolution)}
      frameloop={spec.fps ? "never" : "always"}
      camera={{ position: VIEWS.overview.position, fov: 45, near: 0.1, far: 400 }}
      gl={gl}
      onCreated={({ gl }) => onCreated(gl)}
      aria-hidden
      className="!absolute inset-0"
    >
      <color attach="background" args={[NAVY]} />
      <fog attach="fog" args={[NAVY, 60, 140]} />
      <SimDriver />
      <StarField count={STARS[startTier]} />
      <SpacetimeGrid />
      <CentralMass />
      <OrbitingBodies />
      <PhotonBeams />
      <TimeClocks />
      <SevenSkies />
      <CameraRig damping={spec.fps ? 1 - Math.pow(1 - 0.08, 60 / spec.fps) : 0.08} />
      <AnchorProjector />
      <Effects />
      <ShaderWarmup />
      {spec.fps > 0 && <FrameCap fps={spec.fps} />}
      {ready && <AdaptiveQuality />}
    </Canvas>
  );
}

/** Device pixels per CSS pixel for a tier at a position (0..1) in its range, never above the screen's own. */
function pixelRatio(spec: TierSpec, resolution: number) {
  const [lo, hi] = spec.dpr;
  const ratio = Math.min(window.devicePixelRatio || 1, lo + (hi - lo) * resolution);
  return Math.round(ratio * 100) / 100;
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
    <div className="absolute inset-0 flex items-center justify-center bg-navy p-6">
      <div className="max-w-lg rounded-lg border border-line-strong bg-navy-deep p-5 text-paper">
        <h2 className="text-lg font-semibold">3D graphics are switched off in this browser</h2>
        <p className="mt-2 text-sm text-paper-2">
          The lab draws its 3D view with WebGL 2, which works on the processor&apos;s built-in graphics; no graphics card is
          needed. To switch it on:
        </p>
        <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-paper-2">
          <li>
            Chrome or Edge: Settings → System → turn on <strong className="text-paper">Use graphics acceleration when available</strong>,
            then restart the browser.
          </li>
          <li>Update the graphics driver (Windows Update → Advanced options → Optional updates).</li>
          <li>Or open the lab in another up-to-date browser, such as Firefox.</li>
        </ol>
        <p className="mt-3 text-xs text-paper-3">The explanations, clocks and graph in the side panel still work.</p>
      </div>
    </div>
  );
}

function StarField({ count }: { count: number }) {
  const paused = useLab((s) => s.paused);
  const reduce = useReducedMotion();
  return <Stars radius={120} depth={40} count={count} factor={3} saturation={0} fade speed={paused || reduce ? 0 : 0.4} />;
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
    const clock = get().clock;
    // In "never" mode R3F takes the time from advance(); a self-starting clock would corrupt it.
    clock.autoStart = false;
    const interval = 1000 / fps;
    let time = clock.elapsedTime;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = now - last;
      if (elapsed < interval - 4) return;
      last = elapsed > interval * 2 ? now : last + interval;
      time += Math.min(elapsed, 250) / 1000;
      get().advance(time, true);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clock.autoStart = true;
    };
  }, [fps, get]);

  return null;
}

/** Seconds per frame-rate sample. */
const SAMPLE_MS = 1000;

/**
 * Keeps the frame rate up. Each second it measures the frame rate. Three slow
 * seconds in a row lower the resolution a step; at the tier's lowest
 * resolution, automatic mode moves down a tier. Five fast seconds in a row
 * raise the resolution again, but never the tier, and only a few times, so
 * the view never flickers between settings.
 */
function AdaptiveQuality() {
  const st = useRef({ frames: 0, start: 0, slow: 0, fast: 0, settle: 2, raises: 0 });

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
    if (s.settle > 0) {
      s.settle--;
      return;
    }

    const lab = useLab.getState();
    const goal = TIERS[lab.tier].fps || 60;
    if (fps < goal * 0.75) {
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
      if (lab.resolution > 0) lab.setResolution(Math.max(0, lab.resolution - 0.5));
      else if (lab.settings.quality === "auto") {
        const next = lowerTier(lab.tier);
        if (next) lab.setTier(next);
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

/**
 * OrbitControls (drag to rotate 360°, scroll or pinch to zoom, right-drag to
 * pan) plus preset views. A requested view is reached with a short eased
 * flight (an instant cut with reduced motion); grabbing the view cancels it.
 * The projection is offset so the scene centres in the area the console
 * leaves free.
 */
function CameraRig({ damping }: { damping: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
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
    const toPos = new THREE.Vector3(...preset.position);
    const toTarget = new THREE.Vector3(...preset.target);
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
      flight.current = { t: 0, fromPos: camera.position.clone(), fromTarget: c.target.clone(), toPos, toTarget };
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
    if (!f || !c) return;
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
      minDistance={3}
      maxDistance={95}
      target={VIEWS.overview.target}
      onStart={() => {
        flight.current = null;
      }}
    />
  );
}
