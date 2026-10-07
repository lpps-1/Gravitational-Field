"use client";

import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/format";
import { sim } from "@/lib/store";

/**
 * Two analog clocks side by side (top of the 3D view while the Time tab is
 * open). Their second hands sweep at each clock's own rate, so "Clock B runs
 * slow" can be seen from across the room, not just read.
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
      const r = `${Math.round(sim.rateB * 100)}% speed`;
      const l = `${(sim.clockA - sim.clockB).toFixed(1)} s`;
      if (a !== last.a && timeA.current) timeA.current.textContent = last.a = a;
      if (b !== last.b && timeB.current) timeB.current.textContent = last.b = b;
      if (r !== last.rate && rateB.current) rateB.current.textContent = last.rate = r;
      if (l !== last.lag && lag.current) lag.current.textContent = last.lag = l;
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const size = compact ? 56 : 76;
  return (
    <div
      role="group"
      aria-label="Clock comparison"
      className="pointer-events-auto flex items-stretch gap-3 rounded-lg border border-line bg-navy-deep/95 px-3 py-2 shadow-xl"
    >
      <Dial size={size} hand={handA} color="var(--color-phosphor)" title="Clock A" subtitle="far away">
        <span ref={timeA} className="font-digital text-2xl leading-none text-paper">
          00:00.0
        </span>
        <span className="text-xs text-paper-3">100% speed</span>
      </Dial>
      <div className="flex flex-col items-center justify-center px-1 text-center">
        <span className="text-xs text-paper-3">B is behind by</span>
        <span ref={lag} className="font-digital text-3xl leading-none text-amber">
          0.0 s
        </span>
      </div>
      <Dial size={size} hand={handB} color="var(--color-amber)" title="Clock B" subtitle="near the mass">
        <span ref={timeB} className="font-digital text-2xl leading-none text-paper">
          00:00.0
        </span>
        <span ref={rateB} className="text-xs text-paper-3">
          100% speed
        </span>
      </Dial>
    </div>
  );
}

function Dial({
  size,
  hand,
  color,
  title,
  subtitle,
  children,
}: {
  size: number;
  hand: React.RefObject<SVGLineElement | null>;
  color: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
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
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-paper">
          {title} <span className="font-normal text-paper-3">· {subtitle}</span>
        </span>
        {children}
      </div>
    </div>
  );
}
