"use client";

import { useEffect, useState } from "react";
import { mirajPhases, sim } from "./store";

function snapshot() {
  return {
    m: sim.m,
    rateB: sim.rateB,
    clockA: sim.clockA,
    clockB: sim.clockB,
    lastShot: sim.lastShot,
    transits: sim.transits,
    ...mirajPhases(),
  };
}

export type SimSnapshot = ReturnType<typeof snapshot>;

/** Re-reads the per-frame simulation values a few times per second for the HUD. */
export function useSimSnapshot(hz = 8): SimSnapshot {
  const [snap, setSnap] = useState(snapshot);
  useEffect(() => {
    const id = window.setInterval(() => setSnap(snapshot()), 1000 / hz);
    return () => window.clearInterval(id);
  }, [hz]);
  return snap;
}
