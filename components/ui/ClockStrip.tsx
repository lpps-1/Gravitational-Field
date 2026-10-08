"use client";

import { useEffect, useRef } from "react";
import { formatClock, formatRate } from "@/lib/format";
import { sim } from "@/lib/store";

/**
 * Two analog clocks side by side (top of the 3D view while the Time tab is
 * open). Their second hands sweep at each clock's own rate, so "Clock B runs
 * slow" can be seen from across the room, not just read. On phones the gap
 * between them is shown underneath, with each dial above its reading so the
 * two clocks always fit side by side.
 */
export function ClockStrip({ compact = false }: { compact?: boolean }) {
  const handA = useRef<SVGLineElement>(null);
  const handB = useRef<SVGLineElement>(null);
  const timeA = useRef<HTMLSpanElement>(null);
  const timeB = useRef<HTMLSpanElement>(null);
  const rateB = useRef<HTMLSpanElement>(null);
  const lag = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const last = { a: "", b: "", rate: "", lag: "" };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      handA.current?.setAttribute("transform", `rotate(${((sim.clockA % 60) * 6).toFixed(2)})`);
      handB.current?.setAttribute("transform", `rotate(${((sim.clockB % 60) * 6).toFixed(2)})`);
      const a = formatClock(sim.clockA);
      const b = formatClock(sim.clockB);
      const r = `${formatRate(sim.rateB)}% speed`;
      const l = `${(sim.clockA - sim.clockB).toFixed(1)} s`;
      if (a !== last.a && timeA.current) timeA.current.textContent = last.a = a;
      if (b !== last.b && timeB.current) timeB.current.textContent = last.b = b;
      if (r !== last.rate && rateB.current) rateB.current.textContent = last.rate = r;
      if (l !== last.lag && lag.current) lag.current.textContent = last.lag = l;
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [compact]); // the two layouts use new elements, so start writing afresh

  const size = compact ? 48 : 76;
  const dialA = (
    <Dial size={size} hand={handA} color="var(--color-phosphor)" title="Clock A" subtitle="far away" compact={compact}>
      <span ref={timeA} className="font-digital text-2xl leading-none text-paper">
        00:00.0
      </span>
      <span className="text-xs text-paper-3">100% speed</span>
    </Dial>
  );
  const dialB = (
    <Dial size={size} hand={handB} color="var(--color-amber)" title="Clock B" subtitle="near the mass" compact={compact}>
      <span ref={timeB} className="font-digital text-2xl leading-none text-paper">
        00:00.0
      </span>
      <span ref={rateB} className="text-xs text-paper-3">
        100% speed
      </span>
    </Dial>
  );
  const behind = (
    <div className={compact ? "flex items-baseline justify-center gap-2" : "flex flex-col items-center justify-center px-1 text-center"}>
      <span className="text-xs text-paper-3">B is behind by</span>
      <span ref={lag} className={`font-digital leading-none text-amber ${compact ? "text-2xl" : "text-3xl"}`}>
        0.0 s
      </span>
    </div>
  );
  return (
    <div
      role="group"
      aria-label="Clock comparison"
      className={`pointer-events-auto flex max-w-full rounded-lg border border-line bg-navy-deep/95 px-3 shadow-xl ${
        compact ? "flex-col gap-1 py-1.5" : "items-stretch gap-3 py-2"
      }`}
    >
      {compact ? (
        <>
          {/* Two columns that never wrap: Clock B must not fall below a clipped edge. */}
          <div className="grid grid-cols-2 gap-x-3">
            {dialA}
            {dialB}
          </div>
          {behind}
        </>
      ) : (
        <>
          {dialA}
          {behind}
          {dialB}
        </>
      )}
    </div>
  );
}

function Dial({
  size,
  hand,
  color,
  title,
  subtitle,
  compact,
  children,
}: {
  size: number;
  hand: React.RefObject<SVGLineElement | null>;
  color: string;
  title: string;
  subtitle: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? "flex flex-col items-center gap-1 text-center" : "flex items-center gap-2"}>
      <svg width={size} height={size} viewBox="-40 -40 80 80" aria-hidden>
        <circle r={37} fill="#0e1c3a" stroke="#7f97c4" strokeWidth={2} />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            y1={-33}
            y2={i % 3 === 0 ? -26 : -29}
            stroke="#d3cec3"
            strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
            transform={`rotate(${i * 30})`}
          />
        ))}
        <line ref={hand} y1={6} y2={-31} stroke={color} strokeWidth={3} strokeLinecap="round" />
        <circle r={3.5} fill={color} />
      </svg>
      <div className={`flex flex-col gap-0.5 ${compact ? "items-center" : ""}`}>
        <span className="text-xs font-semibold text-paper">
          {title}{" "}
          {compact ? <span className="block font-normal text-paper-3">{subtitle}</span> : <span className="font-normal text-paper-3">· {subtitle}</span>}
        </span>
        {children}
      </div>
    </div>
  );
}
