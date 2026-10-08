"use client";

import { useRef } from "react";
import { MODULES, TRANSLATION_CREDIT, VERSE_FRAMING, type LegendSwatch, type Verse } from "@/lib/content";
import { formatRate } from "@/lib/format";
import { useSimValue } from "@/lib/hooks";
import { MAX_DEPTH, SUN_DEFLECTION_DEG, curvatureLevel, equivalentRadius } from "@/lib/physics";
import { sim, useLab, type ModuleId } from "@/lib/store";
import { ClockGraph } from "./ClockGraph";
import { Button, Kbd, Readout } from "./controls";
import { RouteComparison, mirajStep } from "./MirajCaption";
import { MIRAJ_STEPS } from "@/lib/content";

const ORDER: ModuleId[] = ["A", "B", "C", "D"];

/**
 * The four explanation tabs (WAI-ARIA tabs pattern with roving tabindex and
 * arrow keys). Each panel: live readouts in plain language, actions, a colour
 * key, things to try, the science, the verse with its framing, and a scale note.
 */
export function Explain() {
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % ORDER.length;
    else if (e.key === "ArrowLeft") next = (index + ORDER.length - 1) % ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ORDER.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setFocus(ORDER[next]);
    tabs.current[next]?.focus();
  };

  const m = MODULES[focus];
  return (
    <section aria-labelledby="explain-heading" className="flex min-h-0 flex-col">
      <h2 id="explain-heading" className="sr-only">
        Explanations
      </h2>
      <div role="tablist" aria-label="Explanations" className="grid grid-cols-4 gap-1 border-b border-line px-3 pt-2">
        {ORDER.map((id, i) => (
          <button
            key={id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`tab-${id}`}
            role="tab"
            type="button"
            aria-selected={focus === id}
            aria-controls="explain-panel"
            tabIndex={focus === id ? 0 : -1}
            onClick={() => setFocus(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px min-h-11 rounded-t-md border border-b-0 px-1 py-1.5 text-xs leading-tight font-semibold transition-[background-color,color] ${
              focus === id
                ? "border-line bg-navy-raised text-paper"
                : "border-transparent text-paper-3 hover:bg-navy-raised/60 hover:text-paper"
            }`}
          >
            <span className="block font-mono text-[0.75rem] text-amber">{i + 1}</span>
            {MODULES[id].tab}
          </button>
        ))}
      </div>
      <div id="explain-panel" role="tabpanel" aria-labelledby={`tab-${focus}`} tabIndex={0} className="space-y-4 px-4 py-4">
        <div>
          <h3 className="text-base font-semibold text-paper">{m.title}</h3>
          <p className="mt-1 text-sm text-paper-2">{m.summary}</p>
        </div>
        <LiveBlock module={focus} />
        <Legend items={m.legend} />
        <div>
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-phosphor">Try this</h4>
          <ul className="mt-1.5 list-disc space-y-1 ps-5 text-sm text-paper-2 marker:text-phosphor">
            {m.tryIt.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper-2">The science</h4>
          {m.physics.map((p) => (
            <p key={p} className="mt-1.5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-paper">
              {p}
            </p>
          ))}
        </div>
        {m.verse && <VerseBlock verse={m.verse} />}
        <p className="rounded-md border border-line bg-navy-raised px-3 py-2 text-xs text-paper-2">
          <span className="font-semibold text-amber">Scale: </span>
          {m.scale}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function LiveBlock({ module }: { module: ModuleId }) {
  if (module === "A") return <LiveA />;
  if (module === "B") return <LiveB />;
  if (module === "C") return <LiveC />;
  return <LiveD />;
}

function LiveA() {
  const mass = useLab((s) => s.mass);
  const depth = useSimValue(() => (sim.m * MAX_DEPTH).toFixed(1));
  const level = curvatureLevel(mass);
  return (
    <dl className="rounded-md border border-line bg-navy-raised px-3 py-2">
      <Readout label="Curvature" tone="amber">
        {level.label}
      </Readout>
      <Readout label="Depth of the well">{depth} grid squares</Readout>
      <Readout label="Orbiting bodies">{mass > 0 ? "4, in orbit" : "Released: flying straight"}</Readout>
    </dl>
  );
}

function LiveB() {
  const setView = useLab((s) => s.setView);
  const clearPaths = useLab((s) => s.clearPaths);
  const result = useSimValue(() => {
    if (sim.photonFlying) return "Light in flight…";
    const shot = sim.lastShot;
    if (!shot) return "Not fired yet";
    if (shot.captured) return "Fell into the mass";
    if (shot.deflection < 0.05) return "Went straight (0.0°)";
    return `Bent by ${shot.deflection.toFixed(1)}°`;
  });
  const fired = useSimValue(() => (sim.lastShot ? `aim ${sim.lastShot.impact.toFixed(1)} · mass ${sim.lastShot.mass}` : "—"));
  return (
    <div className="space-y-2">
      <dl className="rounded-md border border-line bg-navy-raised px-3 py-2">
        <Readout label="Last light" tone="amber">
          {result}
        </Readout>
        <Readout label="Fired with">{fired}</Readout>
        <Readout label="Real bending at the Sun">{SUN_DEFLECTION_DEG.toFixed(4)}°</Readout>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setView("top")}>View from above</Button>
        <Button onClick={clearPaths}>Clear paths</Button>
      </div>
    </div>
  );
}

function LiveC() {
  const setView = useLab((s) => s.setView);
  const resetClocks = useLab((s) => s.resetClocks);
  const rate = useSimValue(() => formatRate(sim.rateB));
  const behind = useSimValue(() => (sim.clockA - sim.clockB).toFixed(1));
  const radius = useSimValue(() => (sim.rateB < 1 - 1e-6 ? equivalentRadius(sim.rateB).toFixed(1) : null));
  return (
    <div className="space-y-2">
      <dl className="rounded-md border border-line bg-navy-raised px-3 py-2">
        <Readout label="Clock B runs at" tone="amber">
          {rate}% of Clock A&apos;s speed
        </Readout>
        <Readout label="Clock B is behind by">{behind} s</Readout>
        <Readout label="Like a clock near a black hole at">{radius ? `${radius} × its horizon radius` : "— (no slowing)"}</Readout>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={resetClocks} aria-keyshortcuts="R">
          Synchronise <Kbd>R</Kbd>
        </Button>
        <Button onClick={() => setView("clocks")}>View the clocks</Button>
      </div>
      <ClockGraph />
    </div>
  );
}

function LiveD() {
  const setView = useLab((s) => s.setView);
  const miraj = useLab((s) => s.miraj);
  const step = useSimValue(mirajStep);
  const transits = useSimValue(() => sim.transits);
  return (
    <div className="space-y-2">
      <ol className="space-y-1 rounded-md border border-line bg-navy-raised px-3 py-2 text-sm">
        {MIRAJ_STEPS.map((s, i) => {
          const state = !miraj || step < 0 ? "todo" : i < step ? "done" : i === step ? "now" : "todo";
          return (
            <li key={s.title} aria-current={state === "now" ? "step" : undefined} className="flex items-start gap-2">
              <span
                aria-hidden
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  state === "done"
                    ? "border-violet bg-violet text-navy-deep"
                    : state === "now"
                      ? "border-violet-text text-violet-text"
                      : "border-line-strong text-paper-3"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "todo" ? "text-paper-3" : "text-paper"}>
                {s.title}
                <span className="sr-only">{state === "done" ? " (done)" : state === "now" ? " (now)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {step === 3 && <RouteComparison />}
      <dl className="rounded-md border border-line bg-navy-raised px-3 py-2">
        <Readout label="Light sent through the tunnel">{transits === 1 ? "once" : `${transits} times`}</Readout>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setView("skies")} disabled={!miraj}>
          Seven skies view
        </Button>
        <Button onClick={() => setView("under")} disabled={!miraj}>
          Up the tunnel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function VerseBlock({ verse }: { verse: Verse }) {
  return (
    <figure className="rounded-md border-s-4 border-violet bg-navy-raised px-3 py-3">
      <p lang="ar" dir="rtl" className="font-arabic text-2xl leading-[1.9] text-paper">
        {verse.arabic}
      </p>
      <blockquote className="mt-1 text-[0.9375rem] italic text-paper">{verse.translation}</blockquote>
      <figcaption className="mt-1 text-xs text-violet-text">
        Quran · {verse.reference}. {TRANSLATION_CREDIT}
        {verse.note && <span className="text-paper-3"> {verse.note}</span>}
      </figcaption>
      <p className="mt-2 text-xs text-paper-3">{VERSE_FRAMING}</p>
    </figure>
  );
}

const SWATCH: Record<LegendSwatch, React.ReactNode> = {
  grid: <span className="h-3 w-6 rounded-sm" style={{ background: "linear-gradient(90deg,#9fd3ff,#ffb45a)" }} />,
  mass: <span className="h-3.5 w-3.5 rounded-full bg-[#ffd08a] shadow-[0_0_8px_#ffb45a]" />,
  body: <span className="h-2.5 w-2.5 rounded-full bg-[#9ec9ff] shadow-[-8px_0_0_-2px_rgba(158,201,255,0.5)]" />,
  outline: <span className="h-3 w-6 rounded-full border border-[#9ec9ff]/70" />,
  photon: <span className="h-1 w-6 rounded bg-gradient-to-r from-transparent to-[#ffdc8c]" />,
  star: <span className="h-3 w-3 rounded-full bg-[#fff1cf]" />,
  guide: <span className="h-0 w-6 border-t-2 border-dashed border-[#8fb8d0]" />,
  observer: <span className="h-3 w-3 rotate-45 border-2 border-phosphor" />,
  apparent: <span className="h-3 w-3 rounded-full border-2 border-dotted border-[#e8d6a8]" />,
  clockA: <span className="h-3 w-3 rotate-45 border-2 border-phosphor" />,
  clockB: <span className="h-3 w-3 rotate-45 border-2 border-amber" />,
  skies: <span className="h-3 w-6 rounded-full" style={{ background: "linear-gradient(90deg,#6fb7ff,#c08cf5,#ffd47a)" }} />,
  tunnelLight: <span className="h-6 w-1 rounded bg-[#f3eaff] shadow-[0_0_6px_#c08cf5]" />,
};

function Legend({ items }: { items: { swatch: LegendSwatch; text: string }[] }) {
  return (
    <details className="group rounded-md border border-line px-3 py-2" open>
      <summary className="cursor-pointer list-none font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper-2 marker:hidden">
        <span aria-hidden className="me-1 inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        Key to the picture
      </summary>
      <ul className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it.text} className="flex items-center gap-2.5 text-sm text-paper-2">
            <span aria-hidden className="flex w-7 shrink-0 items-center justify-center">
              {SWATCH[it.swatch]}
            </span>
            {it.text}
          </li>
        ))}
      </ul>
    </details>
  );
}
