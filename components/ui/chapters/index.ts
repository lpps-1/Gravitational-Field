import type { ComponentType } from "react";
import type { ModuleId } from "@/lib/store";
import { ClockStrip } from "../ClockStrip";
import { BlackHoleCaption, BlackHoleDock, BlackHoleLive } from "./BlackHolePanel";
import {
  BendingLightDock,
  BendingLightLive,
  CurvedSpaceDock,
  CurvedSpaceLive,
  SevenSkiesDock,
  SevenSkiesLive,
  SlowClocksDock,
  SlowClocksLive,
} from "./LabPanels";
import { SolarCaption, SolarDock, SolarLive } from "./SolarPanel";

interface ChapterUI {
  /** Controls, shown in the dock. */
  Dock: ComponentType;
  /** Live readouts, shown in the chapter notes. */
  Live: ComponentType;
  /** A caption over the top of the 3D view (the Miraj steps take its place while the skies are shown). */
  Caption?: ComponentType<{ compact?: boolean }>;
}

export const CHAPTER_UI: Record<ModuleId, ChapterUI> = {
  A: { Dock: CurvedSpaceDock, Live: CurvedSpaceLive },
  B: { Dock: BendingLightDock, Live: BendingLightLive },
  C: { Dock: SlowClocksDock, Live: SlowClocksLive, Caption: ClockStrip },
  S: { Dock: SolarDock, Live: SolarLive, Caption: SolarCaption },
  H: { Dock: BlackHoleDock, Live: BlackHoleLive, Caption: BlackHoleCaption },
  D: { Dock: SevenSkiesDock, Live: SevenSkiesLive },
};
