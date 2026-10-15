"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { TOUR, enterTourStep } from "@/lib/tour";
import { useLab } from "@/lib/store";
import { syncMode } from "@/lib/sync";
import { Button, Kbd } from "./controls";
import { ArrowRightIcon, CloseIcon } from "./icons";

/** First-load card: start the guided tour or explore freely. */
export function Welcome() {
  const welcome = useLab((s) => s.welcome);
  const ready = useLab((s) => s.ready);
  const startTour = useLab((s) => s.startTour);
  const dismiss = useLab((s) => s.dismissWelcome);
  const ref = useRef<HTMLDialogElement>(null);
  const open = welcome && ready;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={dismiss}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-desc"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-[22px] border border-white/16 bg-panel p-0 text-body shadow-[0_20px_60px_rgb(0_0_0/0.5)]"
    >
      <div className="p-7 max-sm:p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 3 KB mark */}
          <img src="/brand/lpps-logo-white.webp" alt="" width={23} height={32} className="h-8 w-auto" />
          <p className="kicker">Team LPPS · Azeemi Gala</p>
        </div>
        <h2 id="welcome-title" className="mt-5 text-[2rem] leading-[1.1] font-extrabold tracking-[-0.01em] max-sm:text-[1.625rem]">
          Spacetime Lab
        </h2>
        <p id="welcome-desc" className="mt-3 text-base leading-relaxed text-body">
          How gravity shapes space, light and time: from a curved grid to our real Solar System and a black hole, shown alongside
          the Quranic themes of <em>yasbaḥūn</em> and the Miraj.
        </p>
        <ol className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-body max-sm:grid-cols-1" aria-label="Six chapters">
          {CHAPTERS.map((c) => (
            <li key={c.id} className="flex items-baseline gap-2.5">
              <span className="font-mono text-xs text-ice">{c.number}</span>
              {c.short}
            </li>
          ))}
        </ol>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button variant="primary" onClick={startTour} autoFocus className="min-h-12 px-5 text-[0.9375rem]">
            Start the guided tour
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
          <Button onClick={dismiss} className="min-h-12 px-5 text-[0.9375rem]">
            Explore on my own
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">The tour takes about four minutes.</p>
      </div>
    </dialog>
  );
}

/** Where keyboard focus goes when a tour control disappears: the Tour button if it is shown, else the 3D view. */
function tourFallbackFocus(): HTMLElement | null {
  const tour = document.getElementById("start-tour");
  if (tour && tour.offsetParent !== null) return tour;
  return document.querySelector<HTMLElement>("[data-stage]");
}

/** Runs the tour: sets up the scene whenever the step changes. Mount once. */
export function TourDriver() {
  const tour = useLab((s) => s.tour);
  useEffect(() => {
    // A display mirrors the controller, whose tour has already set each step up.
    if (!tour.active || syncMode === "display") return;
    return enterTourStep(tour.step);
  }, [tour.active, tour.step]);

  // Keep keyboard focus when the card's focused button goes away (checked
  // before React re-renders, moved once the change is on screen): Back is
  // disabled on the first step, so go to Next; when the tour ends, go to the
  // Tour button (or the 3D view).
  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        const active = document.activeElement;
        const card = active?.closest("[data-tour-card]");
        if (!card) return;
        let target: () => HTMLElement | null;
        if (prev.tour.active && !s.tour.active) target = tourFallbackFocus;
        else if (s.tour.step === 0 && prev.tour.step !== 0 && active?.hasAttribute("data-tour-back"))
          target = () => card.querySelector<HTMLElement>("[data-tour-next]");
        else return;
        requestAnimationFrame(() => target()?.focus({ preventScroll: true }));
      }),
    [],
  );
  return null;
}

/**
 * The guided tour card: one idea per step, with Back and Next. Shown at the
 * top of the chapter notes or, when they are hidden, floating over the 3D
 * view above the dock.
 */
export function TourCard({ placement }: { placement: "panel" | "stage" }) {
  const tour = useLab((s) => s.tour);
  const panelOpen = useLab((s) => s.panelOpen);
  const endTour = useLab((s) => s.endTour);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const shown = tour.active && (placement === "panel" ? panelOpen : !panelOpen);

  // On the next frame: a dialog that started the tour is closed (and the page outside it inert) until then.
  useEffect(() => {
    if (!shown) return;
    const raf = requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [shown]);

  // Keep the card in view inside the scrolling notes.
  useEffect(() => {
    if (shown && placement === "panel") cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [shown, tour.step, placement]);

  if (!shown) return null;
  const step = TOUR[tour.step];
  const last = tour.step === TOUR.length - 1;
  const go = (i: number) => useLab.getState().setTourStep(Math.max(0, Math.min(TOUR.length - 1, i)));

  return (
    <section
      ref={cardRef}
      data-tour-card
      aria-label="Guided tour"
      className={
        placement === "panel"
          ? "flex scroll-mt-2 flex-col border-b border-rule bg-raised/60 px-5 py-4"
          : // Short of room, only the text scrolls: the step, Exit, Back and Next stay in view.
            "glass pointer-events-auto flex min-h-0 w-full max-w-[34rem] flex-col rounded-[22px] p-4"
      }
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <p className="kicker" aria-live="polite">
          Guided tour · {tour.step + 1} of {TOUR.length}
        </p>
        <button
          type="button"
          onClick={endTour}
          aria-label="Exit the guided tour"
          className="-me-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-body transition-colors hover:bg-white/10 hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11"
        >
          <CloseIcon className="h-4.5 w-4.5" />
        </button>
      </div>
      <div aria-live="polite" className="min-h-0 overflow-y-auto">
        <h2 className="mt-1.5 text-lg leading-snug font-bold">{step.title}</h2>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-body">{step.body}</p>
        {step.look && (
          <p className="mt-2 text-sm leading-relaxed text-ink">
            <span className="font-semibold text-ice">Look: </span>
            {step.look}
          </p>
        )}
        {step.verse && <p className="mt-2 text-sm text-violet-text italic">{step.verse}</p>}
      </div>
      <div className="mt-3.5 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div aria-hidden className="flex flex-1 gap-1">
          {TOUR.map((_, i) => (
            <span
              key={i}
              className={`h-1 max-w-4 flex-1 rounded-full ${i < tour.step ? "bg-ice/55" : i === tour.step ? "bg-white" : "bg-white/16"}`}
            />
          ))}
        </div>
        <div className="ms-auto flex gap-2">
          <Button size="sm" data-tour-back onClick={() => go(tour.step - 1)} disabled={tour.step === 0} aria-keyshortcuts="PageUp">
            Back
          </Button>
          <Button
            ref={nextRef}
            size="sm"
            data-tour-next
            variant="primary"
            onClick={() => (last ? endTour() : go(tour.step + 1))}
            aria-keyshortcuts="PageDown"
          >
            {last ? "Finish" : "Next"}
            <Kbd>PgDn</Kbd>
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * Status messages: announced politely to screen readers (WCAG 4.1.3) and
 * shown briefly as a toast for everyone watching.
 */
export function Announcer({ toast = true }: { toast?: boolean }) {
  const announcement = useLab((s) => s.announcement);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!announcement.id) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(t);
  }, [announcement]);

  return (
    <>
      {/* Keyed by id, so a repeated message is a new node and is announced again. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
      {toast && visible && announcement.text && (
        <p aria-hidden className="glass pointer-events-none max-w-[34rem] rounded-full px-4 py-1.5 text-center text-sm text-ink">
          {announcement.text}
        </p>
      )}
    </>
  );
}

/** Covers the view until every shader is compiled, so nothing stutters on first use. */
export function LoadingOverlay() {
  const ready = useLab((s) => s.ready);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (ready) {
      const t = window.setTimeout(() => setGone(true), 500);
      return () => window.clearTimeout(t);
    }
    // Never block the lab for long, even if warm-up fails.
    const t = window.setTimeout(() => useLab.getState().setReady(), 12000);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (gone) return null;
  return (
    <div
      role="status"
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-page transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 3 KB mark */}
      <img src="/brand/lpps-logo-white.webp" alt="" width={29} height={40} className="h-10 w-auto opacity-90" />
      <p className="kicker text-body">Preparing the lab</p>
      <span aria-hidden className="loading-line" />
    </div>
  );
}

/** Shown if the graphics driver resets the 3D context. */
export function GpuLostOverlay() {
  const lost = useLab((s) => s.gpuLost);
  if (!lost) return null;
  return (
    <div role="alert" className="fixed inset-0 z-[70] flex items-center justify-center bg-page/95 p-6">
      <div className="max-w-md space-y-3 text-center">
        <p className="font-display text-lg font-bold text-ink">The graphics were reset</p>
        <p className="text-sm text-body">This can happen when a laptop switches graphics or wakes from sleep. Reloading restores the lab.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload the lab
        </Button>
      </div>
    </div>
  );
}
