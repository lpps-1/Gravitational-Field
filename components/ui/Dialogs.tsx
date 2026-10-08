"use client";

import { useEffect, useId, useRef } from "react";
import { TIERS, graphicsName, probeGraphics } from "@/lib/quality";
import { useLab, type QualityMode, type Settings } from "@/lib/store";
import { Button } from "./controls";
import { CloseIcon } from "./icons";

/**
 * Native <dialog> modals: the browser provides the focus trap, Escape to
 * close and focus return. Only one is open at a time (store.dialog).
 */
function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className={`m-auto max-h-[85dvh] ${wide ? "w-[min(44rem,calc(100vw-2rem))]" : "w-[min(32rem,calc(100vw-2rem))]"} overflow-hidden rounded-xl border border-line-strong bg-navy-deep p-0 text-paper shadow-2xl`}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex items-center justify-between border-b border-line ps-5 pe-2 py-2">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </Button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}

export function Dialogs() {
  const dialog = useLab((s) => s.dialog);
  const close = useLab((s) => s.closeDialog);
  return (
    <>
      <Modal open={dialog === "about"} onClose={close} title="About this lab" wide>
        <About />
      </Modal>
      <Modal open={dialog === "keys"} onClose={close} title="Keyboard shortcuts" wide>
        <Keys />
      </Modal>
      <Modal open={dialog === "settings"} onClose={close} title="Settings">
        <SettingsForm />
      </Modal>
    </>
  );
}

function About() {
  const startTour = useLab((s) => s.startTour);
  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed text-paper">
      <p>
        <strong>Azeemi Gala · Spacetime Lab</strong> by Team LPPS is an interactive picture of how gravity shapes space, light and time,
        shown alongside the Quranic themes of <em>yasbaḥūn</em> (bodies floating in their orbits) and the Miraj.
      </p>
      <h3 className="pt-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper-2">How to use it</h3>
      <ol className="list-decimal space-y-1 ps-5">
        <li>Drag the 3D view to look around; scroll or pinch to zoom. The view buttons jump to useful angles.</li>
        <li>Use the controls: change the central mass, fire light past it, and engage the Miraj.</li>
        <li>The four tabs explain each idea, with live numbers, a colour key and things to try.</li>
        <li>Pause, step or slow time with the controls at the bottom. The round button resets everything.</li>
      </ol>
      <h3 className="pt-1 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper-2">An honest note</h3>
      <p className="text-paper-2">
        This is an illustration, not to scale. The effects are hugely exaggerated so they can be seen: real light passing the Sun bends by
        only 0.0005°, and a clock on Earth loses only about 0.02 s a year to gravity. The “rubber sheet” grid is a teaching analogy;
        traversable wormholes remain theoretical. The verses are shown as themes for reflection, not as scientific proof, and the science is
        not presented as proof of scripture.
      </p>
      <div className="pt-2">
        <Button variant="primary" onClick={startTour}>
          Start the guided tour
        </Button>
      </div>
    </div>
  );
}

const KEYS: [string, string][] = [
  ["Space", "Fire the photon beam (through the tunnel during the Miraj)"],
  ["M", "Engage or disengage the Miraj"],
  ["P", "Play or pause"],
  [".", "Step forward while paused"],
  ["S", "Switch between normal speed and slow motion"],
  ["R", "Synchronise the clocks"],
  ["[ and ]", "Central mass down or up by 5"],
  ["0 and 9", "Central mass to 0 or 100"],
  ["L", "Show or hide the labels"],
  ["H", "Hide or show the controls"],
  ["T", "Start the guided tour"],
  ["Page Down / Page Up", "Next or previous tour step (works with presentation clickers)"],
  ["?", "Open this list"],
  ["Alt+Shift+Backspace", "Reset all"],
];

const CAMERA_KEYS: [string, string][] = [
  ["Tab to the 3D view", "Then use the keys below"],
  ["← → ↑ ↓", "Rotate the view"],
  ["+ and −", "Zoom in and out"],
  ["Home", "Back to the overview"],
];

function Keys() {
  const shortcuts = useLab((s) => s.settings.shortcuts);
  const updateSettings = useLab((s) => s.updateSettings);
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-md border border-line-strong bg-navy-raised p-3">
        <input
          type="checkbox"
          checked={shortcuts}
          onChange={(e) => updateSettings({ shortcuts: e.target.checked })}
          className="mt-1 h-4 w-4 accent-amber"
        />
        <span>
          <span className="block text-sm font-semibold">Single-key shortcuts</span>
          <span className="block text-xs text-paper-3">
            When off, use Alt+Shift with the same key (for example Alt+Shift+M). Reset all is always Alt+Shift+Backspace. Shortcuts
            never fire while you are typing or using a control.
          </span>
        </span>
      </label>
      <ShortcutTable rows={KEYS} caption="Simulation" />
      <ShortcutTable rows={CAMERA_KEYS} caption="Camera" />
    </div>
  );
}

function ShortcutTable({ rows, caption }: { rows: [string, string][]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="pb-1 text-start font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper-2">{caption}</caption>
      <tbody>
        {rows.map(([k, d]) => (
          <tr key={k} className="border-t border-line">
            <th scope="row" className="w-44 py-1.5 pe-3 text-start font-mono text-sm font-medium text-amber">
              {k}
            </th>
            <td className="py-1.5 text-paper-2">{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SettingsForm() {
  const settings = useLab((s) => s.settings);
  const tier = useLab((s) => s.tier);
  const update = useLab((s) => s.updateSettings);
  const setQuality = useLab((s) => s.setQuality);

  const toggle = (key: keyof Settings, label: string, hint: string) => (
    <label className="flex items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={settings[key] as boolean}
        onChange={(e) => update({ [key]: e.target.checked } as Partial<Settings>)}
        className="mt-1 h-4 w-4 accent-amber"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-paper-3">{hint}</span>
      </span>
    </label>
  );

  const probe = probeGraphics();
  const options: [QualityMode, string][] = [
    ["auto", "Automatic"],
    ["high", "Full · graphics card"],
    ["low", "Light · built-in graphics"],
    ["cpu", "Minimal · no graphics card"],
  ];

  return (
    <div className="divide-y divide-line">
      <fieldset className="pb-3">
        <legend className="pb-1 text-sm font-semibold">Graphics quality</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([q, label]) => (
            <label
              key={q}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 text-sm"
            >
              <input type="radio" name="quality" checked={settings.quality === q} onChange={() => setQuality(q)} className="accent-amber" />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-paper-3">
          Now using: {TIERS[tier].label}. This computer: {graphicsName(probe)}. Minimal suits laptops without a graphics card or
          with graphics acceleration switched off: it draws at a lower resolution and a steady 30 frames per second.
        </p>
      </fieldset>
      <div className="py-1">
        {toggle("glow", "Glow effect", "Soft glow around bright objects. Turning it off helps very slow computers.")}
        {toggle("crt", "Retro scanlines", "The monitor-style lines over the 3D view. Not drawn in Minimal graphics, where they would slow the view.")}
        {toggle("labels", "Labels in the 3D view", "Names pinned to the objects in the scene.")}
        {toggle("reduceMotion", "Reduce motion", "No camera flights or decorative movement. Also follows your system setting.")}
        {toggle(
          "shortcuts",
          "Single-key shortcuts",
          "Space, M, P… When off, use Alt+Shift with the same key. Reset all is always Alt+Shift+Backspace.",
        )}
      </div>
      <fieldset className="pt-3">
        <legend className="pb-1 text-sm font-semibold">Text size</legend>
        <div className="flex flex-wrap gap-2">
          {([1, 1.25, 1.5] as const).map((t) => (
            <label
              key={t}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 text-sm"
            >
              <input
                type="radio"
                name="text-size"
                checked={settings.textSize === t}
                onChange={() => update({ textSize: t })}
                className="accent-amber"
              />
              {Math.round(t * 100)}%
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
