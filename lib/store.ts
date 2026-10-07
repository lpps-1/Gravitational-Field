import { create } from "zustand";

export type ModuleId = "A" | "B" | "C" | "D";

interface LabState {
  /** Central mass slider value, 0..100. */
  mass: number;
  /** Miraj / Spacetime Fold engaged. */
  miraj: boolean;
  /** Increments every time a photon is fired. */
  photonShots: number;
  /** Increments every time the clocks are reset. */
  clockResets: number;
  /** Which module the field-notes card is explaining. */
  focus: ModuleId;
  /** Whether the control panel is open. */
  panelOpen: boolean;
  /** Whether the field-notes card is expanded. */
  notesOpen: boolean;

  setMass: (mass: number) => void;
  toggleMiraj: () => void;
  firePhoton: () => void;
  resetClocks: () => void;
  setFocus: (focus: ModuleId) => void;
  togglePanel: () => void;
  toggleNotes: () => void;
}

export const useLab = create<LabState>((set) => ({
  mass: 55,
  miraj: false,
  photonShots: 0,
  clockResets: 0,
  focus: "A",
  panelOpen: true,
  notesOpen: true,

  setMass: (mass) => set({ mass: Math.max(0, Math.min(100, mass)), focus: "A" }),
  toggleMiraj: () => set((s) => ({ miraj: !s.miraj, focus: "D" })),
  firePhoton: () => set((s) => ({ photonShots: s.photonShots + 1, focus: s.miraj ? "D" : "B" })),
  resetClocks: () => set((s) => ({ clockResets: s.clockResets + 1, focus: "C" })),
  setFocus: (focus) => set({ focus, notesOpen: true }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  toggleNotes: () => set((s) => ({ notesOpen: !s.notesOpen })),
}));

/**
 * Mutable per-frame simulation values. These change every frame, so they live
 * outside React: the 3D scene writes them inside `useFrame`, and the HUD polls
 * them a few times per second.
 */
export const sim = {
  /** Smoothed (animated) mass in [0,1]. */
  m: 0.55,
  /** Miraj progress in [0,2]: 0..1 = skies expanding, 1..2 = spacetime folding. */
  miraj: 0,
  /** Proper time elapsed on each clock, in seconds. */
  clockA: 0,
  clockB: 0,
  /** Current tick-rate of Clock B relative to Clock A. */
  rateB: 1,
  /** Result of the most recent photon shot (null = none yet). */
  lastShot: null as null | { deflection: number; captured: boolean; impact: number; mass: number },
  /** Number of completed transits through the wormhole. */
  transits: 0,
  /** Duration of the last wormhole transit, in seconds. */
  transitTime: 0,
};

/** Expansion (0..1) and fold (0..1) derived from `sim.miraj`. */
export function mirajPhases(p = sim.miraj) {
  return {
    expand: Math.min(1, Math.max(0, p)),
    fold: Math.min(1, Math.max(0, p - 1)),
  };
}
