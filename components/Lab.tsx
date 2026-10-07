"use client";

import { useEffect } from "react";
import Scene from "./scene/Scene";
import { ControlPanel } from "./ui/ControlPanel";
import { ClockOverlay } from "./ui/ClockOverlay";
import { CRTOverlay } from "./ui/CRTOverlay";
import { FieldNotes } from "./ui/FieldNotes";
import { SkyLabels } from "./ui/SkyLabels";
import { useLab, type ModuleId } from "@/lib/store";

const ORDER: ModuleId[] = ["A", "B", "C", "D"];

export default function Lab() {
  useKeyboardShortcuts();
  const panelOpen = useLab((s) => s.panelOpen);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-navy">
      <Scene />

      {/* DOM overlays pinned to points in the 3D scene (see lib/anchors). */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <ClockOverlay />
        <SkyLabels />
      </div>

      <header className="pointer-events-none absolute top-4 left-4 z-30 select-none">
        <p className="text-[10px] tracking-[0.35em] text-paper/55">TEAM LPPS · PHYSICS &amp; SPIRITUALITY LAB</p>
        <h1 className="mt-1 text-xl font-semibold tracking-[0.18em] text-paper text-glow sm:text-2xl">
          AZEEMI GALA <span className="text-amber">//</span> SPACETIME
        </h1>
        <p className="mt-1 text-[11px] tracking-[0.2em] text-phosphor/80">
          LIVE SIMULATION<span className="blink">_</span>
        </p>
      </header>

      <div
        className={`absolute left-4 z-30 hidden transition-[right] duration-300 md:bottom-4 md:block ${
          panelOpen ? "right-[372px]" : "right-4"
        }`}
      >
        <FieldNotes />
      </div>

      <ControlPanel />
      <CRTOverlay />
    </main>
  );
}

/** Presenter-friendly keyboard shortcuts. */
function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const onInput = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
      const onButton = tag === "BUTTON";
      const s = useLab.getState();
      switch (e.key) {
        case " ":
          if (onInput || onButton) return; // let focused controls handle Space themselves
          e.preventDefault();
          s.firePhoton();
          break;
        case "m":
        case "M":
          s.toggleMiraj();
          break;
        case "r":
        case "R":
          s.resetClocks();
          break;
        case "h":
        case "H":
          s.togglePanel();
          break;
        case "i":
        case "I":
          s.toggleNotes();
          break;
        case "n":
        case "N":
          s.setFocus(ORDER[(ORDER.indexOf(s.focus) + 1) % ORDER.length]);
          break;
        case "ArrowUp":
          if (onInput) return;
          e.preventDefault();
          s.setMass(s.mass + 5);
          break;
        case "ArrowDown":
          if (onInput) return;
          e.preventDefault();
          s.setMass(s.mass - 5);
          break;
        case "0":
          if (onInput) return;
          s.setMass(0);
          break;
        case "9":
          if (onInput) return;
          s.setMass(100);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
