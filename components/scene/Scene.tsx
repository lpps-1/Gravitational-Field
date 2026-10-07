"use client";

import { OrbitControls, PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import type { EffectComposer as EffectComposerImpl } from "postprocessing";
import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { VIEWS, cameraApi } from "@/lib/camera";
import { prefersReducedMotion } from "@/lib/hooks";
import { useLab, type Tier } from "@/lib/store";
import { AnchorProjector } from "./AnchorProjector";
import { CentralMass } from "./CentralMass";
import { OrbitingBodies } from "./OrbitingBodies";
import { PhotonBeams } from "./PhotonBeams";
import { SevenSkies } from "./SevenSkies";
import { SimDriver } from "./SimDriver";
import { SpacetimeGrid } from "./SpacetimeGrid";
import { TimeClocks } from "./TimeClocks";

const NAVY = "#1F3863";

/** Integrated and software GPUs start on the lighter graphics tier. */
const WEAK_GPU = /intel|uhd|iris|hd graphics|mali|adreno|powervr|swiftshader|llvmpipe|basic render|microsoft basic/i;

/**
 * The 3D view. Rendering cost is kept low for ordinary laptops:
 * - resolution capped at 1.5× (1× on the light tier), no wasted canvas MSAA;
 * - bloom at half resolution with fewer blur levels;
 * - the light tier is chosen automatically from the GPU and measured frame rate;
 * - every shader is compiled while the loading screen is up, so nothing
 *   freezes the first time a photon is fired or the Miraj is engaged.
 */
function Scene() {
  const tier = useLab((s) => s.tier);
  const ready = useLab((s) => s.ready);

  return (
    <Canvas
      flat
      dpr={tier === "high" ? [1, 1.5] : 1}
      camera={{ position: VIEWS.overview.position, fov: 45, near: 0.1, far: 400 }}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => onCreated(gl)}
      aria-hidden
      className="!absolute inset-0"
    >
      <color attach="background" args={[NAVY]} />
      <fog attach="fog" args={[NAVY, 60, 140]} />
      <SimDriver />
      <StarField tier={tier} />
      <SpacetimeGrid />
      <CentralMass />
      <OrbitingBodies />
      <PhotonBeams />
      <TimeClocks />
      <SevenSkies />
      <CameraRig />
      <AnchorProjector />
      <Effects tier={tier} />
      {ready && <AdaptiveQuality />}
    </Canvas>
  );
}

export default memo(Scene);

function onCreated(gl: THREE.WebGLRenderer) {
  // Synchronous shader error checks cost hundreds of ms per compile on Windows.
  if (process.env.NODE_ENV === "production") gl.debug.checkShaderErrors = false;

  const lab = useLab.getState();
  if (lab.settings.quality === "auto") {
    const ctx = gl.getContext();
    const info = ctx.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    const weak = WEAK_GPU.test(renderer) || (navigator.hardwareConcurrency ?? 8) <= 4;
    lab.setTier(weak ? "low" : "high");
  } else {
    lab.setTier(lab.settings.quality);
  }

  const canvas = gl.domElement;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    useLab.getState().setGpuLost(true);
  });
  canvas.addEventListener("webglcontextrestored", () => window.location.reload());
}

function StarField({ tier }: { tier: Tier }) {
  const paused = useLab((s) => s.paused);
  const reduce = useLab((s) => s.settings.reduceMotion);
  return (
    <Stars
      radius={120}
      depth={40}
      count={tier === "high" ? 2500 : 1200}
      factor={3}
      saturation={0}
      fade
      speed={paused || reduce ? 0 : 0.4}
    />
  );
}

/** Bloom and vignette, plus the shader warm-up that runs once behind the loading screen. */
function Effects({ tier }: { tier: Tier }) {
  const glow = useLab((s) => s.settings.glow);
  const composer = useRef<EffectComposerImpl>(null);
  const bloom = useRef<BloomEffect>(null);

  // The bloom's brightness pass gains nothing from full resolution.
  useEffect(() => {
    if (bloom.current) bloom.current.luminancePass.resolution.scale = 0.5;
  }, [tier, glow]);

  return (
    <>
      <EffectComposer ref={composer} multisampling={tier === "high" ? 4 : 0}>
        {glow && (
          <Bloom
            ref={bloom}
            mipmapBlur
            levels={tier === "high" ? 6 : 5}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.2}
            intensity={1.15}
            radius={0.72}
          />
        )}
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
      <ShaderWarmup composer={composer} />
    </>
  );
}

/**
 * Compiles the shaders of every object (including the hidden photon pool,
 * the Seven Skies and the tunnel) for the composer's render target, then
 * renders one frame, before the loading screen is lifted.
 */
function ShaderWarmup({ composer }: { composer: React.RefObject<EffectComposerImpl | null> }) {
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
      // Let the composer and every component mount first.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const previous = gl.getRenderTarget();
      const target = composer.current?.inputBuffer ?? null;
      let hidden = showAll();
      try {
        gl.setRenderTarget(target);
        await gl.compileAsync(scene, camera);
        if (cancelled) return;
        hidden.forEach((o) => (o.visible = false));
        hidden = showAll();
        gl.setRenderTarget(target);
        gl.render(scene, camera);
      } catch {
        // Warm-up is an optimisation only; the scene still works without it.
      } finally {
        gl.setRenderTarget(previous);
        hidden.forEach((o) => (o.visible = false));
        if (!cancelled) useLab.getState().setReady();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, composer]);

  return null;
}

/** Switches between the graphics tiers from the measured frame rate (auto mode only). */
function AdaptiveQuality() {
  const auto = (tier: Tier) => {
    const lab = useLab.getState();
    if (lab.settings.quality === "auto") lab.setTier(tier);
  };
  return (
    <PerformanceMonitor
      ms={500}
      iterations={6}
      threshold={0.7}
      flipflops={3}
      onDecline={() => auto("low")}
      onIncline={() => auto("high")}
      onFallback={() => auto("low")}
    />
  );
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
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
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

  // Fly to a requested view.
  useEffect(() => {
    const c = controls.current;
    if (!c || view.nonce === 0) return;
    const preset = VIEWS[view.name];
    const toPos = new THREE.Vector3(...preset.position);
    const toTarget = new THREE.Vector3(...preset.target);
    const aspect = size.width / Math.max(1, size.height);
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
  }, [view, camera, size]);

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
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={95}
      target={VIEWS.overview.target}
      onStart={() => {
        flight.current = null;
      }}
    />
  );
}
