"use client";

import { useEffect, useRef } from "react";
import { anchors, stageRect } from "@/lib/anchors";
import { cameraApi } from "@/lib/camera";
import { chapter, stageOf } from "@/lib/chapters";
import { formatRate } from "@/lib/format";
import { isWideLayout, useReducedMotion, useSimValue, useWideLayout } from "@/lib/hooks";
import { curvatureLevel, dilationFactor } from "@/lib/physics";
import { formatSolarDate } from "@/lib/solar";
import { sim, useLab } from "@/lib/store";
import { useShortcuts } from "@/lib/useShortcuts";
import Scene from "./scene/Scene";
import { ChapterTitle } from "./ui/ChapterTitle";
import { CHAPTER_UI } from "./ui/chapters";
import { CRTOverlay } from "./ui/CRTOverlay";
import { Dialogs } from "./ui/Dialogs";
import { Dock } from "./ui/Dock";
import { InfoPanel } from "./ui/InfoPanel";
import { MirajCaption } from "./ui/MirajCaption";
import { Nav } from "./ui/Nav";
import { Announcer, GpuLostOverlay, LoadingOverlay, TourCard, TourDriver, Welcome } from "./ui/Overlays";
import { SceneLabels } from "./ui/SceneLabels";

/**
 * Screen layout. The 3D view fills the window. Over it: the navigation bar
 * at the top, the chapter notes on the right (a sheet from the bottom on
 * phones), and, in the part of the view they leave free, the chapter's
 * caption at the top and the dock at the bottom. Layers, bottom to top:
 * 3D view · scanlines · scene labels · overlays · navigation and notes ·
 * dialogs. Overlays flow (and wrap) rather than sit at fixed offsets, so
 * nothing collides at large text sizes.
 */
export default function Lab() {
  useShortcuts();
  useDocumentSettings();
  const wide = useWideLayout();
  const inset = useLab((s) => s.stageInset);
  const panelOpen = useLab((s) => s.panelOpen);
  // On phones the notes are a sheet over the dock: the dock is set aside while it shows.
  const sheetOverDock = !wide && panelOpen;
  const navRef = useNavBound();
  const dockRef = useDockBound(sheetOverDock);
  const captions = useShowWholeOrHide();

  useEffect(() => {
    // Phones start with the notes closed, so the first thing seen is the 3D view.
    if (!isWideLayout()) useLab.getState().setPanelOpen(false);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-page">
      {/* Source order is the keyboard order: navigation, the 3D view, its captions and dock, then the notes. */}
      <Nav navRef={navRef} />
      <Stage />
      <CRTOverlay />
      <SceneLabels />

      {/* The part of the view the navigation and the notes leave free. */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 z-30 transition-[right] duration-300"
        style={{ top: "var(--nav-bottom, 68px)", right: wide ? inset.right : 0 }}
      >
        <div className="@container absolute inset-3 flex flex-col items-center gap-2">
          <ScaleNote />
          <div ref={captions} className="flex min-h-0 w-full flex-1 items-start justify-center overflow-y-clip">
            <Caption compact={!wide} />
          </div>
          <ChapterTitle />
          {/* When space runs out the tour card scrolls inside itself; the dock never leaves the view. */}
          <div className="flex min-h-0 w-full flex-col items-center gap-2">
            <Announcer toast={!sheetOverDock} />
            <TourCard placement="stage" />
            <div ref={dockRef} inert={sheetOverDock} className="w-full">
              <Dock />
            </div>
          </div>
        </div>
      </div>

      <InfoPanel />
      <TourDriver />
      <Dialogs />
      <Welcome />
      <LoadingOverlay />
      <GpuLostOverlay />
    </main>
  );
}

/** The focusable 3D view: arrow keys orbit, +/− zoom and Home returns to the chapter's view while it has focus. */
function Stage() {
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
      case "Home": {
        const lab = useLab.getState();
        if (lab.solarFocus) lab.setSolarFocus(null);
        lab.setView(lab.miraj ? "skies" : chapter(lab.focus).view);
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <section
      data-stage
      tabIndex={0}
      aria-label="3D view. Use the arrow keys to rotate, plus and minus to zoom, Home to return to the chapter's view."
      aria-describedby="scene-desc"
      onKeyDown={onKeyDown}
      className="absolute inset-0"
      // The focus ring (globals.css) traces the part of the view the notes leave free.
      style={{ ["--stage-right" as string]: `${inset.right}px`, ["--stage-bottom" as string]: `${inset.bottom}px` }}
    >
      <Scene />
      <SceneDescription />
    </section>
  );
}

/** A plain-text description of the scene for screen readers, updated on discrete changes only. */
function SceneDescription() {
  const focus = useLab((s) => s.focus);
  const mass = useLab((s) => s.mass);
  const miraj = useLab((s) => s.miraj);
  const solarFocus = useLab((s) => s.solarFocus);
  const bhRadius = useLab((s) => s.bhRadius);
  // The date changes by the day, not every frame.
  const date = useSimValue(() => (focus === "S" ? formatSolarDate(sim.solarDay) : ""));
  const stage = stageOf(focus);
  const rate = formatRate(dilationFactor(mass / 100));
  const text =
    stage === "solar"
      ? `The Sun and the eight planets where they are on ${date}, with the asteroid belt between Mars and Jupiter.${
          solarFocus ? ` Following ${solarFocus === "sun" ? "the Sun" : solarFocus[0].toUpperCase() + solarFocus.slice(1)}.` : ""
        }`
      : stage === "blackhole"
        ? `A black hole: a black shadow ringed by a thin bright circle of light, inside a glowing disk of hot gas whose far side is bent into view above and below the hole. Your clock hovers at ${bhRadius.toFixed(2)} horizon radii.`
        : miraj
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

/** The chapter's caption: the Miraj steps while the skies are shown, otherwise the chapter's own. */
function Caption({ compact }: { compact: boolean }) {
  const focus = useLab((s) => s.focus);
  const miraj = useLab((s) => s.miraj);
  const showSkies = useSimValue(() => sim.expand > 0.001);
  if ((miraj || showSkies) && stageOf(focus) === "lab") return <MirajCaption compact={compact} />;
  const Own = CHAPTER_UI[focus].Caption;
  return Own ? <Own compact={compact} /> : null;
}

/** One honest line about scale, at the top left of the view (wider views; the notes say the same on phones). */
function ScaleNote() {
  const focus = useLab((s) => s.focus);
  return (
    <p className="hidden shrink-0 self-start ps-1 text-xs text-body [text-shadow:0_1px_8px_rgb(0_0_0/0.9)] @min-[44rem]:block">
      {chapter(focus).note}
    </p>
  );
}

/**
 * Measures the navigation bar: the notes and the free area start below it
 * (--nav-bottom), and scene labels stay out from under it.
 */
function useNavBound() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const root = document.documentElement;
    const update = () => {
      const bottom = nav.getBoundingClientRect().bottom;
      root.style.setProperty("--nav-bottom", `${Math.round(bottom)}px`);
      stageRect.top = bottom;
    };
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      stageRect.top = 0;
    };
  }, []);
  return ref;
}

/** Scene labels stay above the dock (or the sheet that covers it) instead of running under it. */
function useDockBound(covered: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dock = ref.current;
    if (!dock) return;
    const update = () => {
      // When the sheet covers the dock, the notes' own inset already bounds the labels.
      stageRect.bottom = covered ? window.innerHeight - useLab.getState().stageInset.bottom : dock.getBoundingClientRect().top;
    };
    const ro = new ResizeObserver(update);
    ro.observe(dock);
    window.addEventListener("resize", update);
    const unsubscribe = useLab.subscribe((s, prev) => {
      if (s.stageInset !== prev.stageInset) update();
    });
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      unsubscribe();
      stageRect.bottom = Infinity;
    };
  }, [covered]);
  return ref;
}

/**
 * The captions (clock dials, Miraj steps, three clocks) get the space left
 * between the navigation and the dock. A caption cut down to a sliver looks
 * broken, so it is shown whole or not at all; the notes have the same
 * information.
 */
function useShowWholeOrHide() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const ro = new ResizeObserver(() => check());
    const avoid = stageRect.avoid;
    const check = () => {
      const content = box.firstElementChild as HTMLElement | null;
      if (content) ro.observe(content);
      const shown = !!content && content.offsetHeight <= box.clientHeight + 2;
      box.style.visibility = shown ? "" : "hidden";
      // Scene labels keep clear of the caption.
      const r = shown ? content.getBoundingClientRect() : null;
      avoid.left = r ? r.left - 4 : 0;
      avoid.right = r ? r.right + 4 : 0;
      avoid.top = r ? r.top - 4 : 0;
      avoid.bottom = r ? r.bottom + 4 : 0;
    };
    const mo = new MutationObserver(check);
    mo.observe(box, { childList: true });
    ro.observe(box);
    window.addEventListener("resize", check);
    check();
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", check);
      avoid.left = avoid.right = 0;
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
