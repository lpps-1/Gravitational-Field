"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A button that shows a small panel of choices (WAI-ARIA disclosure). The
 * panel closes on Escape (focus returns to the button), on a click outside,
 * when focus leaves it, and after a choice.
 */
export function Popover({
  trigger,
  label,
  placement = "bottom-end",
  className = "",
  panelClassName = "",
  children,
}: {
  /** Contents of the toggle button (an icon, a label…). */
  trigger: (open: boolean) => React.ReactNode;
  /** Accessible name of the toggle button when its contents are only an icon. */
  label?: string;
  placement?: "bottom-end" | "bottom-start" | "bottom-center" | "top-end" | "top-start" | "top-center";
  className?: string;
  panelClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const position = {
    "bottom-end": "top-full end-0 mt-2",
    "bottom-start": "top-full start-0 mt-2",
    "bottom-center": "top-full left-1/2 mt-2 -translate-x-1/2",
    "top-end": "bottom-full end-0 mb-2",
    "top-start": "bottom-full start-0 mb-2",
    "top-center": "bottom-full left-1/2 mb-2 -translate-x-1/2",
  }[placement];

  return (
    <div
      ref={root}
      className={`relative ${className}`}
      onBlur={(e) => {
        if (open && !root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-transparent px-2.5 font-display text-sm font-semibold text-ink transition-colors hover:bg-white/10 aria-expanded:bg-white/10 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
      >
        {trigger(open)}
      </button>
      <div
        id={id}
        hidden={!open}
        className={`absolute z-50 min-w-[14rem] rounded-[16px] border border-white/16 bg-panel p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.45)] ${position} ${panelClassName}`}
      >
        {open && children(close)}
      </div>
    </div>
  );
}

/** One choice in a Popover. */
export function PopoverItem({
  children,
  onClick,
  current,
  hint,
  className = "",
  ...rest
}: Omit<React.ComponentProps<"button">, "onClick"> & { onClick: () => void; current?: boolean; hint?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "true" : undefined}
      className={`flex min-h-10 w-full items-center justify-between gap-4 rounded-[11px] px-3 text-start text-sm transition-colors pointer-coarse:min-h-11 ${
        current ? "bg-white/10 font-semibold text-ink" : "text-body hover:bg-white/8 hover:text-ink"
      } ${className}`}
      {...rest}
    >
      <span className="flex items-center gap-2.5">{children}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </button>
  );
}
