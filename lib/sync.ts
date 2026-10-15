import type * as THREE from "three";
import { CLOCK_SAMPLES, sim, useLab, type ShotResult } from "./store";

/**
 * Presenter / TV sync between two windows of the same browser, over a
 * BroadcastChannel (no server, no network):
 *
 * - `?mode=control`: this window drives. Every change to the lab's state is
 *   broadcast, and the camera (position, rotation, zoom, orbit target) with
 *   the simulation clocks every frame.
 * - `?mode=display`: this window mirrors. It applies what the controller
 *   sends, ignores local input and hides the pointer. When it opens it asks
 *   the controller for the whole current state, so it starts in step.
 * - no mode: nothing is sent or received; the lab works on its own.
 *
 * The state itself is synced (the store and the `sim` clocks), not input
 * events. The counters that stand for events (fire, reset, step…) are sent
 * as changes, and a display applies each as one event of its own: a display
 * that joins late takes the controller's state without replaying its past.
 */

export type SyncMode = "control" | "display";

/** This window's role, from `?mode=`; null when the window works on its own. */
export const syncMode: SyncMode | null = readMode();

function readMode(): SyncMode | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "control" || mode === "display" ? mode : null;
}

const CHANNEL = "spacetime-lab:sync";
/** A display says it is there this often; the controller's badge shows it as connected for a little longer. */
const HEARTBEAT_MS = 2000;
const CONNECTED_MS = 5000;

type LabState = ReturnType<typeof useLab.getState>;
type Patch = Partial<LabState>;

/** Store fields that belong to each window: loading, graphics level, layout, GPU state. */
const LOCAL_KEYS = new Set<string>(["ready", "tier", "resolution", "stageInset", "gpuLost"]);
/** Counters that stand for events: sent as changes, never as values. */
const EVENT_KEYS = ["photonShots", "pathClears", "clockResets", "resets", "steps", "solarResets", "bhResets"] as const;
type EventKey = (typeof EVENT_KEYS)[number];
/** Not part of a state snapshot: the event counters, and the last status message (re-announced, not replayed). */
const NOT_STATE = new Set<string>([...EVENT_KEYS, "announcement"]);
/** Simulation clocks sent with every frame: planet positions, the Miraj timeline, the clocks of chapters 3 and 5. */
const FRAME_SIM = ["solarDay", "mirajTime", "clockA", "clockB", "bhDeep", "bhSun", "bhHole"] as const;

interface SimSnapshot {
  clocks: number[];
  lastShot: ShotResult | null;
  transits: number;
  historyA: Float32Array;
  historyB: Float32Array;
  historyCount: number;
  historyTimer: number;
}

type Message =
  /** Display → controller: I have just opened, send me everything. */
  | { type: "hello" }
  /** Display → controller: still here (for the badge). */
  | { type: "here" }
  /** Controller → displays: the whole state, on request and whenever the controller (re)opens. */
  | { type: "full"; state: Patch; sim: SimSnapshot }
  /** Controller → displays: what changed. */
  | { type: "state"; patch: Patch; events: Partial<Record<EventKey, number>>; announcement?: string }
  /** Controller → displays, every frame: camera (position xyz, quaternion xyzw, zoom, target xyz) and the FRAME_SIM clocks. */
  | { type: "frame"; camera: number[]; sim: number[] };

let channel: BroadcastChannel | null = null;
/** Latest camera pose received by a display (see `Message.frame`). */
let pose: number[] | null = null;
/** When a display last said it was there (controller only). */
let displaySeen = Number.NEGATIVE_INFINITY;

/**
 * Open the channel for this window's role. Returns the cleanup; with no
 * mode it does nothing at all.
 */
export function startSync(): () => void {
  if (!syncMode) return () => {};
  const ch = new BroadcastChannel(CHANNEL);
  channel = ch;
  const cleanup = syncMode === "control" ? startControl(ch) : startDisplay(ch);
  return () => {
    cleanup();
    ch.close();
    if (channel === ch) channel = null;
  };
}

/* ------------------------------------------------------------------------ */
/* Controller                                                                 */
/* ------------------------------------------------------------------------ */

function startControl(ch: BroadcastChannel) {
  const sendFull = () => ch.postMessage({ type: "full", state: snapshot(useLab.getState()), sim: simSnapshot() } satisfies Message);

  ch.onmessage = (e: MessageEvent<Message>) => {
    if (e.data?.type === "hello") sendFull();
    if (e.data?.type === "hello" || e.data?.type === "here") displaySeen = performance.now();
  };

  const unsubscribe = useLab.subscribe((s, prev) => {
    const patch = snapshot(s, prev);
    const events: Partial<Record<EventKey, number>> = {};
    let changed = Object.keys(patch).length > 0;
    for (const k of EVENT_KEYS) {
      if (s[k] === prev[k]) continue;
      events[k] = s[k] - prev[k];
      changed = true;
    }
    const announcement = s.announcement !== prev.announcement ? s.announcement.text : undefined;
    if (!changed && announcement === undefined) return; // only this window's own fields changed
    ch.postMessage({ type: "state", patch, events, announcement } satisfies Message);
  });

  // Displays that opened first catch up as soon as the controller (re)opens.
  sendFull();
  return unsubscribe;
}

/** The shared part of the state: all of it, or (with `prev`) just what changed since. */
function snapshot(s: LabState, prev?: LabState): Patch {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(s) as (keyof LabState)[]) {
    const value = s[key];
    if (typeof value === "function" || LOCAL_KEYS.has(key) || NOT_STATE.has(key)) continue;
    if (prev && prev[key] === value) continue;
    out[key] = value;
  }
  return out as Patch;
}

function simSnapshot(): SimSnapshot {
  return {
    clocks: FRAME_SIM.map((k) => sim[k]),
    lastShot: sim.lastShot,
    transits: sim.transits,
    historyA: sim.historyA,
    historyB: sim.historyB,
    historyCount: sim.historyCount,
    historyTimer: sim.historyTimer,
  };
}

const outPose: number[] = new Array(11).fill(0);
const outClocks: number[] = new Array(FRAME_SIM.length).fill(0);

/** Controller, every frame (after the camera has moved): send the camera and the clocks. */
export function sendFrame(camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
  if (!channel || syncMode !== "control") return;
  camera.position.toArray(outPose, 0);
  camera.quaternion.toArray(outPose, 3);
  outPose[7] = camera.zoom;
  target.toArray(outPose, 8);
  for (let i = 0; i < FRAME_SIM.length; i++) outClocks[i] = sim[FRAME_SIM[i]];
  channel.postMessage({ type: "frame", camera: outPose, sim: outClocks } satisfies Message);
}

/** Controller: a display window has been heard from recently (for the badge). */
export function displayConnected() {
  return performance.now() - displaySeen < CONNECTED_MS;
}

/* ------------------------------------------------------------------------ */
/* Display                                                                    */
/* ------------------------------------------------------------------------ */

function startDisplay(ch: BroadcastChannel) {
  ch.onmessage = (e: MessageEvent<Message>) => receive(e.data);
  ch.postMessage({ type: "hello" } satisfies Message);
  const heartbeat = window.setInterval(() => ch.postMessage({ type: "here" } satisfies Message), HEARTBEAT_MS);

  // A passive mirror: no pointer (CSS, keyed on this attribute), and keys never reach the lab.
  // Browser keys (F11 for full screen, zoom, reload) still work; Escape cannot close a mirrored dialog.
  const html = document.documentElement;
  html.dataset.sync = "display";
  const swallow = (e: KeyboardEvent) => {
    e.stopImmediatePropagation();
    if (e.key === "Escape") e.preventDefault();
  };
  window.addEventListener("keydown", swallow, true);
  window.addEventListener("keyup", swallow, true);

  return () => {
    window.clearInterval(heartbeat);
    window.removeEventListener("keydown", swallow, true);
    window.removeEventListener("keyup", swallow, true);
    delete html.dataset.sync;
  };
}

function receive(m: Message | undefined) {
  switch (m?.type) {
    case "full":
      applyState(m.state, {});
      applySim(m.sim);
      break;
    case "state":
      applyState(m.patch, m.events, m.announcement);
      break;
    case "frame":
      if (isNumbers(m.camera, 11)) pose = m.camera;
      if (isNumbers(m.sim, FRAME_SIM.length)) FRAME_SIM.forEach((k, i) => (sim[k] = m.sim[i]));
      break;
  }
}

function applyState(patch: Patch, events: Partial<Record<EventKey, number>>, announcement?: string) {
  const local = useLab.getState();
  const next: Record<string, unknown> = { ...patch };
  // This computer keeps its own graphics quality and shortcut setting.
  if (patch.settings) next.settings = { ...patch.settings, quality: local.settings.quality, shortcuts: local.settings.shortcuts };
  for (const k of EVENT_KEYS) {
    const d = events[k];
    if (typeof d === "number" && d > 0) next[k] = local[k] + d;
  }
  if (typeof announcement === "string") next.announcement = { text: announcement, id: local.announcement.id + 1 };
  if (Object.keys(next).length) useLab.setState(next as Patch);
}

function applySim(s: SimSnapshot) {
  if (isNumbers(s.clocks, FRAME_SIM.length)) FRAME_SIM.forEach((k, i) => (sim[k] = s.clocks[i]));
  sim.lastShot = s.lastShot;
  if (Number.isFinite(s.transits)) sim.transits = s.transits;
  if (s.historyA?.length === CLOCK_SAMPLES && s.historyB?.length === CLOCK_SAMPLES && Number.isFinite(s.historyCount)) {
    sim.historyA.set(s.historyA);
    sim.historyB.set(s.historyB);
    sim.historyCount = s.historyCount;
    sim.historyTimer = s.historyTimer;
  }
}

/** Display, every frame: put the camera where the controller's is. Returns false until a pose has arrived. */
export function applyCamera(camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
  const p = pose;
  if (!p) return false;
  camera.position.fromArray(p, 0);
  camera.quaternion.fromArray(p, 3);
  if (camera.zoom !== p[7]) {
    camera.zoom = p[7];
    camera.updateProjectionMatrix();
  }
  target.fromArray(p, 8);
  return true;
}

function isNumbers(a: unknown, length: number): a is number[] {
  return Array.isArray(a) && a.length === length && a.every(Number.isFinite);
}
