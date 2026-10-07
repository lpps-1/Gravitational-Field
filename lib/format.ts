/** Format seconds as HH:MM:SS.cc */
export function formatClock(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.floor((total * 100) % 100);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
