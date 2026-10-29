// Class names and helpers shared by the Dialer setup pages.

export const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';

export const buttonClass =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold ' +
  'text-primary-foreground transition-smooth hover:opacity-90 active:scale-[0.97] disabled:opacity-40';

export const ghostButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground ' +
  'hover:bg-secondary/60 disabled:opacity-40 transition-smooth';

/** The API's own message (422/409/403 details are written for the admin), else the fallback. */
export const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  if (typeof d === 'string') return d;
  // FastAPI validation errors: [{loc, msg}, ...]
  if (Array.isArray(d) && d[0]?.msg) return d.map((x) => x.msg.replace(/^Value error, /, '')).join('; ');
  return fallback;
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
