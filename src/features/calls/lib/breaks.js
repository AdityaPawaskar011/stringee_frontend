/** "12:04" or "1:05:09" — seconds as a clock. */
export function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Time from an ISO timestamp to `now` (ms), as formatSeconds. */
export function formatElapsed(since, now = Date.now()) {
  const start = Date.parse(since);
  return Number.isNaN(start) ? "" : formatSeconds((now - start) / 1000);
}
