// Shared bits of Reports → Manual Analysis: row statuses and formatting.

export const STATUS = {
  queued:     { label: 'Queued',        cls: 'border-border bg-secondary/50 text-muted-foreground' },
  analysing:  { label: 'Analysing…',    cls: 'border-primary/40 bg-primary/10 text-primary' },
  successful: { label: 'Analysed',      cls: 'border-[hsl(var(--status-active)/0.4)] bg-[hsl(var(--status-active)/0.12)] text-[hsl(var(--status-active))]' },
  not_picked: { label: 'Not connected', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  skipped:    { label: 'No speech',     cls: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  failed:     { label: 'Failed',        cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
};

export const isBusy = (status) => status === 'queued' || status === 'analysing';

export function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function formatSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
