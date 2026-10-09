"use client";

import { VIEWS } from "@/lib/camera";
import { chapter } from "@/lib/chapters";
import { useLab, type Speed, type ViewName } from "@/lib/store";
import { CHAPTER_UI } from "./chapters";
import { Segmented } from "./controls";
import { CheckIcon, EyeIcon, PauseIcon, PlayIcon, ResetIcon, StepIcon } from "./icons";
import { Popover, PopoverItem } from "./Popover";

/**
 * The dock at the foot of the 3D view: time on the left, the chapter's own
 * controls in the middle, the camera views and Reset all on the right. When
 * the view is narrow (or the text large) the chapter's controls take a row
 * of their own, below the rest.
 */
export function Dock() {
  const focus = useLab((s) => s.focus);
  const { Dock: ChapterControls } = CHAPTER_UI[focus];
  return (
    <div
      role="group"
      aria-label="Simulation controls"
      className="glass pointer-events-auto mx-auto grid w-full max-w-full grid-cols-[auto_auto] items-center justify-between gap-x-3 gap-y-2 rounded-[22px] p-2 @min-[56rem]:flex @min-[56rem]:w-fit @min-[56rem]:gap-x-2"
    >
      {/* Source order is the order of the single row; when narrow, the chapter's controls drop to a row of their own. */}
      <TimeControls className="col-start-1 row-start-1" />
      <div className="col-span-2 row-start-2 flex min-w-0 justify-center px-1 @min-[56rem]:border-x @min-[56rem]:border-rule @min-[56rem]:px-3">
        <ChapterControls />
      </div>
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1">
        <ViewMenu />
        <ResetAllButton />
      </div>
    </div>
  );
}

const SPEEDS: readonly { value: Speed; label: string; name: string }[] = [
  // Names start with the visible text, so voice control can say what it sees (WCAG 2.5.3).
  { value: 1, label: "1×", name: "1×, normal speed" },
  { value: 0.25, label: "¼×", name: "¼×, slow motion at a quarter of normal speed" },
];

/** Play/Pause, Step (while paused) and the speed (PhET-style time controls). */
export function TimeControls({ className = "" }: { className?: string }) {
  const paused = useLab((s) => s.paused);
  const speed = useLab((s) => s.speed);
  const togglePause = useLab((s) => s.togglePause);
  const step = useLab((s) => s.step);
  const setSpeed = useLab((s) => s.setSpeed);
  return (
    <div role="group" aria-label="Time" className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={togglePause}
        aria-label={paused ? "Play" : "Pause"}
        aria-keyshortcuts="P"
        title={`${paused ? "Play" : "Pause"} (P)`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-page transition-colors hover:bg-[#dfe9fb] pointer-coarse:h-11 pointer-coarse:w-11"
      >
        {paused ? <PlayIcon className="h-4.5 w-4.5" /> : <PauseIcon className="h-4.5 w-4.5" />}
      </button>
      {paused && (
        <button
          type="button"
          onClick={step}
          aria-label="Step forward"
          aria-keyshortcuts="."
          title="Step forward (.)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors hover:border-white pointer-coarse:h-11 pointer-coarse:w-11"
        >
          <StepIcon className="h-4 w-4" />
        </button>
      )}
      <Segmented label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} />
    </div>
  );
}

/** Camera presets for the chapter on show, and the Labels switch. */
function ViewMenu() {
  const focus = useLab((s) => s.focus);
  const miraj = useLab((s) => s.miraj);
  const view = useLab((s) => s.view.name);
  const labels = useLab((s) => s.settings.labels);
  const ch = chapter(focus);
  // The seven skies chapter shows the gravity well until the Miraj is engaged.
  const views: ViewName[] = focus === "D" && !miraj ? chapter("A").views : ch.views;

  const choose = (v: ViewName) => {
    const lab = useLab.getState();
    // A preset view stops following a planet.
    if (lab.solarFocus) lab.setSolarFocus(null);
    lab.setView(v);
  };

  return (
    <Popover
      placement="top-end"
      trigger={() => (
        <>
          <EyeIcon className="h-4.5 w-4.5" />
          <span className="hidden @min-[64rem]:inline">View</span>
          <span className="sr-only @min-[64rem]:hidden">Camera view and labels</span>
        </>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pt-1.5 pb-1 kicker text-[0.6875rem]">Camera</p>
          {views.map((v) => (
            <PopoverItem
              key={v}
              current={view === v}
              onClick={() => {
                choose(v);
                close();
              }}
            >
              {VIEWS[v].label}
            </PopoverItem>
          ))}
          <div className="my-1.5 h-px bg-rule" />
          <PopoverItem
            aria-pressed={labels}
            aria-keyshortcuts="L"
            hint={<kbd>L</kbd>}
            onClick={() => useLab.getState().updateSettings({ labels: !labels })}
          >
            <span aria-hidden className={`flex h-4 w-4 items-center justify-center rounded border ${labels ? "border-ice bg-ice text-page" : "border-rule-strong"}`}>
              {labels && <CheckIcon className="h-3 w-3" />}
            </span>
            Labels in the view
          </PopoverItem>
        </>
      )}
    </Popover>
  );
}

/** Reset all (PhET convention: a round arrow at the right of the time controls). */
export function ResetAllButton() {
  const resetAll = useLab((s) => s.resetAll);
  return (
    <button
      type="button"
      onClick={resetAll}
      aria-label="Reset all"
      aria-keyshortcuts="Alt+Shift+Backspace"
      title="Reset all (Alt+Shift+Backspace)"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors hover:border-white hover:bg-white/10 pointer-coarse:h-11 pointer-coarse:w-11"
    >
      <ResetIcon className="h-4.5 w-4.5" />
    </button>
  );
}
