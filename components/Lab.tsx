"use client";

import { useEffect, useRef } from "react";
import { anchors, stageRect } from "@/lib/anchors";
import { cameraApi } from "@/lib/camera";
import { formatRate } from "@/lib/format";
import { useReducedMotion, useSimValue, useWideLayout } from "@/lib/hooks";
import { curvatureLevel, dilationFactor } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";
import { useShortcuts } from "@/lib/useShortcuts";
import Scene from "./scene/Scene";
import { ClockStrip } from "./ui/ClockStrip";
import { Console } from "./ui/Console";
import { CRTOverlay } from "./ui/CRTOverlay";
import { Dialogs } from "./ui/Dialogs";
import { MirajCaption } from "./ui/MirajCaption";
import { Announcer, GpuLostOverlay, LoadingOverlay, TourCard, TourDriver, Welcome } from "./ui/Overlays";
import { SceneLabels } from "./ui/SceneLabels";
import { Header, ResetAllButton, TimeControls, Toolbar, ViewButtons } from "./ui/StageControls";

/**
 * Screen layout. The 3D view fills the window; its overlays (title, menu,
 * captions, time controls, reset) stay inside the area the console leaves
 * free; the console is a side panel on wide screens and a bottom sheet on
 * phones. Layers, bottom to top: 3D view · scanlines · scene labels ·
 * overlays · console · dialogs. Overlays flow (and wrap) rather than sit at
 * fixed offsets, so nothing collides at large text sizes: the captions sit
 * under the title row and are clipped above the time controls on short views;
 * on phones Reset all moves into the menu.
 */
export default function Lab() {
  useShortcuts();
  useDocumentSettings();
  const wide = useWideLayout();
  const inset = useLab((s) => s.stageInset);
  const panelOpen = useLab((s) => s.panelOpen);
  // On phones the tour card on the 3D view needs the room: the toast and time controls step aside while it shows.
  const tourOnPhoneStage = useLab((s) => s.tour.active) && !panelOpen && !wide;
  const titleRow = useTitleRowBound();
  const captions = useShowWholeOrHide();

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-navy">
      <Stage />
      <CRTOverlay />
      <SceneLabels />

      <div
        className="pointer-events-none absolute top-0 left-0 z-30 transition-[right,bottom] duration-300"
        style={{ right: inset.right, bottom: inset.bottom }}
      >
        {/*
          One column: title row, captions (they take what is left, shown whole or not at all),
          then status, tour card and time controls.
        */}
        <div className="absolute inset-3 flex flex-col items-center gap-2">
          <div ref={titleRow} className="flex w-full shrink-0 items-start justify-between gap-3">
            <Header compact={!wide} />
            <Toolbar compact={!wide} />
          </div>
          <div ref={captions} className="flex min-h-0 w-full flex-1 items-start justify-center overflow-y-clip">
            <TopCentre compact={!wide} />
          </div>
          {/* When space runs out the tour card scrolls inside itself; the time controls never leave the view. */}
          <div className="@container flex min-h-0 w-full flex-col items-center gap-2">
            <Announcer toast={!tourOnPhoneStage} />
            {!panelOpen && <TourCard placement="stage" />}
            {wide ? (
              // Views · time · reset in one row when there is room, otherwise the views on a row of their own.
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-3 gap-y-2">
                <div className="col-span-3 @min-[46rem]:col-span-1">
                  <ViewButtons />
                </div>
                <div className="col-start-2">
                  <TimeControls />
                </div>
                <div className="flex justify-end">
                  <ResetAllButton />
                </div>
              </div>
            ) : (
              !tourOnPhoneStage && <TimeControls />
            )}
          </div>
        </div>
      </div>

      <Console />
      <TourDriver />
      <Dialogs />
      <Welcome />
      <LoadingOverlay />
      <GpuLostOverlay />
    </main>
  );
}

/** The focusable 3D view: arrow keys orbit, +/− zoom and Home resets the camera while it has focus. */
function Stage() {
  const setView = useLab((s) => s.setView);
  const inset = useLab((s) => s.stageInset);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Leave browser zoom (Ctrl/Cmd + and −) and history (Alt+←) alone.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = Math.PI / 12;
    switch (e.key) {
      case "ArrowLeft":
        cameraApi.orbit(-step, 0);
        break;
      case "ArrowRight":
        cameraApi.orbit(step, 0);
        break;
      case "ArrowUp":
        cameraApi.orbit(0, -step * 0.7);
        break;
      case "ArrowDown":
        cameraApi.orbit(0, step * 0.7);
        break;
      case "+":
      case "=":
        cameraApi.zoom(0.85);
        break;
      case "-":
      case "_":
        cameraApi.zoom(1.18);
        break;
      case "Home":
        setView("overview");
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <section
      data-stage
      tabIndex={0}
      aria-label="3D simulation view. Use the arrow keys to rotate, plus and minus to zoom, Home for the overview."
      aria-describedby="scene-desc"
      onKeyDown={onKeyDown}
      className="absolute inset-0"
      // The focus ring (globals.css) traces the part of the view the console leaves free.
      style={{ ["--stage-right" as string]: `${inset.right}px`, ["--stage-bottom" as string]: `${inset.bottom}px` }}
    >
      <Scene />
      <SceneDescription />
    </section>
  );
}

/** A plain-text description of the scene for screen readers, updated on discrete changes only. */
function SceneDescription() {
  const mass = useLab((s) => s.mass);
  const miraj = useLab((s) => s.miraj);
  const rate = formatRate(dilationFactor(mass / 100));
  const text = miraj
    ? "Seven stacked skies fold into a single tunnel, and light rises through all seven."
    : `Central mass ${mass} of 100: curvature ${curvatureLevel(mass).label.toLowerCase()}. ${
        mass > 0 ? "Four bodies orbit the mass." : "With no mass, the bodies fly off in straight lines."
      } Clock B runs at ${rate}% of Clock A's speed.`;
  return (
    <p id="scene-desc" className="sr-only">
      {text}
    </p>
  );
}

/** Context strip under the title: Miraj captions, or the clock dials while the Time tab is open. */
function TopCentre({ compact }: { compact: boolean }) {
  const focus = useLab((s) => s.focus);
  const showSkies = useSimValue(() => sim.expand > 0.001);
  const miraj = useLab((s) => s.miraj);
  if (miraj || showSkies) return <MirajCaption compact={compact} />;
  if (focus === "C") return <ClockStrip compact={compact} />;
  return null;
}

/** Scene labels stay below the title row and menu instead of running under them. */
function useTitleRowBound() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const update = () => (stageRect.top = row.getBoundingClientRect().bottom);
    const ro = new ResizeObserver(update);
    ro.observe(row);
    update();
    return () => {
      ro.disconnect();
      stageRect.top = 0;
    };
  }, []);
  return ref;
}

/**
 * The captions (clock strip, Miraj steps) get the space left between the
 * title row and the time controls. A caption cut down to a sliver looks
 * broken, so it is shown whole or not at all; the console has the same
 * information.
 */
function useShowWholeOrHide() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const ro = new ResizeObserver(() => check());
    const check = () => {
      const content = box.firstElementChild as HTMLElement | null;
      if (content) ro.observe(content);
      box.style.visibility = content && content.offsetHeight > box.clientHeight + 2 ? "hidden" : "";
    };
    const mo = new MutationObserver(check);
    mo.observe(box, { childList: true });
    ro.observe(box);
    check();
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return ref;
}

/** Text size, reduced motion and graphics tier are applied to <html> for CSS. */
function useDocumentSettings() {
  const textSize = useLab((s) => s.settings.textSize);
  const tier = useLab((s) => s.tier);
  const reduce = useReducedMotion();
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--text-scale", String(textSize));
    anchors.forEach((a) => (a.width = a.height = 0)); // labels re-measure at the new text size
    html.dataset.reduceMotion = String(reduce);
    html.dataset.tier = tier;
  }, [textSize, tier, reduce]);
}
