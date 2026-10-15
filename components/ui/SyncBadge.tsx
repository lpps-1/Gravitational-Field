"use client";

import { useSimValue } from "@/lib/hooks";
import { displayConnected } from "@/lib/sync";

/**
 * Shown in the navigation in `?mode=control`: this window drives a display
 * (lib/sync.ts). The dot lights up while a display window is following.
 */
export function SyncBadge() {
  const connected = useSimValue(displayConnected);
  return (
    <p
      role="status"
      title={connected ? "A display window is following this one" : "No display window yet: open the lab with ?mode=display"}
      className="kicker inline-flex shrink-0 items-center gap-2 rounded-full border border-amber/60 bg-amber/10 px-2.5 py-1 text-[0.6875rem] tracking-[0.16em] text-amber"
    >
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-phosphor shadow-[0_0_6px_var(--color-phosphor)]" : "bg-muted"}`}
      />
      {/* Where the bar is tight (phones, and just after the chapters unfold, 70–80rem) the badge
          shortens to "TV"; screen readers always hear the whole label. */}
      <span className="@max-[44rem]:sr-only @min-[70rem]:@max-[80rem]:sr-only">CONTROLLING TV</span>
      <span aria-hidden className="hidden @max-[44rem]:inline @min-[70rem]:@max-[80rem]:inline">
        TV
      </span>
      <span className="sr-only">{connected ? ", display connected" : ", no display connected"}</span>
    </p>
  );
}
