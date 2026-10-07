/** Retro laboratory-monitor overlay: scanlines, a slow sweep, flicker and vignette. */
export function CRTOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <div className="crt-scanlines absolute inset-0" />
      <div className="crt-sweep absolute inset-0" />
      <div className="crt-flicker absolute inset-0" />
      <div className="crt-vignette absolute inset-0" />
    </div>
  );
}
