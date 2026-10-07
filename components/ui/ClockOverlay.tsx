"use client";

import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/format";
import { sim } from "@/lib/store";
import { ScreenAnchor } from "./ScreenAnchor";

/**
 * MODULE C — time dilation (readouts).
 *
 * Two digital clocks pinned above their beacons in the scene. They read the
 * proper times accumulated by the simulation. A tick light flashes once per
 * second of each clock's *own* time, so Clock B's slower beat can be seen as
 * well as read.
 */
export function ClockOverlay() {
  const a = useClockRefs();
  const b = useClockRefs();
  const lag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      paint(a, sim.clockA, 1, dt);
      paint(b, sim.clockB, sim.rateB, dt);
      if (lag.current) lag.current.textContent = `LAG −${(sim.clockA - sim.clockB).toFixed(2)} s`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [a, b]);

  return (
    <>
      <ScreenAnchor id="clockA">
        <ClockFace refs={a} label="CLOCK A · OBSERVER" sub="flat spacetime · grid edge" tone="cyan" />
      </ScreenAnchor>
      <ScreenAnchor id="clockB">
        <ClockFace refs={b} label="CLOCK B · GRAVITY WELL" sub="deep in curved spacetime" tone="amber">
          <div className="mt-0.5 text-right text-[10px] tracking-wider text-amber/90">
            <span ref={lag} />
          </div>
        </ClockFace>
      </ScreenAnchor>
    </>
  );
}

type ClockRefs = ReturnType<typeof useClockRefs>;

function useClockRefs() {
  return {
    time: useRef<HTMLSpanElement>(null),
    rate: useRef<HTMLSpanElement>(null),
    led: useRef<HTMLSpanElement>(null),
    second: useRef(-1),
    glow: useRef(0),
  };
}

function paint(refs: ClockRefs, t: number, rate: number, dt: number) {
  const whole = Math.floor(t);
  if (whole !== refs.second.current) {
    refs.second.current = whole;
    refs.glow.current = 1;
  }
  refs.glow.current = Math.max(0, refs.glow.current - dt * 3.5);
  if (refs.time.current) refs.time.current.textContent = formatClock(t);
  if (refs.rate.current) refs.rate.current.textContent = `${rate.toFixed(3)} s/s`;
  if (refs.led.current) refs.led.current.style.opacity = String(0.15 + refs.glow.current * 0.85);
}

function ClockFace({
  refs,
  label,
  sub,
  tone,
  children,
}: {
  refs: ClockRefs;
  label: string;
  sub: string;
  tone: "cyan" | "amber";
  children?: React.ReactNode;
}) {
  const cyan = tone === "cyan";
  return (
    <div
      className={`mb-1 select-none whitespace-nowrap border bg-navy-deep/85 px-3 py-2 shadow-[0_0_30px_rgb(0_0_0/0.35)] backdrop-blur-sm ${
        cyan ? "border-phosphor/50" : "border-amber/60"
      }`}
    >
      <div className={`flex items-center gap-2 text-[10px] tracking-[0.2em] ${cyan ? "text-phosphor" : "text-amber"}`}>
        <span
          ref={refs.led}
          className={`inline-block h-2 w-2 rounded-full ${
            cyan ? "bg-phosphor shadow-[0_0_10px_var(--color-phosphor)]" : "bg-amber shadow-[0_0_10px_var(--color-amber)]"
          }`}
        />
        {label}
      </div>
      <div className="font-digital text-[34px] leading-none text-paper">
        <span ref={refs.time}>00:00:00.00</span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[10px] tracking-wider text-paper/70">
        <span>{sub}</span>
        <span ref={refs.rate} className={cyan ? "text-phosphor" : "text-amber"} />
      </div>
      {children}
    </div>
  );
}
