/** Format seconds as MM:SS.s (or H:MM:SS.s past an hour), the usual simulation-clock style. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const tenths = Math.floor((total * 10) % 10);
  const core = `${pad(m)}:${pad(s)}.${tenths}`;
  return h > 0 ? `${h}:${core}` : core;
}

/** Format an angle in degrees, keeping enough digits for tiny real-world values. */
export function formatDegrees(deg: number, digits = 1): string {
  return `${deg.toFixed(digits)}°`;
}

/** Format a number of seconds for sentences ("2.4 s"). */
export function formatSeconds(seconds: number, digits = 1): string {
  return `${seconds.toFixed(digits)} s`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
