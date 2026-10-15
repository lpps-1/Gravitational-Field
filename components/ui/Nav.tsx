"use client";

import { useRef } from "react";
import { CHAPTERS, chapter } from "@/lib/chapters";
import { useLab } from "@/lib/store";
import { syncMode } from "@/lib/sync";
import { ChevronDownIcon, HelpIcon, InfoIcon, KeyboardIcon, MenuIcon, SettingsIcon, TourIcon } from "./icons";
import { Popover, PopoverItem } from "./Popover";
import { SyncBadge } from "./SyncBadge";

/**
 * The floating navigation bar, as on the team site: the LPPS mark and the
 * lab's name, the six chapters, then the tour, the chapter notes and a menu.
 * On narrow screens (or large text) the chapters fold into one picker.
 */
export function Nav({ navRef }: { navRef: React.RefObject<HTMLElement | null> }) {
  return (
    <header
      ref={navRef}
      className="glass @container pointer-events-auto absolute inset-x-3 top-3 z-40 flex min-h-14 items-center gap-2 rounded-[22px] py-1.5 ps-3 pe-1.5"
    >
      <Brand />
      {syncMode === "control" && <SyncBadge />}
      <ChapterLinks />
      <ChapterPicker />
      <div className="ms-auto flex shrink-0 items-center gap-0.5">
        <TourButton />
        <NotesButton />
        <MainMenu />
      </div>
    </header>
  );
}

function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 pe-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- a 3 KB mark; no image pipeline needed */}
      <img src="/brand/lpps-logo-white.webp" alt="" width={20} height={28} className="h-7 w-auto" />
      {/* On narrow bars only the mark shows; the name stays for screen readers. */}
      <h1 className="text-[0.9375rem] leading-tight font-bold tracking-[0.01em] whitespace-nowrap text-ink @max-[30rem]:sr-only">
        <span className="sr-only">Azeemi Gala · </span>Spacetime Lab<span className="sr-only"> by Team LPPS</span>
      </h1>
    </div>
  );
}

/** The six chapters as links in the bar (wide screens). */
function ChapterLinks() {
  const focus = useLab((s) => s.focus);
  const goToChapter = useLab((s) => s.goToChapter);
  const list = useRef<HTMLOListElement>(null);

  // Left and Right move between the chapters, as in a menu bar; Tab still moves on.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = CHAPTERS.length;
    const next = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
    if (next < 0) return;
    e.preventDefault();
    list.current?.querySelectorAll("button")[next]?.focus();
  };

  return (
    <nav aria-label="Chapters" className="mx-auto hidden min-w-0 @min-[70rem]:block">
      <ol ref={list} className="flex items-center gap-0.5">
        {CHAPTERS.map((c, i) => {
          const on = c.id === focus;
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                aria-keyshortcuts={String(i + 1)}
                onClick={() => goToChapter(c.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-display text-sm whitespace-nowrap transition-colors ${
                  on
                    ? "bg-white/14 font-semibold text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.28)]"
                    : "font-medium text-body hover:bg-white/8 hover:text-ink"
                }`}
              >
                <span aria-hidden className={`hidden font-mono text-[0.6875rem] @min-[86rem]:inline ${on ? "text-ice" : "text-muted"}`}>
                  {c.number}
                </span>
                {c.short}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** One button showing the chapter on view; it opens the list (narrow screens). */
function ChapterPicker() {
  const focus = useLab((s) => s.focus);
  const goToChapter = useLab((s) => s.goToChapter);
  const current = chapter(focus);
  return (
    <nav aria-label="Chapters" className="mx-auto min-w-0 @min-[70rem]:hidden">
      <Popover
        placement="bottom-center"
        trigger={(open) => (
          <>
            <span className="sr-only">Chapter </span>
            <span className="font-mono text-xs text-ice">{current.number}</span>
            <span className="truncate">{current.short}</span>
            <ChevronDownIcon className={`h-4 w-4 shrink-0 text-body transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      >
        {(close) =>
          CHAPTERS.map((c, i) => (
            <PopoverItem
              key={c.id}
              current={c.id === focus}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => {
                goToChapter(c.id);
                close();
              }}
            >
              <span aria-hidden className="w-5 font-mono text-xs text-muted">
                {c.number}
              </span>
              {c.short}
            </PopoverItem>
          ))
        }
      </Popover>
    </nav>
  );
}

function TourButton() {
  const active = useLab((s) => s.tour.active);
  const startTour = useLab((s) => s.startTour);
  if (active) return null;
  return (
    <button
      id="start-tour"
      type="button"
      onClick={startTour}
      aria-keyshortcuts="T"
      title="Guided tour (T)"
      className="hidden min-h-10 items-center gap-2 rounded-full px-3 font-display text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-white/10 @min-[42rem]:inline-flex"
    >
      <TourIcon className="h-4 w-4" />
      Tour
    </button>
  );
}

function NotesButton() {
  const open = useLab((s) => s.panelOpen);
  const togglePanel = useLab((s) => s.togglePanel);
  return (
    <button
      id="show-notes"
      type="button"
      onClick={togglePanel}
      aria-controls="info-panel"
      aria-expanded={open}
      aria-keyshortcuts="H"
      title={`${open ? "Hide" : "Show"} the chapter notes (H)`}
      className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 font-display text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-white/10 aria-expanded:bg-white/10 pointer-coarse:min-h-11"
    >
      <InfoIcon className="h-5 w-5" />
      <span className="hidden @min-[42rem]:inline">Notes</span>
      <span className="sr-only @min-[42rem]:hidden">Chapter notes</span>
    </button>
  );
}

function MainMenu() {
  const openDialog = useLab((s) => s.openDialog);
  const startTour = useLab((s) => s.startTour);
  const tourActive = useLab((s) => s.tour.active);
  return (
    <Popover label="Menu" trigger={() => <MenuIcon className="h-5 w-5" />}>
      {(close) => (
        <>
          {!tourActive && (
            <PopoverItem
              className="@min-[42rem]:hidden"
              onClick={() => {
                close();
                startTour();
              }}
            >
              <TourIcon className="h-4 w-4 text-ice" />
              Guided tour
            </PopoverItem>
          )}
          <PopoverItem
            onClick={() => {
              close();
              openDialog("about");
            }}
          >
            <HelpIcon className="h-4 w-4 text-ice" />
            About this lab
          </PopoverItem>
          <PopoverItem
            className="pointer-coarse:hidden"
            hint={<kbd>?</kbd>}
            onClick={() => {
              close();
              openDialog("keys");
            }}
          >
            <KeyboardIcon className="h-4 w-4 text-ice" />
            Keyboard shortcuts
          </PopoverItem>
          <PopoverItem
            onClick={() => {
              close();
              openDialog("settings");
            }}
          >
            <SettingsIcon className="h-4 w-4 text-ice" />
            Settings
          </PopoverItem>
        </>
      )}
    </Popover>
  );
}
