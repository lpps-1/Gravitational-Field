"use client";

import { useLab, type ModuleId } from "@/lib/store";

interface Note {
  title: string;
  physics: string;
  arabic?: string;
  verse?: string;
  ref?: string;
  tryIt: string;
}

/**
 * Short explanations for each module: the physics, the Quranic concept it is
 * paired with, and something to try. Opens on whichever module was used last.
 */
export const NOTES: Record<ModuleId, Note> = {
  A: {
    title: "SPACETIME CURVATURE · YASBAHUN",
    physics:
      "In General Relativity (Einstein, 1915) mass curves the fabric of spacetime. Nothing pulls a planet along on a rope. It moves in free fall along the straightest path the curved geometry allows, and that path closes into an orbit.",
    arabic: "كُلٌّ فِي فَلَكٍ يَسْبَحُونَ",
    verse: "“Each is floating (yasbahūn) in an orbit.”",
    ref: "Al-Anbiyāʾ 21:33 · Yā-Sīn 36:40",
    tryIt: "Raise the Central Mass. The well deepens and every orbit speeds up. The elliptical orbit is fastest closest to the centre (Kepler's second law).",
  },
  B: {
    title: "GRAVITATIONAL LENSING",
    physics:
      "Light has no mass, but it still follows the curves of spacetime. GR predicts that starlight grazing the Sun bends by 1.75″, twice the Newtonian value. Eddington's eclipse expedition confirmed it in 1919. Astronomers now use lensing to map dark matter and to see galaxies hidden behind other galaxies.",
    tryIt: "Set the mass to 0 and fire: the beam flies straight. Turn the mass up and fire again: the beam bends around the well. The dashed line shows the straight path. At high mass a close beam is captured.",
  },
  C: {
    title: "GRAVITATIONAL TIME DILATION",
    physics:
      "Clocks deeper in a gravity well run slower: dτ/dt = √(1 − rₛ/r). Pound and Rebka measured the effect up a 22.5 m tower in 1959. GPS satellites sit higher in Earth's well, so their clocks run about 45 μs per day fast. The system has to correct for this to work.",
    arabic: "وَإِنَّ يَوْمًا عِندَ رَبِّكَ كَأَلْفِ سَنَةٍ مِّمَّا تَعُدُّونَ",
    verse: "“A day with your Lord is like a thousand years of those which you count.”",
    ref: "Al-Ḥajj 22:47",
    tryIt: "Press R to synchronise the clocks, then raise the mass. Clock B's tick light pulses more slowly and its lag keeps growing.",
  },
  D: {
    title: "THE SEVEN SKIES · MIRAJ",
    physics:
      "Einstein and Rosen (1935) showed that the equations of GR allow a 'bridge' between distant regions of spacetime. If the fabric is folded, a path through the throat can be far shorter than any route across the surface. Traversable wormholes remain theoretical. Here the model is used as an aid to reflection.",
    arabic: "سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا",
    verse: "“Exalted is He who took His servant by night…” · “…who created seven heavens in layers.”",
    ref: "Al-Isrāʾ 17:1 · Al-Mulk 67:3",
    tryIt: "Engage the Miraj, then press SPACE to send more light through the tunnel. Orbit underneath and look straight up the throat.",
  },
};

const ORDER: ModuleId[] = ["A", "B", "C", "D"];

export function FieldNotes() {
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const notesOpen = useLab((s) => s.notesOpen);
  const toggleNotes = useLab((s) => s.toggleNotes);
  const note = NOTES[focus];

  return (
    <div className="pointer-events-auto w-full max-w-[460px] border border-navy-line/70 bg-navy-deep/80 backdrop-blur-md">
      <div className="flex border-b border-navy-line/70" role="tablist" aria-label="Field notes">
        {ORDER.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={focus === id}
            onClick={() => setFocus(id)}
            className={`flex-1 py-1.5 text-[11px] tracking-[0.25em] transition ${
              focus === id ? "bg-paper text-navy-deep" : "text-paper/60 hover:bg-paper/10 hover:text-paper"
            }`}
          >
            MOD {id}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleNotes}
          aria-expanded={notesOpen}
          aria-label={notesOpen ? "Collapse field notes" : "Expand field notes"}
          className="border-l border-navy-line/70 px-3 text-[11px] text-paper/60 hover:bg-paper/10 hover:text-paper"
        >
          {notesOpen ? "▾" : "▴"}
        </button>
      </div>
      <div className={`space-y-2.5 p-4 ${notesOpen ? "" : "hidden"}`} role="tabpanel">
        <h3 className="text-[12px] font-semibold tracking-[0.2em] text-amber">{note.title}</h3>
        <p className="text-[12px] leading-relaxed text-paper/85">{note.physics}</p>
        {note.arabic && (
          <figure className="border-l-2 border-violet/70 pl-3">
            <p dir="rtl" lang="ar" className="text-right font-serif text-lg leading-snug text-paper">
              {note.arabic}
            </p>
            <blockquote className="mt-1 text-[11.5px] italic leading-snug text-paper/80">{note.verse}</blockquote>
            <figcaption className="mt-0.5 text-[10px] tracking-wider text-violet">QURAN · {note.ref}</figcaption>
          </figure>
        )}
        <p className="text-[11px] leading-relaxed text-phosphor/90">
          <span className="mr-1 tracking-[0.2em]">TRY ▸</span>
          {note.tryIt}
        </p>
      </div>
    </div>
  );
}
