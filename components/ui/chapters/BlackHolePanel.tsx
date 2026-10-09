"use client";

import { Button, Kicker, Rs, Slider, Switch } from "@/components/ui/controls";
import { ResetIcon } from "@/components/ui/icons";
import { LAG_SUN, RATE_SUN, YEAR_SECONDS, hoverRate } from "@/lib/blackhole";
import { formatClock } from "@/lib/format";
import { useSimValue } from "@/lib/hooks";
import { BH_RADIUS_MAX, BH_RADIUS_MIN, sim, useLab } from "@/lib/store";

/**
 * CHAPTER H controls and readouts: three clocks, one in deep space, one on
 * the Sun's surface and one hovering near a black hole, side by side.
 */

/** The distance slider is logarithmic: each arrow-key step moves the clock about 1.5%. */
const SLIDER_STEPS = 200;
const LOG_SPAN = Math.log(BH_RADIUS_MAX / BH_RADIUS_MIN);
const toSlider = (r: number) => Math.round((Math.log(r / BH_RADIUS_MIN) / LOG_SPAN) * SLIDER_STEPS);
const fromSlider = (p: number) => BH_RADIUS_MIN * Math.exp((p / SLIDER_STEPS) * LOG_SPAN);

/** Seconds the Sun's clock loses in a year (≈ 67). */
const SUN_LOSS_PER_YEAR = Math.round(LAG_SUN * YEAR_SECONDS);

export function BlackHoleDock() {
  const radius = useLab((s) => s.bhRadius);
  const timelapse = useLab((s) => s.bhTimelapse);
  const setBhRadius = useLab((s) => s.setBhRadius);
  const setBhTimelapse = useLab((s) => s.setBhTimelapse);
  const resetBhClocks = useLab((s) => s.resetBhClocks);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
      <Slider
        variant="inline"
        id="bh-radius"
        label="Your clock"
        value={toSlider(radius)}
        min={0}
        max={SLIDER_STEPS}
        step={1}
        onChange={(p) => setBhRadius(fromSlider(p))}
        valueText={`${Number(radius.toFixed(2))} horizon radii from the centre`}
        display={
          <>
            {radius.toFixed(2)} <Rs />
          </>
        }
      />
      <Switch variant="inline" checked={timelapse} onChange={setBhTimelapse} label="Time-lapse" description="One year every 10 seconds" />
      <Button size="sm" onClick={resetBhClocks}>
        <ResetIcon className="h-4 w-4" />
        Reset clocks
      </Button>
    </div>
  );
}

export function BlackHoleLive() {
  const radius = useLab((s) => s.bhRadius);
  const timelapse = useLab((s) => s.bhTimelapse);
  const rate = hoverRate(radius);
  return (
    <section aria-labelledby="bh-clocks" className="space-y-3">
      <Kicker id="bh-clocks">Three clocks</Kicker>
      <ul className="space-y-3.5">
        <ClockRow name="Deep space" rate={1} rateText="1" timelapse={timelapse} elapsed={readDeep} />
        <ClockRow name="Sun's surface" rate={RATE_SUN} rateText="0.999 997 9" timelapse={timelapse} elapsed={readSun} behind={lagSun} />
        <ClockRow
          name={
            <>
              Your clock{" "}
              <span aria-hidden>
                · r = {radius.toFixed(2)} <Rs />
              </span>
              <span className="sr-only">, at {Number(radius.toFixed(2))} horizon radii</span>
            </>
          }
          rate={rate}
          rateText={rate >= 0.1 ? rate.toFixed(3) : rate.toFixed(4)}
          timelapse={timelapse}
          elapsed={readHole}
          behind={lagHole}
        />
      </ul>
      <p className="text-sm leading-relaxed text-body">
        While 1 hour passes on your clock, <strong className="font-semibold text-ink">{formatHours(1 / rate)}</strong> pass in
        deep space. The Sun&apos;s clock loses {SUN_LOSS_PER_YEAR} s a year.
      </p>
    </section>
  );
}

const readDeep = () => sim.bhDeep;
const readSun = () => sim.bhSun;
const readHole = () => sim.bhHole;
const lagSun = () => sim.bhDeep - sim.bhSun;
const lagHole = () => sim.bhDeep - sim.bhHole;

function ClockRow({
  name,
  rate,
  rateText,
  timelapse,
  elapsed,
  behind,
}: {
  name: React.ReactNode;
  rate: number;
  rateText: string;
  timelapse: boolean;
  elapsed: () => number;
  behind?: () => number;
}) {
  // Sampled a few times a second; React re-renders only when the text changes.
  const reading = useSimValue(() => formatElapsed(elapsed(), timelapse));
  const lag = useSimValue(() => (behind ? `${formatLag(behind())} behind` : "the reference"));
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm font-semibold text-ink">{name}</span>
        <span className="font-mono text-base tabular-nums text-ink">{reading}</span>
      </div>
      <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-rule">
        <div className="h-full rounded-full bg-ice" style={{ width: `${rate * 100}%` }} />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          rate <span className="font-mono tabular-nums text-body">{rateText}</span>
        </span>
        <span className="font-mono tabular-nums">{lag}</span>
      </div>
    </li>
  );
}

/** A clock reading: "00:12.3" in real time; "1 y 023 d 04:05" in the time-lapse or past a day. */
function formatElapsed(seconds: number, timelapse: boolean): string {
  if (!timelapse && seconds < 86_400) return formatClock(seconds);
  const years = Math.floor(seconds / YEAR_SECONDS);
  const rest = seconds - years * YEAR_SECONDS;
  const days = Math.floor(rest / 86_400);
  const hours = Math.floor((rest % 86_400) / 3600);
  const minutes = Math.floor((rest % 3600) / 60);
  return `${years} y ${pad(days, 3)} d ${pad(hours, 2)}:${pad(minutes, 2)}`;
}

/** How far a clock has fallen behind deep space, in the largest sensible unit ("26 µs", "5.2 s", "1 y 041 d"). */
function formatLag(s: number): string {
  if (s <= 0) return "0 s";
  if (s < 1e-3) return `${short(s * 1e6)} µs`;
  if (s < 1) return `${short(s * 1e3)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad(Math.floor(s % 60), 2)} s`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60), 2)} min`;
  if (s < YEAR_SECONDS) return `${Math.floor(s / 86_400)} d ${pad(Math.floor((s % 86_400) / 3600), 2)} h`;
  const years = Math.floor(s / YEAR_SECONDS);
  return `${years} y ${pad(Math.floor((s - years * YEAR_SECONDS) / 86_400), 3)} d`;
}

/** "1 h 44 min"; to the second when it is close to one hour ("1 h 1 min 34 s"). */
function formatHours(hours: number): string {
  const total = hours < 1.1 ? Math.round(hours * 3600) : Math.round(hours * 60) * 60;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [`${h} h`, m ? `${m} min` : "", s ? `${s} s` : ""].filter(Boolean).join(" ");
}

/** Two significant figures, at most one decimal. */
function short(x: number): string {
  return x >= 10 ? String(Math.round(x)) : x.toFixed(1);
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * The three clocks over the 3D view, so the comparison can be seen from
 * across the room: each clock's own reading, and how far it has fallen
 * behind the one in deep space. It sits at the top left, clear of the
 * picture's own labels.
 */
export function BlackHoleCaption({ compact = false }: { compact?: boolean }) {
  const radius = useLab((s) => s.bhRadius);
  const timelapse = useLab((s) => s.bhTimelapse);
  return (
    <div
      role="group"
      aria-label="Three clocks"
      className={`glass pointer-events-auto grid grid-cols-[auto_auto_auto] items-baseline gap-x-4 gap-y-1 rounded-[22px] px-4 py-2.5 ${
        compact ? "w-full" : "me-auto"
      }`}
    >
      <CaptionClock name="Deep space" timelapse={timelapse} elapsed={readDeep} />
      <CaptionClock name="Sun's surface" timelapse={timelapse} elapsed={readSun} behind={lagSun} />
      <CaptionClock
        name={
          <>
            Your clock · {radius.toFixed(2)} <Rs />
          </>
        }
        timelapse={timelapse}
        elapsed={readHole}
        behind={lagHole}
        accent
      />
    </div>
  );
}

function CaptionClock({
  name,
  timelapse,
  elapsed,
  behind,
  accent = false,
}: {
  name: React.ReactNode;
  timelapse: boolean;
  elapsed: () => number;
  behind?: () => number;
  accent?: boolean;
}) {
  const reading = useSimValue(() => formatElapsed(elapsed(), timelapse));
  const lag = useSimValue(() => (behind ? `${formatLag(behind())} behind` : "reference"));
  return (
    <>
      <span className={`font-display text-xs font-semibold whitespace-nowrap ${accent ? "text-ice" : "text-ink"}`}>{name}</span>
      <span className="text-end font-mono text-base leading-tight font-semibold whitespace-nowrap text-ink tabular-nums">{reading}</span>
      <span className="text-end font-mono text-xs whitespace-nowrap text-muted tabular-nums">
        {lag}
      </span>
    </>
  );
}
