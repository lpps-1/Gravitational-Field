"use client";

import { useId } from "react";

/**
 * Shared interface primitives. All targets are at least 40×40 px (44 on touch),
 * text is at least 12 px, and states never rely on colour alone.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "violet";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-amber bg-amber text-navy-deep hover:bg-[#ffc47d]",
  secondary: "border-line-strong bg-navy-raised text-paper hover:border-paper hover:bg-[#21396a]",
  ghost: "border-transparent bg-transparent text-paper-2 hover:bg-navy-raised hover:text-paper",
  violet: "border-violet bg-[#2c2350] text-paper hover:bg-[#3a2d66]",
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...rest
}: React.ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Keyboard hint; hidden from screen readers (use aria-keyshortcuts instead) and on touch screens. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd aria-hidden className="pointer-coarse:hidden">
      {children}
    </kbd>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  shortcut,
  keyshortcuts,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  shortcut?: string;
  keyshortcuts?: string;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={description ? `${id}-desc` : undefined}
      aria-keyshortcuts={keyshortcuts}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-start transition-[background-color,border-color] pointer-coarse:min-h-11 ${
        checked ? "border-violet bg-[#2c2350]" : "border-line-strong bg-navy-raised hover:border-paper"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-paper">{label}</span>
        {description && (
          <span id={`${id}-desc`} className="block text-xs text-paper-3">
            {description}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {shortcut && <Kbd>{shortcut}</Kbd>}
        <span className="text-xs font-semibold text-paper-2">{checked ? "On" : "Off"}</span>
        <span
          aria-hidden
          className={`relative h-6 w-11 rounded-full border transition-colors ${checked ? "border-violet-text bg-violet" : "border-line-strong bg-navy-deep"}`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-[left] ${checked ? "left-[1.3rem] bg-navy-deep" : "left-0.5 bg-paper-2"}`}
          />
        </span>
      </span>
    </button>
  );
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  display,
  ticks,
  disabled,
  fillColor,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueText: string;
  display: React.ReactNode;
  ticks?: { at: number; label: string }[];
  disabled?: boolean;
  fillColor?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={disabled ? "opacity-60" : ""}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-paper">
          {label}
        </label>
        <output htmlFor={id} className="font-digital text-2xl leading-none text-amber" aria-hidden>
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={valueText}
        className="lab-range mt-1"
        style={{ ["--fill" as string]: `${fill}%`, ["--track-fill" as string]: fillColor }}
      />
      {ticks && (
        <div aria-hidden className="relative mt-0.5 h-4 text-xs text-paper-3">
          {ticks.map((t) => (
            <span
              key={t.at}
              className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${((t.at - min) / (max - min)) * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A label/value pair inside a <dl>. */
export function Readout({
  label,
  children,
  tone = "paper",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "paper" | "amber" | "phosphor" | "violet";
}) {
  const color = { paper: "text-paper", amber: "text-amber", phosphor: "text-phosphor", violet: "text-violet-text" }[tone];
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-sm text-paper-3">{label}</dt>
      <dd className={`text-end text-sm font-medium tabular-nums ${color}`}>{children}</dd>
    </div>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-paper-2">
      {children}
    </h2>
  );
}
