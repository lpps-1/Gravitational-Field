import { create } from "zustand";
import { AIM_DEFAULT, AIM_MAX, AIM_MIN } from "./physics";
import { resolveTier, type QualityMode, type Tier } from "./quality";

export type { QualityMode, Tier };

export type ModuleId = "A" | "B" | "C" | "D";
export type ViewName = "overview" | "top" | "side" | "clocks" | "skies" | "under";
export type DialogId = "about" | "keys" | "settings";
export type Speed = 0.25 | 1;

export interface Settings {
  /** Text labels pinned to objects in the 3D scene. */
  labels: boolean;
  /** Graphics quality: auto adapts to the computer. */
  quality: QualityMode;
  /** Bloom glow around bright objects. */
  glow: boolean;
  /** Stop automatic camera flights and decorative motion. */
  reduceMotion: boolean;
  /** Retro scanline overlay on the 3D view. */
  crt: boolean;
  /** Single-key shortcuts (Space, M, R…). Alt+Shift chords always work. */
  shortcuts: boolean;
  /** Interface text size multiplier. */
  textSize: 1 | 1.25 | 1.5;
}

const DEFAULT_SETTINGS: Settings = {
  labels: true,
  quality: "auto",
  glow: true,
  reduceMotion: false,
  crt: true,
  shortcuts: true,
  textSize: 1,
};

export const DEFAULT_MASS = 55;
const SETTINGS_KEY = "spacetime-lab:settings:v1";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage disabled: settings simply won't persist.
  }
}

interface LabState {
  /** Shaders compiled and first frame drawn. */
  ready: boolean;
  /** Central mass slider value, 0..100. */
  mass: number;
  /** How far from the centre the photon is aimed (grid units). */
  aim: number;
  /** Miraj / Spacetime Fold engaged. */
  miraj: boolean;
  /** Increments every time a photon is fired. */
  photonShots: number;
  /** Increments to clear the photon paths from the grid. */
  pathClears: number;
  /** Increments every time the clocks are synchronised. */
  clockResets: number;
  /** Increments on Reset all. */
  resets: number;
  /** Which module the explanation tabs show. */
  focus: ModuleId;
  /** Simulation time controls. */
  paused: boolean;
  speed: Speed;
  /** Increments for each single step while paused. */
  steps: number;
  /** Requested camera view; the nonce re-triggers the same view. */
  view: { name: ViewName; nonce: number };
  /** Guided tour. */
  tour: { active: boolean; step: number };
  /** Welcome card shown on first load. */
  welcome: boolean;
  dialog: DialogId | null;
  /** Console open (side panel on desktop, sheet on phones). */
  panelOpen: boolean;
  /** Effective graphics tier (resolved from settings.quality before the 3D view is created). */
  tier: Tier;
  /** Position within the tier's resolution range (0 = lowest, 1 = highest); set by the frame-rate monitor. */
  resolution: number;
  settings: Settings;
  /** Latest status message for screen readers and the on-screen toast. */
  announcement: { text: string; id: number };
  /** Part of the window covered by the console (px): the 3D view centres itself in the rest. */
  stageInset: { right: number; bottom: number };
  /** The graphics driver reset the WebGL context. */
  gpuLost: boolean;

  setReady: () => void;
  setMass: (mass: number) => void;
  setAim: (aim: number) => void;
  setMiraj: (on: boolean) => void;
  toggleMiraj: () => void;
  firePhoton: () => void;
  clearPaths: () => void;
  resetClocks: () => void;
  resetAll: () => void;
  setFocus: (focus: ModuleId) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  step: () => void;
  setSpeed: (speed: Speed) => void;
  setView: (name: ViewName) => void;
  startTour: () => void;
  setTourStep: (step: number) => void;
  endTour: () => void;
  dismissWelcome: () => void;
  openDialog: (dialog: DialogId) => void;
  closeDialog: () => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setTier: (tier: Tier) => void;
  setResolution: (resolution: number) => void;
  setQuality: (quality: QualityMode) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  announce: (text: string) => void;
  setStageInset: (inset: { right: number; bottom: number }) => void;
  setGpuLost: (lost: boolean) => void;
}

const initialSettings = loadSettings();

export const useLab = create<LabState>((set, get) => ({
  ready: false,
  mass: DEFAULT_MASS,
  aim: AIM_DEFAULT,
  miraj: false,
  photonShots: 0,
  pathClears: 0,
  clockResets: 0,
  resets: 0,
  focus: "A",
  paused: false,
  speed: 1,
  steps: 0,
  view: { name: "overview", nonce: 0 },
  tour: { active: false, step: 0 },
  welcome: true,
  dialog: null,
  panelOpen: true,
  tier: typeof window === "undefined" ? "high" : resolveTier(initialSettings.quality),
  resolution: 1,
  settings: initialSettings,
  announcement: { text: "", id: 0 },
  stageInset: { right: 0, bottom: 0 },
  gpuLost: false,

  setReady: () => set({ ready: true }),
  setMass: (mass) => set({ mass: Math.round(Math.max(0, Math.min(100, mass))) }),
  setAim: (aim) => set({ aim: Math.max(AIM_MIN, Math.min(AIM_MAX, Math.round(aim * 10) / 10)) }),
  setMiraj: (on) => {
    if (get().miraj === on) return;
    set((s) => ({ miraj: on, focus: "D", view: { name: on ? "skies" : "overview", nonce: s.view.nonce + 1 } }));
    get().announce(on ? "Miraj engaged: the seven skies are separating." : "Miraj disengaged: returning to the gravity well.");
  },
  toggleMiraj: () => get().setMiraj(!get().miraj),
  firePhoton: () => {
    // Shots fired behind the loading screen would be hidden again by the shader warm-up.
    if (!get().ready) return;
    set((s) => ({ photonShots: s.photonShots + 1, focus: s.miraj ? "D" : "B" }));
  },
  clearPaths: () => set((s) => ({ pathClears: s.pathClears + 1 })),
  resetClocks: () => {
    set((s) => ({ clockResets: s.clockResets + 1, focus: "C" }));
    get().announce("Clocks synchronised: both read zero.");
  },
  resetAll: () => {
    set((s) => ({
      mass: DEFAULT_MASS,
      aim: AIM_DEFAULT,
      miraj: false,
      paused: false,
      speed: 1,
      focus: "A",
      resets: s.resets + 1,
      pathClears: s.pathClears + 1,
      clockResets: s.clockResets + 1,
      view: { name: "overview", nonce: s.view.nonce + 1 },
      tour: { active: false, step: 0 },
      dialog: null,
    }));
    get().announce("Simulation reset.");
  },
  setFocus: (focus) => set({ focus }),
  togglePause: () => get().setPaused(!get().paused),
  setPaused: (paused) => {
    if (get().paused === paused) return;
    set({ paused });
    get().announce(paused ? "Paused." : "Playing.");
  },
  step: () => set((s) => (s.paused ? { steps: s.steps + 1 } : {})),
  setSpeed: (speed) => {
    if (get().speed === speed) return;
    set({ speed });
    get().announce(speed === 1 ? "Normal speed." : "Slow motion, one quarter speed.");
  },
  setView: (name) => set((s) => ({ view: { name, nonce: s.view.nonce + 1 } })),
  startTour: () => set({ tour: { active: true, step: 0 }, welcome: false, dialog: null }),
  setTourStep: (step) => set((s) => ({ tour: { ...s.tour, step } })),
  endTour: () => set({ tour: { active: false, step: 0 } }),
  dismissWelcome: () => set({ welcome: false }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setTier: (tier) => {
    if (get().tier !== tier) set({ tier, resolution: 1 });
  },
  setResolution: (resolution) => {
    if (get().resolution !== resolution) set({ resolution });
  },
  setQuality: (quality) => {
    get().updateSettings({ quality });
    get().setTier(resolveTier(quality));
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },
  announce: (text) => set((s) => ({ announcement: { text, id: s.announcement.id + 1 } })),
  setStageInset: (inset) => {
    const cur = get().stageInset;
    if (cur.right !== inset.right || cur.bottom !== inset.bottom) set({ stageInset: inset });
  },
  setGpuLost: (gpuLost) => set({ gpuLost }),
}));

/** Result of the most recent photon once it has finished its flight. */
export interface ShotResult {
  deflection: number;
  captured: boolean;
  impact: number;
  mass: number;
}

/** Samples kept for the clock graph (one every CLOCK_SAMPLE_SECONDS). */
export const CLOCK_SAMPLES = 160;
export const CLOCK_SAMPLE_SECONDS = 0.25;

/**
 * Mutable per-frame simulation values. These change every frame, so they live
 * outside React: SimDriver advances them once per frame, every scene component
 * reads them, and the HUD samples them a few times per second.
 */
export const sim = {
  /** Smoothed (animated) mass in [0,1]. */
  m: DEFAULT_MASS / 100,
  /** Simulation time step for this frame (0 while paused), shared by every animation. */
  dt: 0,
  /** Seconds along the Miraj timeline (see physics.ts). */
  mirajTime: 0,
  /** Seven skies separation 0..1 and fold 0..1, derived from mirajTime. */
  expand: 0,
  fold: 0,
  /** Proper time elapsed on each clock, in seconds. */
  clockA: 0,
  clockB: 0,
  /** Current tick-rate of Clock B relative to Clock A. */
  rateB: 1,
  /** Clock history for the graph: Clock A and Clock B readings, oldest first. */
  historyA: new Float32Array(CLOCK_SAMPLES),
  historyB: new Float32Array(CLOCK_SAMPLES),
  historyCount: 0,
  historyTimer: 0,
  /** Most recent completed photon flight (null = none yet). */
  lastShot: null as ShotResult | null,
  /** A photon is in flight on the grid. */
  photonFlying: false,
  /** Completed transits through the tunnel, and whether one is in progress. */
  transits: 0,
  transitActive: false,
  /** Highest sky the tunnel light has passed during the current transit (-1 = none). */
  skyPassed: -1,
};

/** Clear the clock readings and their history. */
export function resetClockState() {
  sim.clockA = 0;
  sim.clockB = 0;
  sim.historyCount = 0;
  sim.historyTimer = 0;
}
