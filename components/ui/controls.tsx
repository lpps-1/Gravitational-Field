"use client";

import { useId, useRef } from "react";

/**
 * Shared interface primitives in the LPPS style: Montserrat labels, 14px
 * corners, outlined buttons with a solid white primary. All targets are at
 * least 36×36 px (44 on touch), text is at least 12 px, and states never rely
 * on colour alone.
 */

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-white bg-white text-page hover:bg-[#dfe9fb] hover:border-[#dfe9fb]",
  secondary: "border-rule-strong bg-panel/60 text-ink hover:border-white hover:bg-raised",
  ghost: "border-transparent bg-transparent text-body hover:bg-white/8 hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-10 gap-2 rounded-[14px] px-4 text-sm",
  sm: "min-h-9 gap-1.5 rounded-[12px] px-3 text-[0.8125rem]",
  icon: "h-10 w-10 shrink-0 rounded-full",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center border font-display font-semibold whitespace-nowrap transition-[background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:min-h-11 ${
        size === "icon" ? "pointer-coarse:h-11 pointer-coarse:w-11" : ""
      } ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
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

/**
 * An on/off switch. "card" fills its row with the label and a description;
 * "inline" is a compact pill for the dock.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  shortcut,
  keyshortcuts,
  variant = "card",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  shortcut?: string;
  keyshortcuts?: string;
  variant?: "card" | "inline";
}) {
  const id = useId();
  const track = (
    <span
      aria-hidden
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? "border-ice bg-ice" : "border-rule-strong bg-white/5"}`}
    >
      <span
        className={`absolute top-[3px] h-3 w-3 rounded-full transition-[left] ${checked ? "left-[1.1rem] bg-page" : "left-[3px] bg-body"}`}
      />
    </span>
  );

  if (variant === "inline") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        aria-keyshortcuts={keyshortcuts}
        title={description}
        onClick={() => onChange(!checked)}
        className={`inline-flex min-h-9 items-center gap-2 rounded-full border ps-3 pe-2 font-display text-[0.8125rem] font-semibold whitespace-nowrap transition-[background-color,border-color] pointer-coarse:min-h-11 ${
          checked ? "border-ice/70 bg-raised text-ink" : "border-rule-strong bg-panel/60 text-ink hover:border-white"
        }`}
      >
        <span id={`${id}-label`}>{label}</span>
        {description && (
          <span id={`${id}-desc`} className="sr-only">
            {description}
          </span>
        )}
        {shortcut && <Kbd>{shortcut}</Kbd>}
        {track}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      // Named by the label alone: the description is separate and the On/Off text repeats aria-checked.
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-desc` : undefined}
      aria-keyshortcuts={keyshortcuts}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2.5 text-start transition-[background-color,border-color] pointer-coarse:min-h-11 ${
        checked ? "border-ice/70 bg-raised" : "border-rule-strong hover:border-white"
      }`}
    >
      <span className="min-w-0">
        <span id={`${id}-label`} className="block font-display text-sm font-semibold text-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="block text-xs text-muted">
            {description}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {shortcut && <Kbd>{shortcut}</Kbd>}
        <span aria-hidden className="w-6 text-end text-xs font-semibold text-body">
          {checked ? "On" : "Off"}
        </span>
        {track}
      </span>
    </button>
  );
}

/**
 * A range slider. "stacked" puts the label and value above the track (panel
 * and dialogs); "inline" puts them on one line with it (the dock).
 */
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
  variant = "stacked",
  className = "",
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
  variant?: "stacked" | "inline";
  className?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  const input = (
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
      className={`lab-range ${variant === "inline" ? "w-28 min-w-16 shrink @min-[60rem]:w-32" : "mt-1"}`}
      style={{ ["--fill" as string]: `${fill}%`, ["--track-fill" as string]: fillColor }}
    />
  );

  if (variant === "inline") {
    return (
      <div className={`flex min-h-9 min-w-0 items-center gap-2.5 ${disabled ? "opacity-55" : ""} ${className}`}>
        <label htmlFor={id} className="font-display text-[0.8125rem] font-semibold whitespace-nowrap text-ink">
          {label}
        </label>
        {input}
        <output htmlFor={id} aria-hidden className="min-w-[2.25rem] font-mono text-sm font-semibold whitespace-nowrap text-ink tabular-nums">
          {display}
        </output>
      </div>
    );
  }

  return (
    <div className={`${disabled ? "opacity-55" : ""} ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-display text-sm font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} aria-hidden className="font-mono text-base font-semibold text-ink tabular-nums">
          {display}
        </output>
      </div>
      {input}
      {ticks && (
        <div aria-hidden className="relative mt-0.5 h-4 text-xs text-muted">
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

/**
 * A pill-shaped radio group (WAI-ARIA radio pattern): one tab stop, the arrow
 * keys, Home and End choose.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  suffix,
  className = "",
}: {
  /** Accessible name of the group. */
  label: string;
  options: readonly { value: T; label: React.ReactNode; name?: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Quiet text after the options, e.g. "per second". */
  suffix?: string;
  className?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((o) => o.value === value);

  const choose = (i: number) => {
    onChange(options[i].value);
    buttons.current[i]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = options.length;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (index + 1) % n
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (index - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    choose(next);
  };

  return (
    <div className={`inline-flex items-center rounded-full border border-rule-strong bg-panel/60 p-0.5 ${suffix ? "pe-3" : ""} ${className}`}>
      <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex">
        {options.map((o, i) => {
          const on = i === index;
          return (
            <button
              key={String(o.value)}
              ref={(b) => void (buttons.current[i] = b)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.name}
              tabIndex={on || (index < 0 && i === 0) ? 0 : -1}
              onClick={() => choose(i)}
              className={`min-h-8 rounded-full px-2.5 font-display text-[0.8125rem] font-semibold whitespace-nowrap transition-colors pointer-coarse:min-h-11 ${
                on ? "bg-white text-page" : "text-body hover:bg-white/8 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {suffix && (
        <span aria-hidden className="ps-2 text-xs whitespace-nowrap text-muted">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** A label/value pair inside a <dl>. */
export function Readout({
  label,
  children,
  tone = "ink",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  tone?: "ink" | "ice" | "amber" | "phosphor" | "violet";
}) {
  const color = { ink: "text-ink", ice: "text-ice", amber: "text-amber", phosphor: "text-phosphor", violet: "text-violet-text" }[tone];
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-1.5 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-end text-sm font-semibold tabular-nums ${color}`}>{children}</dd>
    </div>
  );
}

/** A small letter-spaced heading with a leading rule, as on the team site: "—— THE SCIENCE". */
export function Kicker({
  children,
  id,
  as: Tag = "h3",
  className = "",
}: {
  children: React.ReactNode;
  id?: string;
  as?: "h2" | "h3" | "h4" | "p";
  className?: string;
}) {
  return (
    <Tag id={id} className={`kicker flex items-center gap-2.5 before:h-px before:w-6 before:shrink-0 before:bg-ice/50 ${className}`}>
      {children}
    </Tag>
  );
}

/** "rₛ", the horizon radius, with a real subscript (the ₛ character is missing from many fonts). */
export function Rs() {
  return (
    <>
      r<sub>s</sub>
    </>
  );
}
