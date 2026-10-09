"use client";

import { MIRAJ_STEPS } from "@/lib/content";
import { formatRate } from "@/lib/format";
import { useSimValue } from "@/lib/hooks";
import { AIM_MAX, AIM_MIN, MAX_DEPTH, SUN_DEFLECTION_DEG, curvatureLevel, equivalentRadius } from "@/lib/physics";
import { sim, useLab } from "@/lib/store";
import { ClockGraph } from "../ClockGraph";
import { Button, Readout, Rs, Slider, Switch } from "../controls";
import { BeamIcon, ResetIcon } from "../icons";
import { RouteComparison, mirajStep } from "../MirajCaption";

/**
 * Controls (in the dock) and live readouts (in the info panel) for the four
 * chapters on the lab stage: curved space, bending light, slow clocks and the
 * seven skies.
 */

/* ------------------------------------------------------------------------ */
/* Dock controls                                                             */
/* ------------------------------------------------------------------------ */

function MassSlider({ className = "" }: { className?: string }) {
  const mass = useLab((s) => s.mass);
  const miraj = useLab((s) => s.miraj);
  const setMass = useLab((s) => s.setMass);
  return (
    <Slider
      variant="inline"
      id="mass"
      label="Mass"
      value={mass}
      min={0}
      max={100}
      step={1}
      onChange={setMass}
      disabled={miraj}
      display={mass}
      valueText={`${mass} of 100, curvature ${curvatureLevel(mass).label.toLowerCase()}`}
      className={className}
    />
  );
}

function FireButton({ label }: { label: string }) {
  const fire = useLab((s) => s.firePhoton);
  return (
    <Button variant="primary" size="sm" onClick={fire} aria-keyshortcuts="Space" title={`${label} (Space)`}>
      <BeamIcon className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function CurvedSpaceDock() {
  const mass = useLab((s) => s.mass);
  const level = curvatureLevel(mass);
  return (
    <div className="flex items-center gap-4">
      <MassSlider />
      <span className="flex items-center gap-2 text-xs whitespace-nowrap text-muted" aria-hidden>
        <span className="flex w-12 gap-0.5">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1 flex-1 rounded-full ${level.level >= n ? "bg-amber" : "bg-white/20"}`} />
          ))}
        </span>
        <span className="w-[4.5rem] font-semibold text-ink">{level.label}</span>
      </span>
    </div>
  );
}

export function BendingLightDock() {
  const aim = useLab((s) => s.aim);
  const setAim = useLab((s) => s.setAim);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <FireButton label="Fire light" />
      <Slider
        variant="inline"
        id="aim"
        label="Aim"
        value={aim}
        min={AIM_MIN}
        max={AIM_MAX}
        step={0.1}
        onChange={setAim}
        display={aim.toFixed(1)}
        valueText={`${aim.toFixed(1)} grid squares from the centre`}
        fillColor="rgb(255 255 255 / 0.75)"
      />
      <MassSlider />
    </div>
  );
}

export function SlowClocksDock() {
  const resetClocks = useLab((s) => s.resetClocks);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <MassSlider />
      <Button size="sm" onClick={resetClocks} aria-keyshortcuts="R" title="Synchronise the clocks (R)">
        <ResetIcon className="h-4 w-4" />
        Synchronise
      </Button>
    </div>
  );
}

export function SevenSkiesDock() {
  const miraj = useLab((s) => s.miraj);
  const setMiraj = useLab((s) => s.setMiraj);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <Switch
        variant="inline"
        checked={miraj}
        onChange={setMiraj}
        label="Miraj"
        description="Fold the seven skies into one tunnel"
        shortcut="M"
        keyshortcuts="M"
      />
      {miraj && <FireButton label="Send light up the tunnel" />}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Live readouts                                                             */
/* ------------------------------------------------------------------------ */

const LIVE_BOX = "rounded-[14px] border border-rule bg-white/[0.03] px-3.5 py-1";

export function CurvedSpaceLive() {
  const mass = useLab((s) => s.mass);
  const depth = useSimValue(() => (sim.m * MAX_DEPTH).toFixed(1));
  const level = curvatureLevel(mass);
  return (
    <dl className={LIVE_BOX}>
      <Readout label="Mass">{mass} of 100</Readout>
      <Readout label="Curvature" tone="amber">
        {level.label}
      </Readout>
      <Readout label="Depth of the well">{depth} grid squares</Readout>
      <Readout label="Orbiting bodies">{mass > 0 ? "4, in orbit" : "Released: flying straight"}</Readout>
    </dl>
  );
}

export function BendingLightLive() {
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
  const fired = useSimValue(() => (sim.lastShot ? `aim ${sim.lastShot.impact.toFixed(1)} · mass ${sim.lastShot.mass}` : "–"));
  return (
    <div className="space-y-2.5">
      <dl className={LIVE_BOX}>
        <Readout label="Last light" tone="amber">
          {result}
        </Readout>
        <Readout label="Fired with">{fired}</Readout>
        <Readout label="Real bending at the Sun">{SUN_DEFLECTION_DEG.toFixed(4)}°</Readout>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setView("top")}>
          View from above
        </Button>
        <Button size="sm" onClick={clearPaths}>
          Clear paths
        </Button>
      </div>
    </div>
  );
}

export function SlowClocksLive() {
  const rate = useSimValue(() => formatRate(sim.rateB));
  const behind = useSimValue(() => (sim.clockA - sim.clockB).toFixed(1));
  const radius = useSimValue(() => (sim.rateB < 1 - 1e-6 ? equivalentRadius(sim.rateB).toFixed(1) : null));
  return (
    <div className="space-y-2.5">
      <dl className={LIVE_BOX}>
        <Readout label="Clock B ticks at" tone="amber">
          {rate}% of A&apos;s rate
        </Readout>
        <Readout label="Clock B is behind by">{behind} s</Readout>
        <Readout label="Like a clock near a black hole at">
          {radius ? (
            <>
              {radius} <Rs />
            </>
          ) : (
            "– (no slowing)"
          )}
        </Readout>
      </dl>
      <ClockGraph />
    </div>
  );
}

export function SevenSkiesLive() {
  const setView = useLab((s) => s.setView);
  const miraj = useLab((s) => s.miraj);
  const step = useSimValue(mirajStep);
  const transits = useSimValue(() => sim.transits);
  return (
    <div className="space-y-2.5">
      <ol className={`${LIVE_BOX} space-y-1.5 py-2.5 text-sm`}>
        {MIRAJ_STEPS.map((s, i) => {
          const state = !miraj || step < 0 ? "todo" : i < step ? "done" : i === step ? "now" : "todo";
          return (
            <li key={s.title} aria-current={state === "now" ? "step" : undefined} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={`mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[0.6875rem] font-semibold ${
                  state === "done"
                    ? "border-violet bg-violet text-page"
                    : state === "now"
                      ? "border-violet-text text-violet-text"
                      : "border-rule-strong text-muted"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "todo" ? "text-muted" : "text-ink"}>
                {s.title}
                <span className="sr-only">{state === "done" ? " (done)" : state === "now" ? " (now)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {step === 3 && <RouteComparison />}
      <dl className={LIVE_BOX}>
        <Readout label="Light sent through the tunnel">{transits === 1 ? "once" : `${transits} times`}</Readout>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setView("skies")} disabled={!miraj}>
          Seven skies view
        </Button>
        <Button size="sm" onClick={() => setView("under")} disabled={!miraj}>
          Up the tunnel
        </Button>
      </div>
    </div>
  );
}
