"use client";

import { useEffect } from "react";
import { anchors } from "@/lib/anchors";
import { cameraApi } from "@/lib/camera";
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
 * overlays · console · dialogs.
 */
export default function Lab() {
  useShortcuts();
  useDocumentSettings();
  const wide = useWideLayout();
  const inset = useLab((s) => s.stageInset);
  const panelOpen = useLab((s) => s.panelOpen);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-navy">
      <Stage />
      <CRTOverlay />
      <SceneLabels />

      <div
        className="pointer-events-none absolute top-0 left-0 z-30 transition-[right,bottom] duration-300"
        style={{ right: inset.right, bottom: inset.bottom }}
      >
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
          <Header compact={!wide} />
          <Toolbar compact={!wide} />
        </div>

        <div className={`absolute inset-x-3 flex justify-center ${wide ? "top-[7.25rem]" : "top-[5.5rem]"}`}>
          <TopCentre compact={!wide} />
        </div>

        <div className="absolute inset-x-3 bottom-[4.5rem] flex flex-col items-center gap-2">
          <Announcer />
          {!panelOpen && <TourCard placement="stage" />}
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">{wide && <ViewButtons />}</div>
          <TimeControls />
          <div className="flex flex-1 justify-end">
            <ResetAllButton />
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

  const onKeyDown = (e: React.KeyboardEvent) => {
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
  const rate = Math.round(dilationFactor(mass / 100) * 100);
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
  if (miraj || showSkies) return <MirajCaption />;
  if (focus === "C") return <ClockStrip compact={compact} />;
  return null;
}

/** Text size, reduced motion and graphics tier are applied to <html> for CSS. */
function useDocumentSettings() {
  const textSize = useLab((s) => s.settings.textSize);
  const tier = useLab((s) => s.tier);
  const reduce = useReducedMotion();
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--text-scale", String(textSize));
    anchors.forEach((a) => (a.width = 0)); // labels re-measure at the new text size
    html.dataset.reduceMotion = String(reduce);
    html.dataset.tier = tier;
  }, [textSize, tier, reduce]);
}
