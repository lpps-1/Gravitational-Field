"use client";

import { chapter } from "@/lib/chapters";
import { MODULES, TRANSLATION_CREDIT, VERSE_FRAMING, type LegendSwatch, type Verse } from "@/lib/content";
import type { ModuleId } from "@/lib/store";
import { CHAPTER_UI } from "./chapters";
import { Kicker } from "./controls";

/**
 * A chapter's notes: the idea in one line, live readouts, things to try, the
 * science, the verse with its framing, a key to the picture and an honest
 * note on scale. Plain reading order, no boxes or accordions to open.
 */
export function ChapterInfo({ id }: { id: ModuleId }) {
  const m = MODULES[id];
  const ch = chapter(id);
  const { Live } = CHAPTER_UI[id];
  return (
    <article aria-labelledby="chapter-heading" className="space-y-6">
      <header>
        <h2 id="chapter-heading" className="text-[1.375rem] leading-tight font-bold">
          <span className="sr-only">Chapter {ch.number}: </span>
          {m.title}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-body">{m.summary}</p>
      </header>

      <Live />

      <section aria-labelledby="try-heading">
        <Kicker id="try-heading">Try this</Kicker>
        <ul className="mt-2.5 space-y-2 text-[0.9375rem] leading-relaxed text-body">
          {m.tryIt.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ice" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="science-heading">
        <Kicker id="science-heading">The science</Kicker>
        <div className="mt-2.5 space-y-3">
          {m.physics.map((p) => (
            <p key={p} className="text-[0.9375rem] leading-relaxed text-body">
              {p}
            </p>
          ))}
        </div>
      </section>

      {m.verse && <VerseBlock verse={m.verse} />}

      <section aria-labelledby="key-heading">
        <Kicker id="key-heading">Key to the picture</Kicker>
        <ul className="mt-2.5 space-y-2">
          {m.legend.map((it) => (
            <li key={it.text} className="flex items-center gap-3 text-sm text-body">
              <span aria-hidden className="flex w-7 shrink-0 items-center justify-center">
                {SWATCH[it.swatch]}
              </span>
              {it.text}
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-rule pt-4 text-xs leading-relaxed text-muted">
        <span className="font-semibold text-body">Scale. </span>
        {m.scale}
      </p>
    </article>
  );
}

function VerseBlock({ verse }: { verse: Verse }) {
  return (
    <section aria-labelledby="verse-heading">
      <Kicker id="verse-heading">Reflection</Kicker>
      <figure className="mt-3 border-s-2 border-violet/70 ps-4">
        <p lang="ar" dir="rtl" className="font-arabic text-[1.375rem] leading-[1.9] text-ink">
          {verse.arabic}
        </p>
        <blockquote className="mt-1.5 text-[0.9375rem] leading-relaxed text-body italic">{verse.translation}</blockquote>
        <figcaption className="mt-2 text-xs text-muted">
          <span className="font-semibold text-violet-text">Quran · {verse.reference}.</span> {TRANSLATION_CREDIT}
          {verse.note && <span> {verse.note}</span>}
        </figcaption>
      </figure>
      <p className="mt-2.5 text-xs leading-relaxed text-muted">{VERSE_FRAMING}</p>
    </section>
  );
}

const SWATCH: Record<LegendSwatch, React.ReactNode> = {
  grid: <span className="h-3 w-6 rounded-sm" style={{ background: "linear-gradient(90deg,#9fd3ff,#ffb45a)" }} />,
  mass: <span className="h-3.5 w-3.5 rounded-full bg-[#ffd08a] shadow-[0_0_8px_#ffb45a]" />,
  body: <span className="h-2.5 w-2.5 rounded-full bg-[#9ec9ff] shadow-[-8px_0_0_-2px_rgba(158,201,255,0.5)]" />,
  outline: <span className="h-3 w-6 rounded-full border border-[#9ec9ff]/70" />,
  photon: <span className="h-1 w-6 rounded bg-gradient-to-r from-transparent to-[#ffdc8c]" />,
  star: <span className="h-3 w-3 rounded-full bg-[#fff1cf]" />,
  guide: <span className="h-0 w-6 border-t-2 border-dashed border-[#8fb8d0]" />,
  observer: <span className="h-3 w-3 rotate-45 border-2 border-phosphor" />,
  apparent: <span className="h-3 w-3 rounded-full border-2 border-dotted border-[#e8d6a8]" />,
  clockA: <span className="h-3 w-3 rotate-45 border-2 border-phosphor" />,
  clockB: <span className="h-3 w-3 rotate-45 border-2 border-amber" />,
  skies: <span className="h-3 w-6 rounded-full" style={{ background: "linear-gradient(90deg,#6fb7ff,#c08cf5,#ffd47a)" }} />,
  tunnelLight: <span className="h-6 w-1 rounded bg-[#f3eaff] shadow-[0_0_6px_#c08cf5]" />,
  sun: <span className="h-4 w-4 rounded-full shadow-[0_0_10px_#ff9a3c]" style={{ background: "radial-gradient(circle at 40% 40%,#fff4c8,#ffb347 55%,#e8661c)" }} />,
  planet: <span className="h-3 w-3 rounded-full" style={{ background: "radial-gradient(circle at 30% 30%,#a9cbff,#3b66b0 60%,#0d1f3d)" }} />,
  planetOrbit: <span className="h-3 w-6 rounded-[50%] border border-[#6ea8ff]/80" />,
  fabric: (
    <span
      className="h-3 w-6 rounded-b-full border-b-2 border-[#9fd3ff]"
      style={{ background: "radial-gradient(circle at 50% 100%,rgb(255 180 90/0.8),transparent 70%)" }}
    />
  ),
  belt: <span className="h-0 w-6 border-t-2 border-dotted border-[#a8957c]" />,
  shadow: <span className="h-4 w-4 rounded-full bg-black shadow-[0_0_0_1.5px_#ffd9a0]" />,
  photonRing: <span className="h-4 w-4 rounded-full border-2 border-[#ffe3b3] shadow-[0_0_6px_#ffb066]" />,
  disk: <span className="h-2 w-6 rounded-full" style={{ background: "linear-gradient(90deg,#fff1d6,#ff9d4a 45%,#a8360f)" }} />,
  arc: <span className="h-3 w-6 rounded-t-full border-2 border-b-0 border-[#f3d9a8]" />,
};
