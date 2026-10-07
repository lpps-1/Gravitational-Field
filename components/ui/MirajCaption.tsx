"use client";

import { MIRAJ_FOOTNOTE, MIRAJ_STEPS } from "@/lib/content";
import { useSimValue } from "@/lib/hooks";
import { ROUTE_ACROSS_SKIES, ROUTE_THROUGH_TUNNEL } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";

/** Which of the four Miraj steps is showing (-1 = none). */
export function mirajStep(): number {
  if (sim.expand <= 0.001 && sim.fold <= 0) return -1;
  if (sim.fold >= 1) return 3;
  if (sim.fold > 0) return 2;
  if (sim.expand >= 0.999) return 1;
  return 0;
}

/** Step-by-step captions for the Miraj sequence, at the top of the 3D view. */
export function MirajCaption() {
  const miraj = useLab((s) => s.miraj);
  const step = useSimValue(mirajStep);
  if (step < 0) return null;

  if (!miraj) {
    return (
      <div className="pointer-events-auto rounded-lg border border-line bg-navy-deep/95 px-4 py-2 text-sm text-paper-2 shadow-xl">
        Unfolding: back to the gravity well…
      </div>
    );
  }

  const current = MIRAJ_STEPS[step];
  return (
    <div className="pointer-events-auto w-[min(36rem,calc(100vw-2rem))] rounded-lg border border-violet/60 bg-navy-deep/95 px-4 py-3 shadow-xl">
      <ol className="mb-1.5 flex gap-1.5" aria-label="Miraj steps">
        {MIRAJ_STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-violet" : i === step ? "bg-violet-text" : "bg-line"}`}
          >
            <span className="sr-only">
              Step {i + 1}: {s.title}
              {i < step ? " (done)" : i === step ? " (now)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-base font-semibold text-paper">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-violet-text">Step {step + 1} of 4 · </span>
        {current.title}
      </p>
      <p className="text-sm text-paper-2">{current.detail}</p>
      {step === 3 && <RouteComparison />}
      <p className="mt-1 text-xs text-paper-3">{MIRAJ_FOOTNOTE}</p>
    </div>
  );
}

export function RouteComparison() {
  return (
    <p className="mt-1 text-sm text-paper">
      Through the tunnel: <strong className="text-violet-text">{Math.round(ROUTE_THROUGH_TUNNEL)} units</strong> · across all seven skies:{" "}
      <strong className="text-paper">{ROUTE_ACROSS_SKIES} units</strong> ·{" "}
      <strong className="text-amber">{Math.round(ROUTE_ACROSS_SKIES / ROUTE_THROUGH_TUNNEL)}× shorter</strong>
    </p>
  );
}
