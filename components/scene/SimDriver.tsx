"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MIRAJ_EXPAND_SECONDS, MIRAJ_FOLD_SECONDS, MIRAJ_HOLD_SECONDS, MIRAJ_TOTAL_SECONDS, dilationFactor } from "@/lib/physics";
import { CLOCK_SAMPLES, CLOCK_SAMPLE_SECONDS, resetClockState, sim, useLab } from "@/lib/store";

/** Longest animation step: below 20 fps the animation slows down instead of jumping. */
const MAX_STEP = 1 / 20;
/** Longest clock step: clocks catch up after a stall, but never by more than this. */
const MAX_CLOCK_STEP = 0.25;
/** Duration of one "Step" while paused. */
const STEP_SECONDS = 1 / 30;
/** Unfolding plays back faster than folding. */
const REVERSE_RATE = 2;

/**
 * Advances the shared simulation state once per frame, before anything else
 * (priority -2), so every module reads the same time step and phases.
 */
export function SimDriver() {
  const clockResets = useLab((s) => s.clockResets);
  const resets = useLab((s) => s.resets);
  const steps = useLab((s) => s.steps);
  const pendingSteps = useRef(0);

  useEffect(() => {
    if (clockResets > 0) resetClockState();
  }, [clockResets]);

  useEffect(() => {
    if (resets === 0) return;
    sim.mirajTime = 0;
    sim.expand = 0;
    sim.fold = 0;
    sim.lastShot = null;
    sim.transits = 0;
  }, [resets]);

  useEffect(() => {
    if (steps > 0) pendingSteps.current += 1;
  }, [steps]);

  useFrame((_, raw) => {
    const { mass, miraj, paused, speed } = useLab.getState();

    let dt: number;
    let clockDt: number;
    if (paused) {
      dt = clockDt = pendingSteps.current > 0 ? STEP_SECONDS * speed : 0;
      pendingSteps.current = Math.max(0, pendingSteps.current - 1);
    } else {
      pendingSteps.current = 0;
      dt = Math.min(raw, MAX_STEP) * speed;
      clockDt = Math.min(raw, MAX_CLOCK_STEP) * speed;
    }
    sim.dt = dt;

    // The fabric follows the slider in real time, even while paused, so the
    // effect of a change is visible before pressing Play.
    const target = mass / 100;
    sim.m += (target - sim.m) * (1 - Math.exp(-Math.min(raw, 0.1) * 5));
    if (Math.abs(target - sim.m) < 1e-4) sim.m = target;

    // Miraj timeline: separate the skies, hold, fold. Reverse on disengage.
    if (miraj) sim.mirajTime = Math.min(MIRAJ_TOTAL_SECONDS, sim.mirajTime + dt);
    else sim.mirajTime = Math.max(0, sim.mirajTime - dt * REVERSE_RATE);
    sim.expand = smooth(Math.min(1, sim.mirajTime / MIRAJ_EXPAND_SECONDS));
    // Snapped at the end: (8.7 - 3 - 1.2) / 4.5 rounds to just under 1, and `fold >= 1` means "open".
    sim.fold =
      sim.mirajTime >= MIRAJ_TOTAL_SECONDS
        ? 1
        : Math.min(1, Math.max(0, (sim.mirajTime - MIRAJ_EXPAND_SECONDS - MIRAJ_HOLD_SECONDS) / MIRAJ_FOLD_SECONDS));

    // Time dilation. Clock A is far away: one second per second.
    sim.rateB = dilationFactor(sim.m);
    sim.clockA += clockDt;
    sim.clockB += clockDt * sim.rateB;

    sim.historyTimer += clockDt;
    while (sim.historyTimer >= CLOCK_SAMPLE_SECONDS) {
      sim.historyTimer -= CLOCK_SAMPLE_SECONDS;
      if (sim.historyCount === CLOCK_SAMPLES) {
        sim.historyA.copyWithin(0, 1);
        sim.historyB.copyWithin(0, 1);
        sim.historyCount--;
      }
      sim.historyA[sim.historyCount] = sim.clockA;
      sim.historyB[sim.historyCount] = sim.clockB;
      sim.historyCount++;
    }
  }, -2);

  return null;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
