"use client";

import { useId } from "react";
import { useSimValue } from "@/lib/hooks";
import {
  AU_KM,
  BODIES,
  BODY_IDS,
  ELEMENTS_VALID,
  formatSolarDate,
  orbitalPeriodDays,
  ownDilationPerYear,
  solarDilationPerYear,
  solarYear,
  sunDistance,
  surfaceGravity,
} from "@/lib/solar";
import { SOLAR_SPEEDS, sim, useLab, type BodyId, type SolarSpeed } from "@/lib/store";
import { Button, Kicker, Readout, Segmented, Switch } from "../controls";
import { ChevronDownIcon } from "../icons";

/**
 * Chapter S controls and live readouts. The dock holds the simulated clock
 * rate and the body to follow; the date (with "Back to today") shows over
 * the 3D view, and the notes show the followed body's facts.
 */

const SPEED_LABEL: Record<SolarSpeed, string> = { 1: "1 day", 7: "1 week", 30: "1 month", 365: "1 year" };
const SPEED_SHORT: Record<SolarSpeed, string> = { 1: "Day", 7: "Week", 30: "Month", 365: "Year" };
const SPEED_OPTIONS = SOLAR_SPEEDS.map((v) => ({ value: v, label: SPEED_SHORT[v], name: `${SPEED_LABEL[v]} per second` }));

const FABRIC_DESCRIPTION = "Show spacetime under the orbits: the Sun's deep well, and each planet's dent moving with it";

export function SolarDock() {
  const focus = useLab((s) => s.solarFocus);
  const speed = useLab((s) => s.solarSpeed);
  const fabric = useLab((s) => s.solarFabric);
  const followId = useId();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <Switch
        variant="inline"
        checked={fabric}
        onChange={(on) => useLab.getState().setSolarFabric(on)}
        label="Gravity fabric"
        description={FABRIC_DESCRIPTION}
        shortcut="G"
        keyshortcuts="G"
      />
      <Segmented label="Solar System clock" options={SPEED_OPTIONS} value={speed} onChange={(v) => useLab.getState().setSolarSpeed(v)} suffix="per second" />
      <div className="relative flex min-h-9 items-center rounded-full border border-rule-strong bg-panel/60 ps-3.5 hover:border-white pointer-coarse:min-h-11">
        <label htmlFor={followId} className="text-xs text-muted">
          Follow
        </label>
        <select
          id={followId}
          value={focus ?? ""}
          onChange={(e) => useLab.getState().setSolarFocus((e.target.value || null) as BodyId | null)}
          className="min-h-9 cursor-pointer appearance-none rounded-full bg-transparent ps-2 pe-8 font-display text-[0.8125rem] font-semibold text-ink pointer-coarse:min-h-11"
        >
          <option value="" className="bg-panel text-ink">
            Whole system
          </option>
          {BODY_IDS.map((id) => (
            <option key={id} value={id} className="bg-panel text-ink">
              {BODIES[id].name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-2.5 h-4 w-4 text-body" />
      </div>
    </div>
  );
}

/** Puts every planet back where it is today. */
function TodayButton({ className = "", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <Button
      size={iconOnly ? "icon" : "sm"}
      title="Put every planet back where it is today"
      aria-label={iconOnly ? "Back to today" : undefined}
      onClick={() => useLab.getState().resetSolar()}
      className={className}
    >
      <TodayIcon />
      {!iconOnly && "Back to today"}
    </Button>
  );
}

/** A calendar page (Reset's arrow would read as "Reset all"). */
function TodayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SolarLive() {
  const focus = useLab((s) => s.solarFocus);
  const speed = useLab((s) => s.solarSpeed);
  const paused = useLab((s) => s.paused);
  const date = useSimValue(() => formatSolarDate(sim.solarDay));
  const outside = useSimValue(() => {
    const y = solarYear(sim.solarDay);
    return y < ELEMENTS_VALID[0] || y > ELEMENTS_VALID[1];
  });
  const fabric = useLab((s) => s.solarFabric);
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <Switch
        checked={fabric}
        onChange={(on) => useLab.getState().setSolarFabric(on)}
        label="Gravity fabric"
        description={FABRIC_DESCRIPTION}
        shortcut="G"
        keyshortcuts="G"
      />
      <Kicker id={headingId} className="mt-4">
        Date in the simulation
      </Kicker>
      <p className="mt-1.5 font-display text-[1.75rem] leading-tight font-bold text-ink tabular-nums">{date}</p>
      <p className="text-sm text-muted">{paused ? "Paused" : `${SPEED_LABEL[speed]} every second`}</p>
      <TodayButton className="mt-2.5" />
      {outside && (
        <p className="mt-1 text-xs text-muted">
          The orbital elements are fitted to {ELEMENTS_VALID[0]}–{ELEMENTS_VALID[1]}; beyond that the positions are approximate.
        </p>
      )}
      {focus ? <BodyFacts id={focus} /> : <p className="mt-3 text-sm text-body">Click a planet, or choose one under “Follow”, to fly to it and read its facts.</p>}
    </section>
  );
}

function BodyFacts({ id }: { id: BodyId }) {
  const b = BODIES[id];
  const planet = id === "sun" ? null : id;
  const distance = useSimValue(() => (planet ? formatDistance(sunDistance(planet, sim.solarDay)) : ""));
  const sunClock = useSimValue(() => (planet ? formatPerYear(solarDilationPerYear(sunDistance(planet, sim.solarDay))) : ""));
  const g = surfaceGravity(id);

  return (
    <div className="mt-4 rounded-[14px] border border-rule bg-white/[0.03] px-3.5 pt-3 pb-2">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: b.hue }} />
        {b.name}
      </h3>
      <dl className="mt-1">
        {planet && (
          <Readout label="From the Sun now">
            <span className="whitespace-pre-line font-mono tabular-nums">{distance}</span>
          </Readout>
        )}
        {planet && <Readout label="One orbit">{mono(formatPeriod(orbitalPeriodDays(planet)))}</Readout>}
        <Readout label="One rotation">{mono(formatRotation(id))}</Readout>
        <Readout label={planet ? "Axial tilt" : "Tilt to Earth's orbit"}>{mono(formatTilt(b.tiltDeg))}</Readout>
        <Readout label="Radius">{mono(`${Math.round(b.radiusKm).toLocaleString("en-GB")} km`)}</Readout>
        <Readout label={`Gravity at the ${b.surface}`}>{mono(`${g < 100 ? g.toFixed(2) : Math.round(g)} m/s²`)}</Readout>
      </dl>
      <Kicker as="h4" className="mt-3">
        Clocks here run slow
      </Kicker>
      <dl className="mt-1">
        <Readout label="Its own gravity">{mono(`${formatPerYear(ownDilationPerYear(id))} a year`)}</Readout>
        {planet && <Readout label="The Sun's gravity, here">{mono(`${sunClock} a year`)}</Readout>}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-body">{b.fact}</p>
    </div>
  );
}

function mono(text: string) {
  return <span className="font-mono tabular-nums">{text}</span>;
}

/** Two lines: "1.00 au" and "149.6 million km". */
function formatDistance(au: number) {
  const mkm = (au * AU_KM) / 1e6;
  return `${au.toFixed(2)} au\n${mkm < 1000 ? mkm.toFixed(1) : Math.round(mkm).toLocaleString("en-GB")} million km`;
}

function formatPeriod(days: number) {
  return days < 400 ? `${days.toFixed(2)} days` : `${(days / 365.25).toFixed(2)} years`;
}

function formatRotation(id: BodyId) {
  const hours = BODIES[id].rotationHours;
  const minutes = Math.round(Math.abs(hours) * 60);
  const text =
    minutes < 48 * 60
      ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
      : `${(minutes / 1440).toFixed(1)} days${id === "sun" ? " at the equator" : ""}`;
  return hours < 0 ? `${text}, backwards` : text;
}

function formatTilt(deg: number) {
  return `${deg.toFixed(deg < 10 ? 2 : 1)}°`;
}

/** Seconds a year, to two significant figures (0.022 s, 0.62 s, 67 s). */
function formatPerYear(seconds: number) {
  return `${seconds.toPrecision(2)} s`;
}

/** Today's date in the simulation, over the 3D view. */
export function SolarCaption({ compact = false }: { compact?: boolean }) {
  const speed = useLab((s) => s.solarSpeed);
  const paused = useLab((s) => s.paused);
  const date = useSimValue(() => formatSolarDate(sim.solarDay));
  return (
    <div className="glass pointer-events-auto flex items-center gap-3 rounded-full py-1.5 ps-5 pe-1.5">
      <p className="flex items-baseline gap-3">
        <span className="font-display text-base font-bold whitespace-nowrap text-ink tabular-nums">{date}</span>
        <span className="text-xs whitespace-nowrap text-muted">{paused ? "paused" : `${SPEED_LABEL[speed]} per second`}</span>
      </p>
      <TodayButton className="rounded-full" iconOnly={compact} />
    </div>
  );
}
