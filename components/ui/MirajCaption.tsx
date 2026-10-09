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
export function MirajCaption({ compact = false }: { compact?: boolean }) {
  const miraj = useLab((s) => s.miraj);
  const step = useSimValue(mirajStep);
  if (step < 0) return null;

  if (!miraj) {
    return (
      <div className="glass pointer-events-auto rounded-full px-4 py-2 text-sm text-body">Unfolding: back to the gravity well…</div>
    );
  }

  const current = MIRAJ_STEPS[step];
  return (
    <div className="glass pointer-events-auto w-full max-w-[36rem] rounded-[22px] px-5 py-3.5">
      <ol className="mb-1.5 flex gap-1.5" aria-label="Miraj steps">
        {MIRAJ_STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? "step" : undefined}
            className={`h-1 flex-1 rounded-full ${i < step ? "bg-violet" : i === step ? "bg-violet-text" : "bg-white/16"}`}
          >
            <span className="sr-only">
              Step {i + 1}: {s.title}
              {i < step ? " (done)" : i === step ? " (now)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="kicker text-violet-text">Step {step + 1} of 4</p>
      <p className="mt-1 font-display text-base font-bold text-ink">{current.title}</p>
      <p className="text-sm text-body">{current.detail}</p>
      {step === 3 && <RouteComparison />}
      {/* On phones the same caveat is in the Seven skies explanation; the caption keeps to the step. */}
      {!compact && <p className="mt-1.5 text-xs text-muted">{MIRAJ_FOOTNOTE}</p>}
    </div>
  );
}

export function RouteComparison() {
  return (
    <p className="mt-1 text-sm text-body">
      Through the tunnel: <strong className="text-violet-text">{Math.round(ROUTE_THROUGH_TUNNEL)} units</strong> · across all seven skies:{" "}
      <strong className="text-ink">{ROUTE_ACROSS_SKIES} units</strong> ·{" "}
      <strong className="text-amber">{Math.round(ROUTE_ACROSS_SKIES / ROUTE_THROUGH_TUNNEL)}× shorter</strong>
    </p>
  );
}
