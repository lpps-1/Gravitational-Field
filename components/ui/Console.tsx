"use client";

import { useEffect, useRef } from "react";
import { stageRect } from "@/lib/anchors";
import { useWideLayout } from "@/lib/hooks";
import { AIM_MAX, AIM_MIN, curvatureLevel } from "@/lib/physics";
import { useLab } from "@/lib/store";
import { Button, Kbd, SectionTitle, Slider, Switch } from "./controls";
import { Explain } from "./Explain";
import { TourCard } from "./Overlays";
import { BeamIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from "./icons";
import { ViewButtons } from "./StageControls";

/**
 * The control console: a side panel on laptops and desktops, a bottom sheet
 * on phones and portrait screens. The experiment controls (Central Mass,
 * Fire Photon Beam, Engage Miraj) stay at the top; the explanation tabs
 * scroll underneath. Its size is reported so the 3D view can centre itself
 * in the space that is left.
 */
export function Console() {
  const wide = useWideLayout();
  const open = useLab((s) => s.panelOpen);
  const togglePanel = useLab((s) => s.togglePanel);
  const setStageInset = useLab((s) => s.setStageInset);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const inset = wide
        ? { right: open ? Math.round(window.innerWidth - r.left) : 0, bottom: 0 }
        : { right: 0, bottom: Math.max(0, Math.round(window.innerHeight - r.top)) };
      setStageInset(inset);
      // Scene labels are hidden rather than drawn under the console.
      stageRect.right = window.innerWidth - inset.right;
      stageRect.bottom = window.innerHeight - inset.bottom;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    const t = window.setTimeout(update, 350); // after the open/close transition
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.clearTimeout(t);
    };
  }, [wide, open, setStageInset]);

  if (wide) {
    return (
      <aside
        ref={ref}
        id="console"
        aria-label="Controls and explanations"
        inert={!open}
        className={`fixed top-3 right-3 bottom-3 z-40 flex w-[23.75rem] flex-col overflow-hidden rounded-xl border border-line bg-navy-deep shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
        }`}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line ps-4 pe-1">
          <p className="font-mono text-sm font-semibold tracking-[0.08em] text-paper">CONTROLS</p>
          <Button variant="ghost" onClick={togglePanel} aria-controls="console" aria-expanded={open} aria-keyshortcuts="H">
            Hide <Kbd>H</Kbd>
            <CloseIcon className="h-4 w-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <TourCard placement="panel" />
          <Experiment />
          <Explain />
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={ref}
      id="console"
      aria-label="Controls and explanations"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[62dvh] flex-col rounded-t-xl border-t border-line bg-navy-deep shadow-2xl"
    >
      <button
        type="button"
        onClick={togglePanel}
        aria-controls="console-body"
        aria-expanded={open}
        className="flex min-h-12 shrink-0 items-center justify-between px-4 text-sm font-semibold text-paper"
      >
        <span className="font-mono tracking-[0.08em]">CONTROLS &amp; EXPLANATIONS</span>
        {open ? <ChevronDownIcon /> : <ChevronUpIcon />}
        <span className="sr-only">{open ? "Collapse" : "Expand"}</span>
      </button>
      <div id="console-body" hidden={!open} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line">
        <TourCard placement="panel" />
        <Experiment />
        <div className="border-b border-line px-4 py-3">
          <ViewButtons withLabels />
        </div>
        <Explain />
      </div>
    </aside>
  );
}

function Experiment() {
  const mass = useLab((s) => s.mass);
  const aim = useLab((s) => s.aim);
  const miraj = useLab((s) => s.miraj);
  const setMass = useLab((s) => s.setMass);
  const setAim = useLab((s) => s.setAim);
  const setMiraj = useLab((s) => s.setMiraj);
  const fire = useLab((s) => s.firePhoton);
  const level = curvatureLevel(mass);

  return (
    <section aria-labelledby="experiment-title" className="space-y-4 border-b border-line px-4 py-4">
      <SectionTitle id="experiment-title">Experiment</SectionTitle>

      <div>
        <Slider
          id="mass"
          label="Central mass"
          value={mass}
          min={0}
          max={100}
          step={1}
          onChange={setMass}
          disabled={miraj}
          display={`${mass}`}
          valueText={`${mass} of 100, curvature ${level.label.toLowerCase()}`}
          ticks={[
            { at: 0, label: "0 · none" },
            { at: 50, label: "50" },
            { at: 100, label: "100 · extreme" },
          ]}
        />
        <div className="mt-2 flex items-center gap-2 text-xs text-paper-2" aria-hidden>
          <span>Curvature</span>
          <span className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`h-1.5 flex-1 rounded-full ${level.level >= n ? "bg-amber" : "bg-line"}`} />
            ))}
          </span>
          <span className="w-16 text-end font-medium text-paper">{level.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="primary" className="w-full text-[0.9375rem] font-semibold" onClick={fire} aria-keyshortcuts="Space">
          <BeamIcon />
          {miraj ? "Send light through the tunnel" : "Fire photon beam"}
          <Kbd>Space</Kbd>
        </Button>
        <Slider
          id="aim"
          label="Aim: distance from the centre"
          value={aim}
          min={AIM_MIN}
          max={AIM_MAX}
          step={0.1}
          onChange={setAim}
          disabled={miraj}
          display={aim.toFixed(1)}
          valueText={`${aim.toFixed(1)} grid squares from the centre`}
          fillColor="var(--color-line-strong)"
          ticks={[
            { at: AIM_MIN, label: "close" },
            { at: AIM_MAX, label: "far" },
          ]}
        />
      </div>

      <Switch
        checked={miraj}
        onChange={setMiraj}
        label="Engage Miraj · Spacetime fold"
        description="Seven skies fold into one tunnel"
        shortcut="M"
        keyshortcuts="M"
      />
      {miraj && <p className="text-xs text-paper-3">Mass and aim are paused while the seven skies are shown.</p>}
    </section>
  );
}
