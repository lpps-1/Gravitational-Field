"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLab } from "./store";

/* ------------------------------------------------------------------------ */
/* Live values from the per-frame `sim` object                              */
/* ------------------------------------------------------------------------ */

const subscribers = new Set<() => void>();
let timer = 0;

function subscribeTicker(callback: () => void) {
  subscribers.add(callback);
  if (!timer) timer = window.setInterval(() => subscribers.forEach((f) => f()), 125);
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
}

/**
 * Subscribe a component to a value derived from the per-frame `sim` object,
 * re-checked 8 times a second. Return a primitive (usually a formatted string)
 * so React skips the re-render whenever the visible value hasn't changed.
 */
export function useSimValue<T extends string | number | boolean | null>(select: () => T): T {
  return useSyncExternalStore(subscribeTicker, select, select);
}

/** Run `callback` on every ticker beat (8 Hz) without re-rendering. */
export function useTicker(callback: () => void) {
  useEffect(() => subscribeTicker(callback), [callback]);
}

/* ------------------------------------------------------------------------ */
/* Motion preference                                                          */
/* ------------------------------------------------------------------------ */

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/** True when the OS asks for reduced motion or the in-app setting is on. */
export function useReducedMotion(): boolean {
  const os = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );
  const app = useLab((s) => s.settings.reduceMotion);
  return os || app;
}

/** Non-hook version for use inside frame loops. */
export function prefersReducedMotion(): boolean {
  return useLab.getState().settings.reduceMotion || window.matchMedia(REDUCE_QUERY).matches;
}

/* ------------------------------------------------------------------------ */
/* Layout                                                                     */
/* ------------------------------------------------------------------------ */

/** Desktop layout (side console) vs. compact layout (bottom sheet). */
const WIDE_QUERY = "(min-width: 1024px) and (min-aspect-ratio: 1/1)";

export function useWideLayout(): boolean {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

export function isWideLayout(): boolean {
  return window.matchMedia(WIDE_QUERY).matches;
}

/** Console width on wide layouts (px; fixed, so a large text size does not squeeze the 3D view). */
export const CONSOLE_WIDTH = 380;
