"use client";

import { useEffect, useState } from "react";
import { chapter } from "@/lib/chapters";
import { useLab, type ModuleId } from "@/lib/store";

/**
 * When a chapter opens, its name shows large over the 3D view for a moment,
 * like a title card. Decorative: the change is announced to screen readers
 * by the store. Not shown during the tour, whose card says the same.
 */
export function ChapterTitle() {
  const [shown, setShown] = useState<{ id: ModuleId; key: number } | null>(null);

  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        if (s.focus === prev.focus || s.tour.active || !s.ready || s.welcome) return;
        setShown({ id: s.focus, key: performance.now() });
      }),
    [],
  );

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), 2900);
    return () => window.clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const ch = chapter(shown.id);
  return (
    <div
      key={shown.key}
      aria-hidden
      className="chapter-title pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center [text-shadow:0_2px_28px_rgb(0_0_0/0.75)]"
    >
      <p className="kicker text-ice">Chapter {ch.number}</p>
      <p className="mt-2 font-display text-[clamp(2rem,5vw,3.5rem)] leading-none font-extrabold tracking-[-0.01em] text-ink">{ch.short}</p>
    </div>
  );
}
