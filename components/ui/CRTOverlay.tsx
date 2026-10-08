"use client";

import { TIERS } from "@/lib/quality";
import { useLab } from "@/lib/store";

/**
 * Subtle retro-monitor scanlines over the 3D view only (never over the
 * interface text). Static, with no blend modes; the slow sweep moves by
 * transform only and is dropped on the light graphics tiers and with reduced
 * motion. When the 3D view has no post-processing pass, the same layer also
 * draws the vignette. Not drawn on the Minimal tier: without graphics
 * acceleration the browser blends every page layer on the processor, and this
 * full-screen layer alone costs about a quarter of the frame rate.
 */
export function CRTOverlay() {
  const on = useLab((s) => s.settings.crt && s.tier !== "cpu");
  const composer = useLab((s) => TIERS[s.tier].bloom && s.settings.glow);
  if (!on) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className={`absolute inset-0 ${composer ? "crt-scanlines" : "crt-vignette"}`} />
      <div className="crt-sweep" />
    </div>
  );
}
