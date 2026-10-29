// Shared look of Settings → Call Quality (CallQualityPage, CallQualityAiBuilder).

export const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';
export const label = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';
const btn = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-smooth active:scale-[0.97] disabled:opacity-40';
export const primaryBtn = `${btn} bg-primary text-primary-foreground hover:opacity-90`;
export const ghostBtn = `${btn} border border-border text-foreground hover:bg-secondary/60`;

export const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};
