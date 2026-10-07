"use client";

import { MAX_DEPTH, SKY_COUNT, SKY_RADIUS, TUNNEL_BOTTOM, TUNNEL_TOP } from "@/lib/physics";
import { useLab } from "@/lib/store";
import { useSimSnapshot, type SimSnapshot } from "@/lib/useSimSnapshot";

/** Fixed control console: Mass slider, Photon button, Miraj toggle and live readouts. */
export function ControlPanel() {
  const panelOpen = useLab((s) => s.panelOpen);
  const togglePanel = useLab((s) => s.togglePanel);
  const snap = useSimSnapshot();

  return (
    <aside
      className={`fixed z-40 flex flex-col border-navy-line/70 bg-navy-deep/85 backdrop-blur-md transition-transform duration-300
        inset-x-0 bottom-0 max-h-[52dvh] border-t
        md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:max-h-none md:w-[340px] md:border
        ${panelOpen ? "translate-y-0 md:translate-x-0" : "translate-y-[calc(100%-2.75rem)] md:translate-y-0 md:translate-x-[calc(100%+1rem)]"}`}
    >
      <button
        type="button"
        onClick={togglePanel}
        className="flex h-11 shrink-0 items-center justify-between border-b border-navy-line/70 px-4 text-[11px] tracking-[0.25em] text-paper/80 hover:text-paper"
        aria-expanded={panelOpen}
      >
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-phosphor shadow-[0_0_8px_var(--color-phosphor)]" />
          CONTROL CONSOLE
        </span>
        <span className="text-paper/50">{panelOpen ? "HIDE [H]" : "SHOW [H]"}</span>
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <MassControl snap={snap} />
        <PhotonControl snap={snap} />
        <ClockReadout snap={snap} />
        <MirajControl snap={snap} />
        <KeyLegend />
      </div>
    </aside>
  );
}

function Section({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-navy-line/60 bg-navy/40 p-3">
      <h2 className="mb-2.5 flex items-center gap-2 text-[11px] tracking-[0.22em] text-paper/60">
        <span className="border border-paper/40 px-1 text-paper/80">{tag}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Readout({ label, value, tone = "paper" }: { label: string; value: string; tone?: "paper" | "amber" | "phosphor" | "violet" }) {
  const color = { paper: "text-paper", amber: "text-amber", phosphor: "text-phosphor", violet: "text-violet" }[tone];
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="tracking-wider text-paper/55">{label}</span>
      <span className={`font-digital text-xl leading-none ${color}`}>{value}</span>
    </div>
  );
}

function MassControl({ snap }: { snap: SimSnapshot }) {
  const mass = useLab((s) => s.mass);
  const setMass = useLab((s) => s.setMass);
  const regime = mass === 0 ? "FLAT" : mass < 35 ? "GENTLE CURVE" : mass < 75 ? "DEEP WELL" : "EXTREME";
  return (
    <Section tag="A" title="SPACETIME GRID">
      <label htmlFor="mass" className="flex items-baseline justify-between text-[12px] tracking-[0.18em] text-paper">
        CENTRAL MASS
        <span className="font-digital text-2xl text-amber text-glow">{mass.toString().padStart(3, "0")}</span>
      </label>
      <input
        id="mass"
        type="range"
        min={0}
        max={100}
        step={1}
        value={mass}
        onChange={(e) => setMass(Number(e.target.value))}
        className="lab-range mt-1"
        style={{ ["--fill" as string]: `${mass}%` }}
        aria-valuetext={`Central mass ${mass} of 100`}
      />
      <div className="mt-2 space-y-1">
        <Readout label="WELL DEPTH" value={`${(snap.m * MAX_DEPTH).toFixed(2)} u`} />
        <Readout label="REGIME" value={regime} tone={mass >= 75 ? "amber" : "paper"} />
      </div>
    </Section>
  );
}

function PhotonControl({ snap }: { snap: SimSnapshot }) {
  const fire = useLab((s) => s.firePhoton);
  const miraj = useLab((s) => s.miraj);
  const shot = snap.lastShot;
  let result = "—";
  let tone: "paper" | "amber" | "phosphor" = "paper";
  if (shot) {
    if (shot.captured) {
      result = "CAPTURED";
      tone = "amber";
    } else if (shot.deflection < 0.05) {
      result = "STRAIGHT · 0.0°";
      tone = "phosphor";
    } else {
      result = `BENT ${shot.deflection.toFixed(1)}°`;
      tone = "amber";
    }
  }
  return (
    <Section tag="B" title="GRAVITATIONAL LENSING">
      <button
        type="button"
        onClick={fire}
        className="group relative w-full border border-amber/80 bg-amber/10 px-3 py-2.5 text-[13px] font-semibold tracking-[0.2em] text-amber transition hover:bg-amber hover:text-navy-deep active:translate-y-px"
      >
        {miraj ? "FIRE PHOTON · TUNNEL" : "FIRE PHOTON BEAM"}
        <span className="ml-2 text-[10px] font-normal opacity-60 group-hover:opacity-80">[SPACE]</span>
      </button>
      <div className="mt-2 space-y-1">
        <Readout label="LAST PATH" value={result} tone={tone} />
        {shot && <Readout label="IMPACT b / MASS" value={`${Math.abs(shot.impact).toFixed(1)} u / ${shot.mass}`} />}
      </div>
    </Section>
  );
}

function ClockReadout({ snap }: { snap: SimSnapshot }) {
  const reset = useLab((s) => s.resetClocks);
  const lag = snap.clockA - snap.clockB;
  return (
    <Section tag="C" title="TIME DILATION">
      <div className="space-y-1">
        <Readout label="CLOCK A RATE" value="1.000 s/s" tone="phosphor" />
        <Readout label="CLOCK B RATE" value={`${snap.rateB.toFixed(3)} s/s`} tone="amber" />
        <Readout label="B FALLS BEHIND" value={`${lag.toFixed(1)} s`} />
      </div>
      <div className="mt-2 h-1.5 w-full border border-paper/30">
        <div className="h-full bg-amber transition-[width] duration-200" style={{ width: `${snap.rateB * 100}%` }} />
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-2.5 w-full border border-paper/40 px-3 py-1.5 text-[11px] tracking-[0.2em] text-paper/80 hover:border-paper hover:text-paper"
      >
        SYNCHRONISE CLOCKS [R]
      </button>
    </Section>
  );
}

function MirajControl({ snap }: { snap: SimSnapshot }) {
  const miraj = useLab((s) => s.miraj);
  const toggle = useLab((s) => s.toggleMiraj);
  const status =
    snap.fold >= 1
      ? "BRIDGE OPEN"
      : snap.fold > 0
        ? `${miraj ? "FOLDING" : "UNFOLDING"} ${Math.round(snap.fold * 100)}%`
        : snap.expand > 0
          ? `${miraj ? "SKIES RISING" : "SKIES SETTLING"} ${Math.round(snap.expand * 100)}%`
          : "STANDBY";
  const tunnel = TUNNEL_TOP - TUNNEL_BOTTOM;
  const across = SKY_COUNT * SKY_RADIUS * 2;
  return (
    <Section tag="D" title="SEVEN SKIES · MIRAJ">
      <button
        type="button"
        role="switch"
        aria-checked={miraj}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-3 border px-3 py-3 text-left text-[12px] font-semibold tracking-[0.16em] transition ${
          miraj
            ? "border-violet bg-violet/20 text-paper shadow-[0_0_24px_rgb(192_140_245/0.35)]"
            : "border-violet/70 bg-violet/5 text-violet hover:bg-violet/15"
        }`}
      >
        <span>
          ENGAGE MIRAJ
          <br />
          <span className="font-normal text-[11px] opacity-80">SPACETIME FOLD [M]</span>
        </span>
        <span className={`relative h-6 w-11 shrink-0 border ${miraj ? "border-violet bg-violet/40" : "border-paper/40"}`}>
          <span
            className={`absolute top-0.5 h-4 w-4 transition-all ${miraj ? "left-[22px] bg-paper shadow-[0_0_10px_var(--color-violet)]" : "left-0.5 bg-paper/50"}`}
          />
        </span>
      </button>
      <div className="mt-2 space-y-1">
        <Readout label="STATUS" value={status} tone={snap.fold >= 1 ? "violet" : "paper"} />
        <Readout label="ROUTE ACROSS SKIES" value={`${across.toFixed(0)} u`} />
        <Readout label="ROUTE THROUGH FOLD" value={`${tunnel.toFixed(1)} u`} tone="violet" />
        {snap.transits > 0 && <Readout label="TRANSITS" value={snap.transits.toString()} />}
      </div>
    </Section>
  );
}

function KeyLegend() {
  const rows: [string, string][] = [
    ["DRAG", "rotate 360°"],
    ["SCROLL / PINCH", "zoom"],
    ["RIGHT-DRAG", "pan"],
    ["↑ / ↓", "mass ±5"],
    ["0 / 9", "mass 0 / 100"],
    ["N / I", "next / hide field notes"],
    ["H", "hide console"],
  ];
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 px-1 text-[10px] tracking-wider text-paper/45">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-paper/70">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}
