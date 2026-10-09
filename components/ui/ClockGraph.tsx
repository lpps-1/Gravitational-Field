"use client";

import { useCallback, useRef, useState } from "react";
import { useTicker } from "@/lib/hooks";
import { CLOCK_SAMPLE_SECONDS, sim } from "@/lib/store";

const W = 320;
const H = 168;
const M = { top: 12, right: 30, bottom: 34, left: 40 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

/**
 * Live line chart: what each clock reads as time passes. Clock A climbs at one
 * second per second (the diagonal); Clock B's line is flatter when it ticks
 * slower. Two series → legend plus direct end labels; hover shows a crosshair
 * with both readings. Updated 8× a second without React re-renders.
 */
export function ClockGraph() {
  const lineA = useRef<SVGPolylineElement>(null);
  const lineB = useRef<SVGPolylineElement>(null);
  const endA = useRef<SVGGElement>(null);
  const endB = useRef<SVGGElement>(null);
  const yTicks = useRef<SVGGElement>(null);
  const xLabels = useRef<SVGGElement>(null);
  const empty = useRef<SVGTextElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);
  const [hover, setHover] = useState<null | { x: number; a: number; b: number; t: number }>(null);
  const hoverFrac = useRef<number | null>(null);

  const scales = () => {
    const n = sim.historyCount;
    const a0 = sim.historyA[0];
    const a1 = sim.historyA[Math.max(0, n - 1)];
    const lo = Math.min(a0, sim.historyB[0]);
    const xSpan = Math.max(1, a1 - a0);
    const ySpan = Math.max(1, a1 - lo);
    return {
      n,
      x: (v: number) => M.left + ((v - a0) / xSpan) * PW,
      y: (v: number) => M.top + PH - ((v - lo) / ySpan) * PH,
      a0,
      a1,
      lo,
    };
  };

  const pickHover = useCallback((frac: number) => {
    const n = sim.historyCount;
    if (n < 2) return setHover(null);
    const i = Math.round(frac * (n - 1));
    const s = scales();
    setHover({ x: s.x(sim.historyA[i]), a: sim.historyA[i], b: sim.historyB[i], t: i });
  }, []);

  const draw = useCallback(() => {
    const s = scales();
    const has = s.n >= 2;
    if (empty.current) empty.current.style.display = has ? "none" : "";
    if (!has) {
      lineA.current?.setAttribute("points", "");
      lineB.current?.setAttribute("points", "");
      return;
    }
    let pa = "";
    let pb = "";
    for (let i = 0; i < s.n; i++) {
      const x = s.x(sim.historyA[i]).toFixed(1);
      pa += `${x},${s.y(sim.historyA[i]).toFixed(1)} `;
      pb += `${x},${s.y(sim.historyB[i]).toFixed(1)} `;
    }
    lineA.current?.setAttribute("points", pa);
    lineB.current?.setAttribute("points", pb);
    const last = s.n - 1;
    endA.current?.setAttribute("transform", `translate(${s.x(sim.historyA[last])},${s.y(sim.historyA[last])})`);
    endB.current?.setAttribute("transform", `translate(${s.x(sim.historyA[last])},${s.y(sim.historyB[last])})`);

    // Three recessive y gridlines with second labels, and the x range.
    if (yTicks.current) {
      const ticks = yTicks.current.children;
      for (let k = 0; k < 3; k++) {
        const v = s.lo + ((s.a1 - s.lo) * k) / 2;
        const g = ticks[k] as SVGGElement;
        g.setAttribute("transform", `translate(0,${s.y(v)})`);
        (g.lastElementChild as SVGTextElement).textContent = `${Math.round(v)}`;
      }
    }
    if (xLabels.current) {
      (xLabels.current.children[0] as SVGTextElement).textContent = `${Math.round(s.a0)} s`;
      (xLabels.current.children[1] as SVGTextElement).textContent = `${Math.round(s.a1)} s`;
    }
    if (summary.current) {
      const a = sim.historyA[last];
      const b = sim.historyB[last];
      summary.current.textContent = `Over the last ${Math.round((s.n - 1) * CLOCK_SAMPLE_SECONDS)} seconds, Clock A advanced ${(a - s.a0).toFixed(1)} s and Clock B advanced ${(b - sim.historyB[0]).toFixed(1)} s.`;
    }
    if (hoverFrac.current !== null) pickHover(hoverFrac.current);
  }, [pickHover]);

  useTicker(draw);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    hoverFrac.current = frac;
    pickHover(frac);
  };
  const onLeave = () => {
    hoverFrac.current = null;
    setHover(null);
  };

  return (
    <figure className="mt-2">
      <figcaption className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-body">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-series-a" /> Clock A (far away)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-series-b" /> Clock B (near the mass)
        </span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graph of what Clock A and Clock B read as time passes">
          <g ref={yTicks} aria-hidden>
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <line x1={M.left} x2={M.left + PW} stroke="#ffffff" strokeOpacity={0.12} strokeWidth={1} />
                <text x={M.left - 6} dy="0.32em" textAnchor="end" fontSize={12} fill="#a3a9b4">
                  0
                </text>
              </g>
            ))}
          </g>
          <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1} />
          <g ref={xLabels} aria-hidden fontSize={12} fill="#a3a9b4">
            <text x={M.left} y={H - 16}>
              0 s
            </text>
            <text x={M.left + PW} y={H - 16} textAnchor="end">
              0 s
            </text>
          </g>
          <text x={M.left + PW / 2} y={H - 2} textAnchor="middle" fontSize={12} fill="#c3c8d1">
            Time on Clock A →
          </text>
          <text transform={`translate(11,${M.top + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="#c3c8d1">
            Reading (s)
          </text>
          <text ref={empty} x={M.left + PW / 2} y={M.top + PH / 2} textAnchor="middle" fontSize={12} fill="#a3a9b4">
            Collecting readings…
          </text>
          <polyline ref={lineA} fill="none" stroke="var(--color-series-a)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <polyline ref={lineB} fill="none" stroke="var(--color-series-b)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <g ref={endA} aria-hidden>
            <circle r={4} fill="var(--color-series-a)" stroke="#0e2347" strokeWidth={2} />
            <text x={7} dy="0.32em" fontSize={12} fontWeight={600} fill="#ffffff">
              A
            </text>
          </g>
          <g ref={endB} aria-hidden>
            <circle r={4} fill="var(--color-series-b)" stroke="#0e2347" strokeWidth={2} />
            <text x={7} dy="0.32em" fontSize={12} fontWeight={600} fill="#ffffff">
              B
            </text>
          </g>
          {hover && (
            <line x1={hover.x} x2={hover.x} y1={M.top} y2={M.top + PH} stroke="#ffffff" strokeOpacity={0.6} strokeDasharray="3 3" />
          )}
          <rect
            x={M.left}
            y={M.top}
            width={PW}
            height={PH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onPointerDown={onMove}
          />
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute top-1 rounded-[10px] border border-rule-strong bg-page px-2 py-1 text-xs text-ink shadow-lg"
            style={{ left: `${(hover.x / W) * 100}%`, transform: hover.x > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
          >
            <div>
              A: <span className="tabular-nums">{hover.a.toFixed(1)} s</span>
            </div>
            <div>
              B: <span className="tabular-nums">{hover.b.toFixed(1)} s</span>
            </div>
            <div className="text-muted">B behind by {(hover.a - hover.b).toFixed(1)} s</div>
          </div>
        )}
      </div>
      <p ref={summary} className="sr-only" />
    </figure>
  );
}
