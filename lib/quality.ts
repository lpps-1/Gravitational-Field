/**
 * Graphics tiers, and the check that picks one before the 3D view is created.
 *
 * Most laptops have no graphics card: the processor's built-in graphics
 * (Intel UHD / Iris, AMD Radeon Graphics) draw the 3D view, and with graphics
 * acceleration switched off the browser draws it on the processor alone
 * ("software rendering"). The tiers keep the lab smooth on all three:
 *
 * - high: a graphics card. Bloom glow, 4× anti-aliasing, up to 1.5× resolution.
 * - low:  built-in graphics. No post-processing pass (glow comes from cheap
 *         sprites instead), up to 1× resolution.
 * - cpu:  software rendering. As `low`, plus a lower resolution, no
 *         anti-aliasing and a steady 30 frames per second.
 *
 * Within a tier the resolution adapts to the measured frame rate, and in
 * automatic mode a computer that still cannot keep up moves down a tier.
 */

export type Tier = "high" | "low" | "cpu";
export type QualityMode = "auto" | Tier;

export interface TierSpec {
  /** Name shown in Settings. */
  label: string;
  /** Bloom post-processing. Without it, sprite halos give the glow. */
  bloom: boolean;
  /** Render resolution range in device pixels per CSS pixel; the frame-rate monitor moves within it. */
  dpr: [number, number];
  /** Frame cap (0 = the display's own rate). */
  fps: number;
}

export const TIERS: Record<Tier, TierSpec> = {
  high: { label: "Full", bloom: true, dpr: [1, 1.5], fps: 0 },
  low: { label: "Light", bloom: false, dpr: [0.75, 1], fps: 0 },
  cpu: { label: "Minimal", bloom: false, dpr: [0.5, 0.8], fps: 30 },
};

/** Tiers from heaviest to lightest: automatic mode only ever moves down this list. */
export const TIER_ORDER: Tier[] = ["high", "low", "cpu"];

export function lowerTier(tier: Tier): Tier | null {
  return TIER_ORDER[TIER_ORDER.indexOf(tier) + 1] ?? null;
}

export interface GraphicsProbe {
  /** WebGL 2 is available at all. */
  webgl: boolean;
  /** The browser is drawing on the processor (no graphics acceleration). */
  software: boolean;
  /** Renderer name reported by the driver (may be empty). */
  renderer: string;
  /** Tier chosen for automatic mode. */
  tier: Tier;
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|basic render|microsoft basic|\bwarp\b|software/i;
const BUILT_IN = /intel|uhd|iris|hd graphics|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|mali|adreno|powervr|vivante|videocore/i;

let probed: GraphicsProbe | null = null;

/**
 * Checks the graphics hardware once, with a throwaway canvas, so the 3D view
 * is created with its final settings (nothing is built twice).
 */
export function probeGraphics(): GraphicsProbe {
  if (probed) return probed;
  if (typeof document === "undefined") return { webgl: true, software: false, renderer: "", tier: "high" };

  const context = (attributes: WebGLContextAttributes) => {
    try {
      return document.createElement("canvas").getContext("webgl2", attributes);
    } catch {
      return null;
    }
  };
  // Browsers refuse a "major performance caveat" context when they would
  // draw in software, which identifies software rendering reliably.
  const fast = context({ failIfMajorPerformanceCaveat: true });
  const gl = fast ?? context({});
  if (!gl) {
    probed = { webgl: false, software: false, renderer: "", tier: "cpu" };
    return probed;
  }

  let renderer = "";
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  } catch {
    // Some privacy settings hide the renderer name.
  }
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  const software = !fast || SOFTWARE.test(renderer);
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const phone = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;
  const builtIn = BUILT_IN.test(renderer) || cores <= 4 || memory <= 4 || phone;

  probed = { webgl: true, software, renderer, tier: software ? "cpu" : builtIn ? "low" : "high" };
  return probed;
}

/** The tier a quality setting resolves to on this computer. */
export function resolveTier(quality: QualityMode): Tier {
  return quality === "auto" ? probeGraphics().tier : quality;
}

/** A readable graphics name for Settings, e.g. "Intel(R) UHD Graphics 620". */
export function graphicsName(probe: GraphicsProbe): string {
  if (!probe.webgl) return "no 3D graphics available";
  if (probe.software) return "software rendering (no graphics acceleration)";
  let name = probe.renderer;
  const angle = /^ANGLE \((.*)\)$/.exec(name);
  if (angle) name = angle[1].split(", ")[1] ?? angle[1];
  name = name.replace(/\(0x[0-9a-f]+\)/gi, "").replace(/\s*(Direct3D|OpenGL|Metal|Vulkan).*$/i, "").trim();
  return name || "graphics name hidden by the browser";
}
