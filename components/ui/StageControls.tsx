"use client";

import { VIEWS } from "@/lib/camera";
import { useLab, type ViewName } from "@/lib/store";
import { Button } from "./controls";
import { HelpIcon, KeyboardIcon, LabelIcon, PanelIcon, PauseIcon, PlayIcon, ResetIcon, SettingsIcon, StepIcon, TourIcon } from "./icons";

/** PhET-style time controls: Play/Pause, Step (while paused) and a speed choice. */
export function TimeControls() {
  const paused = useLab((s) => s.paused);
  const speed = useLab((s) => s.speed);
  const togglePause = useLab((s) => s.togglePause);
  const step = useLab((s) => s.step);
  const setSpeed = useLab((s) => s.setSpeed);

  return (
    <div
      role="group"
      aria-label="Time controls"
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-navy-deep/95 p-1.5 shadow-xl"
    >
      <button
        type="button"
        onClick={togglePause}
        aria-label={paused ? "Play" : "Pause"}
        aria-keyshortcuts="P"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-amber bg-amber text-navy-deep hover:bg-[#ffc47d]"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
      <button
        type="button"
        onClick={step}
        disabled={!paused}
        aria-label="Step forward"
        aria-keyshortcuts="."
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-paper hover:border-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        <StepIcon />
      </button>
      <div role="radiogroup" aria-label="Speed" className="flex rounded-full border border-line-strong p-0.5">
        {([1, 0.25] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => setSpeed(s)}
            className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-[background-color,color] ${
              speed === s ? "bg-paper text-navy-deep" : "text-paper-2 hover:text-paper"
            }`}
          >
            {s === 1 ? "Normal" : "Slow ×¼"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The round "Reset all" button (PhET convention), bottom-right of the view. */
export function ResetAllButton() {
  const resetAll = useLab((s) => s.resetAll);
  return (
    <button
      type="button"
      onClick={resetAll}
      aria-label="Reset all"
      aria-keyshortcuts="Alt+Shift+R"
      title="Reset all (Alt+Shift+R)"
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber bg-navy-deep text-amber shadow-xl hover:bg-amber hover:text-navy-deep"
    >
      <ResetIcon className="h-6 w-6" />
    </button>
  );
}

/** Camera presets and the Labels switch. */
export function ViewButtons({ withLabels = false }: { withLabels?: boolean }) {
  const miraj = useLab((s) => s.miraj);
  const setView = useLab((s) => s.setView);
  const labels = useLab((s) => s.settings.labels);
  const updateSettings = useLab((s) => s.updateSettings);
  const views: ViewName[] = miraj ? ["skies", "under", "side"] : ["overview", "top", "side", "clocks"];
  return (
    <div role="group" aria-label="Camera views" className="pointer-events-auto flex flex-wrap items-center gap-1.5">
      <span className="me-1 text-xs font-semibold text-paper-2">View</span>
      {views.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className="min-h-9 rounded-md border border-line-strong bg-navy-deep/95 px-2.5 text-xs font-medium text-paper hover:border-paper pointer-coarse:min-h-11"
        >
          {VIEWS[v].label}
        </button>
      ))}
      {withLabels && (
        <label className="ms-1 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-navy-deep/95 px-2.5 text-xs font-medium text-paper hover:border-paper pointer-coarse:min-h-11">
          <input
            type="checkbox"
            checked={labels}
            onChange={(e) => updateSettings({ labels: e.target.checked })}
            className="h-4 w-4 accent-amber"
            aria-keyshortcuts="L"
          />
          Labels
        </label>
      )}
    </div>
  );
}

/** Title block, top-left of the view. */
export function Header({ compact }: { compact: boolean }) {
  const paused = useLab((s) => s.paused);
  return (
    <header className="pointer-events-none select-none">
      {!compact && <p className="font-mono text-xs tracking-[0.14em] text-paper-2">TEAM LPPS · PHYSICS &amp; REFLECTION LAB</p>}
      <h1 className={`font-mono font-semibold tracking-[0.1em] text-paper ${compact ? "text-base" : "mt-0.5 text-xl"}`}>
        AZEEMI GALA <span className="text-amber">//</span> SPACETIME
      </h1>
      <p className="mt-0.5 font-mono text-xs tracking-[0.12em] text-phosphor" aria-live="off">
        {paused ? (
          "■ PAUSED"
        ) : (
          <>
            ● LIVE SIMULATION<span className="blink">_</span>
          </>
        )}
      </p>
      <p className="mt-1 inline-block rounded border border-line bg-navy-deep/90 px-1.5 py-0.5 text-xs text-paper-2">
        Illustration · not to scale
      </p>
    </header>
  );
}

/** Tour, help, keyboard and settings buttons, top-right of the view. */
export function Toolbar({ compact }: { compact: boolean }) {
  const startTour = useLab((s) => s.startTour);
  const openDialog = useLab((s) => s.openDialog);
  const panelOpen = useLab((s) => s.panelOpen);
  const togglePanel = useLab((s) => s.togglePanel);
  const tourActive = useLab((s) => s.tour.active);
  const labels = useLab((s) => s.settings.labels);
  const updateSettings = useLab((s) => s.updateSettings);
  const item = (label: string, icon: React.ReactNode, onClick: () => void, showText: boolean, extra?: Record<string, string>) => (
    <Button
      variant="secondary"
      onClick={onClick}
      aria-label={showText ? undefined : label}
      title={label}
      className="pointer-events-auto bg-navy-deep/95 px-2.5"
      {...extra}
    >
      {icon}
      {showText && <span>{label}</span>}
    </Button>
  );
  return (
    <nav aria-label="Lab menu" className="flex flex-wrap justify-end gap-1.5">
      {!tourActive && item("Guided tour", <TourIcon />, startTour, !compact, { "aria-keyshortcuts": "T" })}
      <Button
        variant="secondary"
        onClick={() => updateSettings({ labels: !labels })}
        aria-pressed={labels}
        aria-keyshortcuts="L"
        title="Labels in the 3D view (L)"
        className={`pointer-events-auto px-2.5 ${labels ? "border-amber bg-[#3a2c14]" : "bg-navy-deep/95"}`}
      >
        <LabelIcon />
        {!compact && <span>Labels</span>}
        {compact && <span className="sr-only">Labels</span>}
      </Button>
      {item("About", <HelpIcon />, () => openDialog("about"), false)}
      {!compact && item("Keyboard shortcuts", <KeyboardIcon />, () => openDialog("keys"), false, { "aria-keyshortcuts": "?" })}
      {item("Settings", <SettingsIcon />, () => openDialog("settings"), false)}
      {!compact &&
        !panelOpen &&
        item("Show controls", <PanelIcon />, togglePanel, true, {
          "aria-controls": "console",
          "aria-expanded": "false",
          "aria-keyshortcuts": "H",
        })}
    </nav>
  );
}
