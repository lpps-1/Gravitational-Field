"use client";

import { SKY_HEX } from "@/components/scene/SevenSkies";
import { ScreenAnchor } from "./ScreenAnchor";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** "SKY I" … "SKY VII" labels beside each layer while the Miraj is engaged. */
export function SkyLabels() {
  return (
    <>
      {NUMERALS.map((n, i) => (
        <ScreenAnchor key={n} id={`sky${i}`} origin="center">
          <div
            className="select-none whitespace-nowrap text-[11px] tracking-[0.3em] text-glow"
            style={{ color: SKY_HEX[i] }}
          >
            SKY {n}
          </div>
        </ScreenAnchor>
      ))}
    </>
  );
}
