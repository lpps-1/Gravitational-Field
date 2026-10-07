"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SKY_CENTER_Y } from "@/lib/physics";
import { mirajPhases, sim, useLab } from "@/lib/store";
import { AnchorProjector } from "./AnchorProjector";
import { CentralMass } from "./CentralMass";
import { OrbitingBodies } from "./OrbitingBodies";
import { PhotonBeams } from "./PhotonBeams";
import { SevenSkies } from "./SevenSkies";
import { SimDriver } from "./SimDriver";
import { SpacetimeGrid } from "./SpacetimeGrid";
import { TimeClocks } from "./TimeClocks";

const NAVY = "#1F3863";

export default function Scene() {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [24, 17, 28], fov: 45, near: 0.1, far: 400 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <color attach="background" args={[NAVY]} />
      <fog attach="fog" args={[NAVY, 60, 140]} />
      <SimDriver />
      <Stars radius={120} depth={40} count={2500} factor={3} saturation={0} fade speed={0.4} />
      <SpacetimeGrid />
      <CentralMass />
      <OrbitingBodies />
      <PhotonBeams />
      <TimeClocks />
      <SevenSkies />
      <CameraRig />
      <AnchorProjector />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.2} intensity={1.15} radius={0.72} />
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}

const GRID_TARGET = new THREE.Vector3(0, -2, 0);
const SKY_TARGET = new THREE.Vector3(0, SKY_CENTER_Y, 0);
const SKY_FRAMING_DISTANCE = 50;

/**
 * OrbitControls (drag to rotate 360°, scroll to zoom, right-drag to pan).
 * While the Miraj sequence is running, the orbit target glides between the
 * gravity well and the centre of the Seven Skies; otherwise it is left alone.
 */
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const lastPhase = useRef(sim.miraj);
  const tmp = useRef(new THREE.Vector3());
  const camera = useThree((s) => s.camera);

  // On portrait / narrow screens, start further back so the whole grid fits.
  useEffect(() => {
    const aspect = window.innerWidth / window.innerHeight;
    if (aspect >= 1.2) return;
    const offset = camera.position.clone().sub(GRID_TARGET);
    offset.multiplyScalar(Math.pow(1.2 / aspect, 0.75));
    camera.position.copy(GRID_TARGET).add(offset);
    controls.current?.update();
  }, [camera]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const changing = sim.miraj !== lastPhase.current;
    lastPhase.current = sim.miraj;
    if (!changing) return;
    const { expand } = mirajPhases();
    tmp.current.copy(GRID_TARGET).lerp(SKY_TARGET, expand);
    c.target.lerp(tmp.current, 0.08);
    // While the skies rise, back the camera off enough to frame all seven.
    if (useLab.getState().miraj) {
      const offset = tmp.current.copy(c.object.position).sub(c.target);
      const dist = offset.length();
      if (dist < SKY_FRAMING_DISTANCE) {
        offset.setLength(THREE.MathUtils.lerp(dist, SKY_FRAMING_DISTANCE, 0.05));
        c.object.position.copy(c.target).add(offset);
      }
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={90}
      target={GRID_TARGET.toArray()}
    />
  );
}
