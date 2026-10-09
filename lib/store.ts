import { create } from "zustand";
import { AIM_DEFAULT, AIM_MAX, AIM_MIN } from "./physics";
import { CHAPTERS, stageOf, type Stage } from "./chapters";
import { resolveTier, type QualityMode, type Tier } from "./quality";

export type { QualityMode, Tier };

/** Chapters: A curved space · B bending light · C slow clocks · S Solar System · H black hole · D seven skies. */
export type ModuleId = "A" | "B" | "C" | "S" | "H" | "D";
export type ViewName =
  | "overview"
  | "top"
  | "side"
  | "clocks"
  | "skies"
  | "under"
  | "solar"
  | "solarTop"
  | "planet"
  | "bh"
  | "bhTop";
/** Bodies of the Solar System chapter. */
export type BodyId = "sun" | "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";
/** Solar System clock rates, in days per real second. */
export const SOLAR_SPEEDS = [1, 7, 30, 365] as const;
export type SolarSpeed = (typeof SOLAR_SPEEDS)[number];
/** Black hole chapter: the hovering clock's distance from the centre, in horizon radii. */
export const BH_RADIUS_MIN = 1.01;
export const BH_RADIUS_MAX = 20;
export const BH_RADIUS_DEFAULT = 1.5;
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
  crt: false,
  shortcuts: true,
  textSize: 1,
};

/** Bumped when a default changes in a way saved settings should follow (2: scanlines off by default). */
const SETTINGS_VERSION = 2;

export const DEFAULT_MASS = 55;
const SETTINGS_KEY = "spacetime-lab:settings:v1";

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const { v, ...saved } = JSON.parse(raw) as Partial<Settings> & { v?: number };
    // Settings saved before the redesign still had the retro scanlines on.
    if ((v ?? 1) < 2) delete saved.crt;
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, v: SETTINGS_VERSION }));
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
  /** The chapter on show (explanation, controls, and the 3D stage). */
  focus: ModuleId;
  /** Solar System chapter. */
  solarSpeed: SolarSpeed;
  solarFocus: BodyId | null;
  /** Increments for "Back to today". */
  solarResets: number;
  /** Black hole chapter. */
  bhRadius: number;
  /** Fast-forward the three clocks (one year per ten seconds). */
  bhTimelapse: boolean;
  /** Increments to set the three clocks to zero. */
  bhResets: number;
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
  /** Open a chapter from the navigation: shows its stage and flies to its view. */
  goToChapter: (id: ModuleId) => void;
  setSolarSpeed: (speed: SolarSpeed) => void;
  setSolarFocus: (body: BodyId | null) => void;
  resetSolar: () => void;
  setBhRadius: (r: number) => void;
  setBhTimelapse: (on: boolean) => void;
  resetBhClocks: () => void;
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
  solarSpeed: 7,
  solarFocus: null,
  solarResets: 0,
  bhRadius: BH_RADIUS_DEFAULT,
  bhTimelapse: false,
  bhResets: 0,
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
    // Shots fired behind the loading screen would be hidden again by the shader warm-up;
    // the photon beam lives on the lab stage only.
    if (!get().ready || stageOf(get().focus) !== "lab") return;
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
      solarSpeed: 7,
      solarFocus: null,
      solarResets: s.solarResets + 1,
      bhRadius: BH_RADIUS_DEFAULT,
      bhTimelapse: false,
      bhResets: s.bhResets + 1,
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
  goToChapter: (id) => {
    const s = get();
    const ch = CHAPTERS.find((c) => c.id === id)!;
    // The Miraj belongs to its own chapter: opening it engages the Miraj, leaving it folds the skies away.
    const miraj = id === "D";
    set({ focus: id, miraj, view: { name: ch.view, nonce: s.view.nonce + 1 }, solarFocus: id === "S" ? s.solarFocus : null });
    const engaged = miraj && !s.miraj ? " Miraj engaged: the seven skies are separating." : "";
    if (s.focus !== id || engaged) get().announce(`Chapter ${ch.number}: ${ch.short}.${engaged}`);
  },
  setSolarSpeed: (solarSpeed) => {
    if (get().solarSpeed === solarSpeed) return;
    set({ solarSpeed });
    const label = solarSpeed === 1 ? "one day" : solarSpeed === 7 ? "one week" : solarSpeed === 30 ? "one month" : "one year";
    get().announce(`Solar System clock: ${label} per second.`);
  },
  setSolarFocus: (solarFocus) =>
    set((s) => ({ solarFocus, view: { name: solarFocus ? "planet" : "solar", nonce: s.view.nonce + 1 } })),
  resetSolar: () => {
    set((s) => ({ solarResets: s.solarResets + 1 }));
    get().announce("The planets are back where they are today.");
  },
  setBhRadius: (r) => set({ bhRadius: Math.round(Math.max(BH_RADIUS_MIN, Math.min(BH_RADIUS_MAX, r)) * 100) / 100 }),
  setBhTimelapse: (bhTimelapse) => {
    if (get().bhTimelapse === bhTimelapse) return;
    set({ bhTimelapse });
    get().announce(bhTimelapse ? "Time-lapse on: one year every ten seconds." : "Time-lapse off: real time.");
  },
  resetBhClocks: () => {
    set((s) => ({ bhResets: s.bhResets + 1 }));
    get().announce("The three clocks are set to zero.");
  },
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
  /** The stage on show; lab objects skip their per-frame work on the others. */
  stage: "lab" as Stage,
  /** Solar System date, in days since J2000.0 (2000-01-01 12:00 TT). */
  solarDay: daysSinceJ2000(new Date()),
  /** The three clocks of the black hole chapter, in seconds of their own time. */
  bhDeep: 0,
  bhSun: 0,
  bhHole: 0,
};

/** Days since J2000.0 for a calendar date (UTC; the few seconds to TT do not matter here). */
export function daysSinceJ2000(date: Date): number {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86_400_000;
}

/** Clear the clock readings and their history. */
export function resetClockState() {
  sim.clockA = 0;
  sim.clockB = 0;
  sim.historyCount = 0;
  sim.historyTimer = 0;
}
