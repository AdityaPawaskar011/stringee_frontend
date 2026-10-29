import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ghostButtonClass } from './lib';

// Building blocks shared by the Dialer setup pages (Users, Campaigns, Lists, Leads,
// Do-not-call). Same look as Platform → Companies.

export function Card({ icon, title, subtitle, actions, children }) {
  const Icon = icon;
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-primary/20 bg-primary/10 grid place-items-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Pill({ on, onLabel = 'active', offLabel = 'inactive' }) {
  return (
    <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${on
      ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
      : 'border-rose-500/30 text-rose-300 bg-rose-500/10'}`}>
      {on ? onLabel : offLabel}
    </span>
  );
}

export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

/** Ticks a set of ids (campaigns for a login, agents for a campaign). */
export function CheckList({ options, value, onChange, empty = 'Nothing to choose from yet' }) {
  const set = new Set(value);
  const flip = (id) => onChange(set.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  if (!options.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground cursor-pointer hover:bg-secondary/40">
          <input type="checkbox" checked={set.has(o.id)} onChange={() => flip(o.id)} />
          <span className="truncate">{o.label}</span>
          {o.hint && <span className="ml-auto text-xs text-muted-foreground">{o.hint}</span>}
        </label>
      ))}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  return (
    <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
      <span>{from}–{Math.min(page * pageSize, total)} of {total}</span>
      <button type="button" className={ghostButtonClass} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span>Page {page} / {pages}</span>
      <button type="button" className={ghostButtonClass} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
