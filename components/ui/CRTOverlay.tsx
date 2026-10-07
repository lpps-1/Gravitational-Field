"use client";

import { useLab } from "@/lib/store";

/**
 * Subtle retro-monitor scanlines over the 3D view only (never over the
 * interface text). Static, with no blend modes; the slow sweep moves by
 * transform only and is dropped on the light graphics tier and with reduced motion.
 */
export function CRTOverlay() {
  const on = useLab((s) => s.settings.crt);
  if (!on) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="crt-scanlines absolute inset-0" />
      <div className="crt-sweep" />
    </div>
  );
}
