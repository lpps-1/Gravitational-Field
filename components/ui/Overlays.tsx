"use client";

import { useEffect, useRef, useState } from "react";
import { TOUR, enterTourStep } from "@/lib/tour";
import { useLab } from "@/lib/store";
import { Button, Kbd } from "./controls";
import { CloseIcon } from "./icons";

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
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line-strong bg-navy-deep p-0 text-paper shadow-2xl"
    >
      <div className="space-y-4 p-6">
        <p className="font-mono text-xs tracking-[0.14em] text-paper-2">TEAM LPPS · AZEEMI GALA</p>
        <h2 id="welcome-title" className="font-mono text-2xl font-semibold tracking-[0.06em]">
          Spacetime Lab
        </h2>
        <p id="welcome-desc" className="text-[0.9375rem] leading-relaxed text-paper">
          An interactive picture of how gravity shapes <strong>space</strong>, <strong>light</strong> and <strong>time</strong>, shown
          alongside the Quranic themes of <em>yasbaḥūn</em> (bodies floating in their orbits) and the Miraj.
        </p>
        <p className="text-sm text-paper-2">
          The guided tour takes about three minutes. Everything shown is an illustration, not to scale.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button variant="primary" onClick={startTour} autoFocus className="text-[0.9375rem] font-semibold">
            Start the guided tour
          </Button>
          <Button onClick={dismiss}>Explore on my own</Button>
        </div>
      </div>
    </dialog>
  );
}

/** Runs the tour: sets up the scene whenever the step changes. Mount once. */
export function TourDriver() {
  const tour = useLab((s) => s.tour);
  useEffect(() => {
    if (!tour.active) return;
    return enterTourStep(tour.step);
  }, [tour.active, tour.step]);

  // Keep keyboard focus when the card's focused button goes away (checked
  // before React re-renders, moved once the change is on screen): Back is
  // disabled on the first step, so go to Next; when the tour ends, go to the
  // toolbar's "Guided tour" button (or the 3D view).
  useEffect(
    () =>
      useLab.subscribe((s, prev) => {
        const active = document.activeElement;
        const card = active?.closest("[data-tour-card]");
        if (!card) return;
        let target: () => HTMLElement | null;
        if (prev.tour.active && !s.tour.active)
          target = () => document.getElementById("start-tour") ?? document.querySelector<HTMLElement>("[data-stage]");
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
 * The guided tour card: one idea per step, with Back / Next. Shown at the top
 * of the console (so it never covers the scene) or, when the console is
 * hidden, floating over the 3D view.
 */
export function TourCard({ placement }: { placement: "panel" | "stage" }) {
  const tour = useLab((s) => s.tour);
  const endTour = useLab((s) => s.endTour);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  // On the next frame: a dialog that started the tour is closed (and the page outside it inert) until then.
  useEffect(() => {
    if (!tour.active) return;
    const raf = requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [tour.active]);

  // Keep the card in view inside the scrolling console.
  useEffect(() => {
    if (tour.active && placement === "panel") cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [tour.active, tour.step, placement]);

  if (!tour.active) return null;
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
          ? "flex scroll-mt-2 flex-col border-b-2 border-amber bg-[#1b2b4f] px-4 py-4"
          : // Short of room, only the text scrolls: the step, Exit, Back and Next stay in view.
            "pointer-events-auto flex min-h-0 w-full max-w-[34rem] flex-col rounded-xl border border-amber/70 bg-navy-deep/95 p-4 shadow-2xl"
      }
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <p className="font-mono text-xs font-semibold tracking-[0.1em] text-amber" aria-live="polite">
          GUIDED TOUR · STEP {tour.step + 1} OF {TOUR.length}
        </p>
        <button
          type="button"
          onClick={endTour}
          aria-label="Exit the guided tour"
          className="-me-2 -mt-2 flex h-10 w-10 items-center justify-center rounded-md text-paper-2 hover:bg-navy-raised hover:text-paper"
        >
          <CloseIcon />
        </button>
      </div>
      <div aria-live="polite" className="min-h-0 overflow-y-auto">
        <h2 className="mt-1 text-lg font-semibold text-paper">{step.title}</h2>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-paper">{step.body}</p>
        {step.look && <p className="mt-1.5 text-sm text-phosphor">Look: {step.look}</p>}
        {step.verse && <p className="mt-1.5 text-sm italic text-violet-text">{step.verse}</p>}
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div aria-hidden className="flex flex-1 gap-1">
          {TOUR.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 max-w-4 flex-1 rounded-full ${i < tour.step ? "bg-amber/60" : i === tour.step ? "bg-amber" : "bg-line"}`}
            />
          ))}
        </div>
        <div className="ms-auto flex gap-2">
          <Button data-tour-back onClick={() => go(tour.step - 1)} disabled={tour.step === 0} aria-keyshortcuts="PageUp">
            Back
          </Button>
          <Button
            ref={nextRef}
            data-tour-next
            variant="primary"
            onClick={() => (last ? endTour() : go(tour.step + 1))}
            aria-keyshortcuts="PageDown"
          >
            {last ? "Finish" : "Next"} <Kbd>PgDn</Kbd>
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
    const t = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(t);
  }, [announcement]);

  return (
    <>
      {/* Keyed by id, so a repeated message is a new node and is announced again. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <span key={announcement.id}>{announcement.text}</span>
      </p>
      {toast && visible && announcement.text && (
        <p
          aria-hidden
          className="pointer-events-none max-w-[34rem] rounded-lg border border-line-strong bg-navy-deep/95 px-4 py-2 text-center text-sm text-paper shadow-xl"
        >
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
      const t = window.setTimeout(() => setGone(true), 400);
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
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-navy transition-opacity duration-300 ${ready ? "opacity-0" : "opacity-100"}`}
    >
      <p className="font-mono text-sm tracking-[0.2em] text-paper">
        PREPARING THE LAB<span className="blink">_</span>
      </p>
    </div>
  );
}

/** Shown if the graphics driver resets the 3D context. */
export function GpuLostOverlay() {
  const lost = useLab((s) => s.gpuLost);
  if (!lost) return null;
  return (
    <div role="alert" className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/95 p-6">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-lg font-semibold text-paper">The graphics card was reset</p>
        <p className="text-sm text-paper-2">
          This can happen when a laptop switches graphics or wakes from sleep. Reloading restores the lab.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload the lab
        </Button>
      </div>
    </div>
  );
}
