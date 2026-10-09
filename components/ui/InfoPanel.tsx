"use client";

import { useEffect, useRef } from "react";
import { stageRect } from "@/lib/anchors";
import { chapter } from "@/lib/chapters";
import { PANEL_WIDTH, useWideLayout } from "@/lib/hooks";
import { useLab } from "@/lib/store";
import { ChapterInfo } from "./ChapterInfo";
import { CloseIcon } from "./icons";
import { TourCard } from "./Overlays";

/**
 * The chapter notes: a panel on the right on laptops and desktops, a sheet
 * from the bottom on phones. It can be hidden (H) to give the 3D view the
 * whole window; its size is reported so the view centres itself in the rest.
 */
export function InfoPanel() {
  const wide = useWideLayout();
  const open = useLab((s) => s.panelOpen);
  const focus = useLab((s) => s.focus);
  const setPanelOpen = useLab((s) => s.setPanelOpen);
  const setStageInset = useLab((s) => s.setStageInset);
  const ref = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // What the panel covers, for the camera's offset and the scene labels.
  useEffect(() => {
    const el = ref.current;
    const update = () => {
      const inset =
        !el || !open
          ? { right: 0, bottom: 0 }
          : wide
            ? { right: Math.max(0, window.innerWidth - el.offsetLeft), bottom: 0 }
            : { right: 0, bottom: Math.max(0, window.innerHeight - el.offsetTop) };
      setStageInset(inset);
      stageRect.right = window.innerWidth - inset.right;
    };
    update();
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [wide, open, setStageInset]);

  // A new chapter starts at the top of its notes.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [focus]);

  // Closing the panel from inside it: keep keyboard focus on the button that reopens it.
  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        if (s.panelOpen || !prev.panelOpen) return;
        if (!ref.current?.contains(document.activeElement)) return;
        requestAnimationFrame(() => document.getElementById("show-notes")?.focus({ preventScroll: true }));
      }),
    [],
  );

  const ch = chapter(focus);
  const header = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule py-2 ps-5 pe-2">
      <p className="kicker" aria-hidden>
        Chapter {ch.number} · {ch.short}
      </p>
      <button
        type="button"
        onClick={() => setPanelOpen(false)}
        aria-label="Hide the chapter notes"
        aria-keyshortcuts="H"
        title="Hide (H)"
        className="flex h-10 w-10 items-center justify-center rounded-full text-body transition-colors hover:bg-white/10 hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11"
      >
        <CloseIcon className="h-4.5 w-4.5" />
      </button>
    </div>
  );
  const body = (
    // Focusable, so the notes can be scrolled from the keyboard even when they hold no buttons.
    <div
      ref={scroller}
      data-notes-scroll
      tabIndex={0}
      role="region"
      aria-labelledby="chapter-heading"
      className="panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <TourCard placement="panel" />
      <div className="px-5 pt-5 pb-6">
        <ChapterInfo id={focus} />
      </div>
    </div>
  );

  if (wide) {
    return (
      <aside
        ref={ref}
        id="info-panel"
        aria-label="Chapter notes"
        hidden={!open}
        // A fixed width (not rem-based), so a large text size does not squeeze the 3D view.
        style={{ width: PANEL_WIDTH }}
        className="absolute top-[calc(var(--nav-bottom,68px)+0.75rem)] right-3 bottom-3 z-30 flex flex-col overflow-hidden rounded-[22px] border border-white/14 bg-panel shadow-[0_8px_30px_rgb(0_0_0/0.3)]"
      >
        {header}
        {body}
      </aside>
    );
  }

  return (
    <aside
      ref={ref}
      id="info-panel"
      aria-label="Chapter notes"
      hidden={!open}
      className="absolute inset-x-0 bottom-0 z-50 flex max-h-[62dvh] flex-col overflow-hidden rounded-t-[22px] border-t border-white/16 bg-panel shadow-[0_-8px_30px_rgb(0_0_0/0.35)]"
    >
      {header}
      {body}
    </aside>
  );
}
