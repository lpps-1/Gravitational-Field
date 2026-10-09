"use client";

import { useEffect, useId, useRef } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { CREDITS } from "@/lib/credits";
import { TIERS, graphicsName, probeGraphics } from "@/lib/quality";
import { useLab, type QualityMode, type Settings } from "@/lib/store";
import { Button, Kicker } from "./controls";
import { ArrowRightIcon, CloseIcon } from "./icons";

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
      className={`m-auto max-h-[88dvh] ${wide ? "w-[min(46rem,calc(100vw-2rem))]" : "w-[min(34rem,calc(100vw-2rem))]"} overflow-hidden rounded-[22px] border border-white/16 bg-panel p-0 text-body shadow-[0_20px_60px_rgb(0_0_0/0.5)]`}
    >
      <div className="flex max-h-[88dvh] flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-rule py-2.5 ps-6 pe-2.5">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-body transition-colors hover:bg-white/10 hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </header>
        <div className="panel-scroll overflow-y-auto px-6 py-5">{children}</div>
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
    <div className="space-y-6 text-[0.9375rem] leading-relaxed">
      <p>
        <strong className="text-ink">Spacetime Lab</strong>, for Azeemi Gala by Team LPPS, is an interactive picture of how gravity shapes
        space, light and time, shown alongside the Quranic themes of <em>yasbaḥūn</em> (bodies floating in their orbits) and the Miraj.
      </p>

      <section aria-labelledby="about-chapters">
        <Kicker id="about-chapters">Six chapters</Kicker>
        <ol className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {CHAPTERS.map((c) => (
            <li key={c.id} className="flex items-baseline gap-2.5">
              <span className="font-mono text-xs text-ice">{c.number}</span>
              <span className="text-ink">{c.short}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-use">
        <Kicker id="about-use">How to use it</Kicker>
        <ul className="mt-2.5 space-y-1.5">
          <li>Choose a chapter at the top. Each one shows a single idea, with its notes on the right.</li>
          <li>Drag the 3D view to look around; scroll or pinch to zoom. The View menu jumps to useful angles.</li>
          <li>The dock at the bottom holds the chapter&apos;s controls, Play and Pause, slow motion and Reset all.</li>
        </ul>
      </section>

      <section aria-labelledby="about-honest">
        <Kicker id="about-honest">An honest note</Kicker>
        <p className="mt-2.5 text-body">
          Chapters 01 to 03 and 06 are illustrations, not to scale: real light passing the Sun bends by only
          0.0005°, and a clock on Earth loses only about 0.02 s a year to gravity. The “rubber sheet” grid is a teaching analogy;
          traversable wormholes remain theoretical. The Solar System chapter places every planet where it really is (sizes enlarged,
          distances compressed), and the black hole is drawn with real light bending. The verses are shown as themes for reflection,
          not as scientific proof, and the science is not presented as proof of scripture.
        </p>
      </section>

      <section aria-labelledby="about-credits">
        <Kicker id="about-credits">Credits</Kicker>
        <ul className="mt-2.5 space-y-1.5 text-sm">
          {CREDITS.map((c) => (
            <li key={c.what}>
              <span className="text-ink">{c.what}:</span> {c.who} ({c.licence}
              {c.via ? `, ${c.via}` : ""}).
            </li>
          ))}
          <li>
            <span className="text-ink">Quran translation:</span> Sahih International.
          </li>
        </ul>
      </section>

      <Button variant="primary" onClick={startTour}>
        Start the guided tour
        <ArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

const KEYS: [string, string][] = [
  ["1 to 6", "Open a chapter"],
  ["Space", "Fire light (through the tunnel during the Miraj)"],
  ["M", "Engage or disengage the Miraj"],
  ["P", "Play or pause"],
  [".", "Step forward while paused"],
  ["S", "Switch between normal speed and slow motion"],
  ["R", "Synchronise the clocks"],
  ["[ and ]", "Central mass down or up by 5"],
  ["0 and 9", "Central mass to 0 or 100"],
  ["L", "Show or hide the labels"],
  ["H", "Hide or show the chapter notes"],
  ["T", "Start the guided tour"],
  ["Page Down / Page Up", "Next or previous tour step (works with presentation clickers)"],
  ["?", "Open this list"],
  ["Alt+Shift+Backspace", "Reset all"],
];

const CAMERA_KEYS: [string, string][] = [
  ["Tab to the 3D view", "Then use the keys below"],
  ["← → ↑ ↓", "Rotate the view"],
  ["+ and −", "Zoom in and out"],
  ["Home", "Back to the chapter's first view"],
];

function Keys() {
  const shortcuts = useLab((s) => s.settings.shortcuts);
  const updateSettings = useLab((s) => s.updateSettings);
  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-rule-strong p-3.5">
        <input
          type="checkbox"
          checked={shortcuts}
          onChange={(e) => updateSettings({ shortcuts: e.target.checked })}
          className="mt-1 h-4 w-4 accent-[#9dbef0]"
        />
        <span>
          <span className="block font-display text-sm font-semibold text-ink">Single-key shortcuts</span>
          <span className="block text-xs text-muted">
            When off, use Alt+Shift with the same key (for example Alt+Shift+M). Reset all is always Alt+Shift+Backspace. Shortcuts
            never fire while you are typing or using a control.
          </span>
        </span>
      </label>
      <ShortcutTable rows={KEYS} caption="Lab" />
      <ShortcutTable rows={CAMERA_KEYS} caption="Camera" />
    </div>
  );
}

function ShortcutTable({ rows, caption }: { rows: [string, string][]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="kicker pb-2 text-start">{caption}</caption>
      <tbody>
        {rows.map(([k, d]) => (
          <tr key={k} className="border-t border-rule">
            <th scope="row" className="w-48 py-2 pe-3 text-start font-mono text-[0.8125rem] font-semibold text-ink">
              {k}
            </th>
            <td className="py-2 text-body">{d}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Choice<T extends string | number>({
  name,
  value,
  current,
  onChange,
  children,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (value: T) => void;
  children: React.ReactNode;
}) {
  const on = value === current;
  return (
    <label
      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 font-display text-[0.8125rem] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ice ${
        on ? "border-white bg-white text-page" : "border-rule-strong text-ink hover:border-white"
      }`}
    >
      <input type="radio" name={name} checked={on} onChange={() => onChange(value)} className="sr-only" />
      {children}
    </label>
  );
}

function SettingsForm() {
  const settings = useLab((s) => s.settings);
  const tier = useLab((s) => s.tier);
  const update = useLab((s) => s.updateSettings);
  const setQuality = useLab((s) => s.setQuality);

  const toggle = (key: keyof Settings, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 py-2.5">
      <input
        type="checkbox"
        checked={settings[key] as boolean}
        onChange={(e) => update({ [key]: e.target.checked } as Partial<Settings>)}
        className="mt-1 h-4 w-4 shrink-0 accent-[#9dbef0]"
      />
      <span>
        <span className="block font-display text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );

  const probe = probeGraphics();
  const options: [QualityMode, string][] = [
    ["auto", "Automatic"],
    ["high", "Full"],
    ["low", "Light"],
    ["cpu", "Minimal"],
  ];

  return (
    <div className="divide-y divide-rule">
      <fieldset className="pb-4">
        <legend className="pb-2 font-display text-sm font-semibold text-ink">Graphics</legend>
        <div className="flex flex-wrap gap-2">
          {options.map(([q, label]) => (
            <Choice key={q} name="quality" value={q} current={settings.quality} onChange={setQuality}>
              {label}
            </Choice>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Now drawing with: <span className="text-body">{TIERS[tier].label}</span>. This computer: {graphicsName(probe)}. Full suits a
          graphics card; Light suits built-in graphics such as Intel UHD; Minimal suits laptops with graphics acceleration switched off,
          drawing at a lower resolution and a steady 30 frames per second.
        </p>
      </fieldset>
      <div className="py-2">
        {toggle("glow", "Glow", "Soft glow around bright objects (Full graphics only). Turning it off helps slow computers.")}
        {toggle("labels", "Labels in the 3D view", "Names pinned to the objects in the scene.")}
        {toggle("reduceMotion", "Reduce motion", "No camera flights or decorative movement. Also follows your system setting.")}
        {toggle(
          "shortcuts",
          "Single-key shortcuts",
          "Space, M, P… When off, use Alt+Shift with the same key. Reset all is always Alt+Shift+Backspace.",
        )}
        {toggle("crt", "Retro scanlines", "Monitor-style lines over the 3D view. Not drawn in Minimal graphics, where they would slow the view.")}
      </div>
      <fieldset className="pt-4">
        <legend className="pb-2 font-display text-sm font-semibold text-ink">Text size</legend>
        <div className="flex flex-wrap gap-2">
          {([1, 1.25, 1.5] as const).map((t) => (
            <Choice key={t} name="text-size" value={t} current={settings.textSize} onChange={(v) => update({ textSize: v })}>
              {Math.round(t * 100)}%
            </Choice>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
