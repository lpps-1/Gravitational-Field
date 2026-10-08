"use client";

import { useEffect } from "react";
import { TOUR } from "./tour";
import { useLab } from "./store";

/**
 * Keyboard shortcuts for presenters.
 *
 * WCAG 2.1.4: single-key shortcuts never fire while a control has focus, and
 * can be switched off in Settings. Alt+Shift+<the same key> always works, as
 * in PhET simulations; Reset all is only Alt+Shift+Backspace.
 * Page Down / Page Up step through the tour, so presentation clickers work.
 */
const CONTROLS =
  'input,textarea,select,button,a[href],summary,[role=tab],[role=switch],[role=radio],[role=slider],[contenteditable="true"]';

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      const lab = useLab.getState();
      const target = e.target as HTMLElement | null;
      if (target?.closest("dialog") || lab.dialog) return;

      const tag = target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;

      // Tour navigation (clickers send Page Down / Page Up).
      if (lab.tour.active && !typing && (e.key === "PageDown" || e.key === "PageUp")) {
        e.preventDefault();
        const next = lab.tour.step + (e.key === "PageDown" ? 1 : -1);
        if (next >= TOUR.length) lab.endTour();
        else lab.setTourStep(Math.max(0, next));
        return;
      }

      const chord = e.altKey && e.shiftKey;
      if (e.altKey && !chord) return;
      const free = !(target instanceof Element) || !target.closest(CONTROLS);
      if (!chord && (!lab.settings.shortcuts || !free)) return;
      // The explanation panel keeps Space for scrolling.
      if (!chord && e.key === " " && target instanceof Element && target.closest("[role=tabpanel]")) return;

      // With Alt+Shift, e.key can be a different character, so use the physical key.
      const key = chord ? codeToKey(e.code) : e.key.toLowerCase();
      const once = !e.repeat;
      let handled = true;

      switch (key) {
        case " ":
          if (once) lab.firePhoton();
          break;
        case "m":
          if (once) lab.toggleMiraj();
          break;
        case "p":
          if (once) lab.togglePause();
          break;
        case ".":
          lab.step();
          break;
        case "s":
          if (once) lab.setSpeed(lab.speed === 1 ? 0.25 : 1);
          break;
        case "r":
          if (once) lab.resetClocks();
          break;
        case "c": // older chord for Synchronise, kept as an alias
          if (once && chord) lab.resetClocks();
          else handled = false;
          break;
        case "backspace":
          if (!chord) handled = false;
          else if (once) lab.resetAll();
          break;
        case "[":
          if (!lab.miraj) lab.setMass(lab.mass - 5);
          break;
        case "]":
          if (!lab.miraj) lab.setMass(lab.mass + 5);
          break;
        case "0":
          if (!lab.miraj) lab.setMass(0);
          break;
        case "9":
          if (!lab.miraj) lab.setMass(100);
          break;
        case "l":
          if (once) lab.updateSettings({ labels: !lab.settings.labels });
          break;
        case "h":
          if (once) lab.togglePanel();
          break;
        case "t":
          if (once && !lab.tour.active) lab.startTour();
          break;
        case "?":
        case "/":
          if (once) lab.openDialog("keys");
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function codeToKey(code: string): string {
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  const map: Record<string, string> = { Space: " ", Period: ".", BracketLeft: "[", BracketRight: "]", Slash: "?", Backspace: "backspace" };
  return map[code] ?? "";
}
