/** Parses "m:ss", "mm:ss", "h:mm:ss", "hh:mm:ss.mmm" or "mm:ss,mmm" into milliseconds. Returns null if malformed. */
export function parseClock(value: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(value.trim());
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const s = Number(m[3]);
  const frac = m[4] ? Number(m[4].padEnd(3, "0")) : 0;
  if (min > 59 || s > 59) return null;
  return ((h * 60 + min) * 60 + s) * 1000 + frac;
}

/** Formats milliseconds as "m:ss" or "h:mm:ss". */
export function formatClock(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "";
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
