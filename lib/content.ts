import type { ModuleId } from "./store";

/**
 * All explanatory text in one place, so it can be reviewed (and translated)
 * without touching the components.
 */

export interface Verse {
  arabic: string;
  translation: string;
  reference: string;
  note?: string;
}

export type LegendSwatch =
  | "grid"
  | "mass"
  | "body"
  | "outline"
  | "photon"
  | "star"
  | "guide"
  | "observer"
  | "apparent"
  | "clockA"
  | "clockB"
  | "skies"
  | "tunnelLight";

export interface ModuleContent {
  /** Short tab name. */
  tab: string;
  title: string;
  /** One-sentence summary shown above the explanation. */
  summary: string;
  physics: string[];
  tryIt: string[];
  verse?: Verse;
  /** Honest note about scale and simplifications. */
  scale: string;
  legend: { swatch: LegendSwatch; text: string }[];
}

/** Shown under every verse. */
export const VERSE_FRAMING =
  "Shown alongside the science as a theme for reflection. The science is not offered as proof of scripture, nor scripture as a prediction of the science.";

export const TRANSLATION_CREDIT = "Translation: Sahih International.";

export const MODULES: Record<ModuleId, ModuleContent> = {
  A: {
    tab: "Curved space",
    title: "Spacetime curvature · Yasbaḥūn",
    summary: "Mass curves spacetime, and bodies move freely along that curve: an orbit.",
    physics: [
      "In Einstein's General Relativity (1915), mass curves spacetime. A planet is not pulled along on a rope: it moves freely along the straightest path the curved geometry allows, and around a mass that path closes into an orbit.",
      "The sinking grid is a picture of that curvature. Real spacetime has no “down”; the 2-D sheet is a teaching analogy.",
    ],
    tryIt: [
      "Raise the central mass: the well deepens and every orbit speeds up.",
      "Follow the elliptical orbit: the body moves fastest when it is closest to the mass (Kepler's second law).",
      "Set the mass to 0: with nothing to orbit, the bodies fly off in straight lines.",
    ],
    verse: {
      arabic: "وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ",
      translation: "“…but each, in an orbit, is swimming.”",
      reference: "Yā-Sīn 36:40 (see also Al-Anbiyāʾ 21:33)",
      note: "Yasbaḥūn: “swimming” or “floating”.",
    },
    scale: "Not to scale: the depth of the well and the orbit speeds are chosen to be visible.",
    legend: [
      { swatch: "grid", text: "Grid: spacetime. Blue is flat, amber is strongly curved." },
      { swatch: "mass", text: "Glowing ball: the central mass (like a star)." },
      { swatch: "body", text: "Small balls with trails: orbiting bodies (like planets)." },
      { swatch: "outline", text: "Faint loops: each body's whole orbit." },
    ],
  },
  B: {
    tab: "Bending light",
    title: "Gravitational lensing",
    summary: "Light follows curved spacetime too, so a mass bends the path of light passing it.",
    physics: [
      "Light has no mass, yet it still follows the curves of spacetime. General Relativity predicts that starlight grazing the Sun bends by 1.75 arcseconds (0.0005°), twice Newton's value. Eddington's 1919 eclipse expedition gave the first evidence; radio telescopes now confirm it to better than 0.1%.",
      "Because the light bends, we see the star slightly out of place. Astronomers use this “lensing” to weigh galaxies and map dark matter.",
    ],
    tryIt: [
      "Set the mass to 0 and fire: the light goes straight.",
      "Raise the mass and fire again: the path bends around the well. The dashed line is the straight path it would have taken.",
      "Aim closer to the centre for a bigger bend; aim very close and the light falls into the mass.",
    ],
    scale: "Not to scale: the bending here is exaggerated tens of thousands of times.",
    legend: [
      { swatch: "photon", text: "Gold streak: light from the star (a photon)." },
      { swatch: "star", text: "Bright dot: the distant star, where it really is." },
      { swatch: "guide", text: "Dashed line: the path the light would take with no mass." },
      { swatch: "observer", text: "Cyan diamond: the observer who receives the light." },
      { swatch: "apparent", text: "Ring and dotted line: where the observer sees the star." },
    ],
  },
  C: {
    tab: "Slow clocks",
    title: "Gravitational time dilation",
    summary: "Clocks deeper in a gravity well run slower than clocks far away.",
    physics: [
      "A clock close to a mass ticks more slowly than one far away: dτ/dt = √(1 − rₛ/r). Pound and Rebka detected the effect up a 22.5 m tower at Harvard in 1959–60.",
      "Gravity makes GPS satellite clocks, high above Earth, run about 45 microseconds a day fast (about 38 after allowing for their orbital speed). Without correction, GPS positions would drift by around 10 km a day.",
    ],
    tryIt: [
      "Press Synchronise, then raise the mass: Clock B's second hand sweeps more slowly and it falls further behind.",
      "On the graph, Clock A climbs at one second per second; Clock B's line is flatter.",
      "Set the mass to 0: both clocks tick at the same rate again.",
    ],
    verse: {
      arabic: "وَإِنَّ يَوْمًا عِندَ رَبِّكَ كَأَلْفِ سَنَةٍ مِّمَّا تَعُدُّونَ",
      translation: "“And indeed, a day with your Lord is like a thousand years of those which you count.”",
      reference: "Al-Ḥajj 22:47",
    },
    scale:
      "Not to scale. At full mass Clock B ticks like a clock hovering just outside a black hole; on Earth's surface a clock loses only about 0.02 s a year compared with deep space.",
    legend: [
      { swatch: "clockA", text: "Cyan diamond A: a clock far from the mass." },
      { swatch: "clockB", text: "Amber diamond B: a clock deep in the well." },
    ],
  },
  D: {
    tab: "Seven skies",
    title: "The Seven Skies · Miraj",
    summary: "Folding spacetime could make a far shorter route than the way across it.",
    physics: [
      "In 1935 Einstein and Rosen found that General Relativity allows a “bridge” joining two separate sheets of spacetime. Later physicists (Wheeler; Morris and Thorne, 1988) asked whether such wormholes could be shortcuts: if spacetime were folded, a path through the throat could be far shorter than the route across the surface.",
      "No wormhole has ever been observed, and an Einstein–Rosen bridge would pinch shut before even light could cross. Here the fold is a visual analogy for reflection on the Isrāʾ and Miʿrāj, not a scientific account of it.",
    ],
    tryIt: [
      "Engage the Miraj and follow the four steps shown at the top of the view.",
      "Press “Send light through the tunnel” (Space) to send more light; use Slow motion to follow it.",
      "Choose the view “Up the tunnel” to look straight up the throat.",
    ],
    verse: {
      arabic: "سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا · الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا",
      translation: "“Exalted is He who took His Servant by night…” · “…who created seven heavens in layers.”",
      reference: "Al-Isrāʾ 17:1 · Al-Mulk 67:3",
    },
    scale: "An analogy, not a model: no known physics lets a person travel this way.",
    legend: [
      { swatch: "skies", text: "Coloured discs: the seven skies, one above another." },
      { swatch: "tunnelLight", text: "Bright line: light crossing all seven through the tunnel." },
    ],
  },
};

/** Captions for the Miraj sequence, keyed by phase. */
export const MIRAJ_STEPS = [
  {
    title: "Seven skies, one above another",
    detail: "“…who created seven heavens in layers” (Al-Mulk 67:3).",
  },
  {
    title: "Each sky is a sheet of spacetime",
    detail: "Crossing all seven, edge to edge, would be a long journey.",
  },
  {
    title: "Spacetime folds",
    detail: "The centre of each sky is drawn into a funnel, and the funnels join into one tunnel.",
  },
  {
    title: "Through the tunnel",
    detail: "Light rises through all seven skies along a far shorter route.",
  },
];

export const MIRAJ_FOOTNOTE = "A visual analogy for reflection on the Isrāʾ and Miʿrāj (17:1), not a scientific account.";

/** Labels pinned to objects in the 3D view. */
export const SCENE_LABELS: Record<string, string> = {
  mass: "Central mass",
  ellipse: "Elliptical orbit",
  clockA: "Clock A · far away",
  clockB: "Clock B · near the mass",
  "lens-star": "Distant star (true position)",
  "lens-observer": "Observer",
  "lens-apparent": "Where the observer sees the star",
  "lens-guide": "Path with no mass",
  "lens-hit": "Light fell into the mass",
  tunnel: "Tunnel through all seven skies",
};
