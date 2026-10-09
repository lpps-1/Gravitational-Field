import type { ModuleId, ViewName } from "./store";

/**
 * The lab is read as six chapters, one idea at a time. Each chapter belongs to
 * a stage (the 3D world it is shown in) and opens on a camera view.
 */
export type Stage = "lab" | "solar" | "blackhole";

export interface Chapter {
  id: ModuleId;
  /** "01" … "06", as printed in the navigation. */
  number: string;
  /** Short name for the navigation. */
  short: string;
  stage: Stage;
  /** Camera view the chapter opens on. */
  view: ViewName;
  /** Camera presets offered in the View menu. */
  views: ViewName[];
  /** One honest line about scale, shown on the 3D view. */
  note: string;
}

const LAB_VIEWS: ViewName[] = ["overview", "top", "side", "clocks"];
const ILLUSTRATION = "Illustration · not to scale";

export const CHAPTERS: Chapter[] = [
  { id: "A", number: "01", short: "Curved space", stage: "lab", view: "overview", views: LAB_VIEWS, note: ILLUSTRATION },
  { id: "B", number: "02", short: "Bending light", stage: "lab", view: "overview", views: LAB_VIEWS, note: ILLUSTRATION },
  { id: "C", number: "03", short: "Slow clocks", stage: "lab", view: "clocks", views: LAB_VIEWS, note: ILLUSTRATION },
  {
    id: "S",
    number: "04",
    short: "Solar System",
    stage: "solar",
    view: "solar",
    views: ["solar", "solarTop"],
    note: "Real positions today · sizes enlarged, distances compressed",
  },
  {
    id: "H",
    number: "05",
    short: "Black hole",
    stage: "blackhole",
    view: "bh",
    views: ["bh", "bhTop"],
    note: "Real light bending around a non-spinning black hole",
  },
  { id: "D", number: "06", short: "Seven skies", stage: "lab", view: "skies", views: ["skies", "under", "side"], note: "A visual analogy, not a model" },
];

export const CHAPTER_ORDER: ModuleId[] = CHAPTERS.map((c) => c.id);

export function chapter(id: ModuleId): Chapter {
  return CHAPTERS.find((c) => c.id === id)!;
}

export function stageOf(id: ModuleId): Stage {
  return chapter(id).stage;
}
