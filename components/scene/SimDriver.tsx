"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { dilationFactor } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";

/** Seconds for the Miraj sequence to run each phase (expand, then fold). */
const EXPAND_SECONDS = 1.6;
const FOLD_SECONDS = 2.6;

/**
 * Advances the shared simulation state once per frame, before anything else
 * renders (negative priority), so every module reads consistent values.
 */
export function SimDriver() {
  const clockResets = useLab((s) => s.clockResets);

  useEffect(() => {
    if (clockResets === 0) return;
    sim.clockA = 0;
    sim.clockB = 0;
  }, [clockResets]);

  useFrame((_, rawDelta) => {
    // Clamp only the *animation* step; clocks still use the true delta below.
    const dt = Math.min(rawDelta, 0.1);
    const { mass, miraj } = useLab.getState();

    // Ease the visible mass toward the slider value.
    const target = mass / 100;
    sim.m += (target - sim.m) * (1 - Math.exp(-dt * 5));
    if (Math.abs(target - sim.m) < 1e-4) sim.m = target;

    // Miraj sequence: expand the skies, then fold them. Reverse on disengage.
    const goal = miraj ? 2 : 0;
    const rate = sim.miraj < 1 || (sim.miraj === 1 && !miraj) ? 1 / EXPAND_SECONDS : 1 / FOLD_SECONDS;
    if (sim.miraj < goal) sim.miraj = Math.min(goal, sim.miraj + dt * rate);
    else if (sim.miraj > goal) sim.miraj = Math.max(goal, sim.miraj - dt * rate);

    // Time dilation. Clock A is the far-away observer: one second per second.
    sim.rateB = dilationFactor(sim.m);
    sim.clockA += rawDelta;
    sim.clockB += rawDelta * sim.rateB;
  }, -1);

  return null;
}
