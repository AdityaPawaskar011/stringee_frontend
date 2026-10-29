import { useEffect, useMemo, useState } from 'react';
import { ListChecks, ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, CalendarClock } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetDispositionSettingsQuery,
  useGetSuggestedCodeQuery,
  useCreateDispositionMutation,
  useUpdateDispositionMutation,
  useDeleteDispositionMutation,
  useReorderDispositionsMutation,
} from '@/services';

// Settings → Dispositions: the call outcomes the company's agents choose from
// (api/routers/dispositions.py). A row without a campaign applies to every campaign;
// a campaign row overrides it for that campaign only.

const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';

const SWATCH = {
  slate: 'bg-slate-400', green: 'bg-emerald-400', blue: 'bg-sky-400', amber: 'bg-amber-400',
  rose: 'bg-rose-400', violet: 'bg-violet-400', cyan: 'bg-cyan-400',
};

const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};

function IconButton({ title, onClick, disabled, children, danger }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className={`h-8 w-8 grid place-items-center rounded-lg border border-border transition-smooth
        disabled:opacity-30 active:scale-90 ${danger ? 'hover:bg-rose-500/15 hover:text-rose-300' : 'hover:bg-secondary/60'}`}>
      {children}
    </button>
  );
}

function ColorPicker({ value, colors, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((c) => (
        <button key={c} type="button" title={c} aria-label={c} onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-full ${SWATCH[c]} transition-smooth
            ${value === c ? 'ring-2 ring-offset-2 ring-offset-card ring-primary' : 'opacity-60 hover:opacity-100'}`} />
      ))}
    </div>
  );
}

function Row({ row, campaigns, colors, first, last, onMove, onSave, onDelete, busy }) {
  const [label, setLabel] = useState(row.label);
  const save = (patch) => onSave(row, patch);

  return (
    <li className={`grid gap-3 items-center rounded-xl border border-border bg-card/60 px-3 py-3
      md:grid-cols-[auto_90px_minmax(160px,1fr)_auto_150px_auto_auto] ${row.is_hidden ? 'opacity-55' : ''}`}>
      <div className="flex gap-1">
        <IconButton title="Move up" onClick={() => onMove(row, -1)} disabled={first || busy}><ArrowUp className="w-4 h-4" /></IconButton>
        <IconButton title="Move down" onClick={() => onMove(row, 1)} disabled={last || busy}><ArrowDown className="w-4 h-4" /></IconButton>
      </div>
      <code className="text-xs font-semibold text-muted-foreground">{row.status}</code>
      <input className={inputClass} value={label} maxLength={30}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => label.trim() && label.trim() !== row.label && save({ label: label.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      <ColorPicker value={row.color || 'slate'} colors={colors} onChange={(color) => save({ color })} />
      <select className={inputClass} value={row.campaign_id || ''}
        onChange={(e) => save({ campaign_id: e.target.value || null })}>
        <option value="">All campaigns</option>
        {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-1">
        <IconButton title={row.is_callback ? 'Asks for a callback date — click to turn off' : 'Make this a callback (asks for a date)'}
          onClick={() => save({ is_callback: !row.is_callback })} disabled={busy}>
          <CalendarClock className={`w-4 h-4 ${row.is_callback ? 'text-primary' : ''}`} />
        </IconButton>
        <IconButton title={row.is_hidden ? 'Hidden from agents — click to show' : 'Shown to agents — click to hide'}
          onClick={() => save({ is_hidden: !row.is_hidden })} disabled={busy}>
          {row.is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </IconButton>
      </div>
      <IconButton title="Remove from the list" onClick={() => onDelete(row)} disabled={busy} danger>
        <Trash2 className="w-4 h-4" />
      </IconButton>
    </li>
  );
}

function AddForm({ campaigns, colors, onAdd, busy }) {
  const empty = { status: '', label: '', color: 'slate', campaign_id: '', is_callback: false };
  const [form, setForm] = useState(empty);
  const typed = form.status.trim().toUpperCase();

  // Code left blank: preview the new code the server will make from the label.
  const [debouncedLabel, setDebouncedLabel] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedLabel(form.label.trim()), 350);
    return () => clearTimeout(t);
  }, [form.label]);
  const { data: suggested = '' } = useGetSuggestedCodeQuery(debouncedLabel, { skip: !!typed || !debouncedLabel });
  const code = typed || suggested;

  const submit = async (e) => {
    e.preventDefault();
    // A blank code is sent blank: the server picks a free one (the preview is a hint).
    const ok = await onAdd({ ...form, status: typed || null,
      label: form.label.trim(), campaign_id: form.campaign_id || null });
    if (ok) setForm(empty);
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border bg-card/40 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-[120px_minmax(160px,1fr)_160px]">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Code (optional)</label>
          <input className={inputClass} maxLength={6} placeholder={suggested || 'auto'}
            value={form.status}
            onChange={(e) => {
              const status = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
              setForm((f) => ({ ...f, status }));
            }} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Label agents see</label>
          <input className={inputClass} maxLength={30} placeholder="e.g. Follow up next week"
            value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Applies to</label>
          <select className={inputClass} value={form.campaign_id}
            onChange={(e) => setForm((f) => ({ ...f, campaign_id: e.target.value }))}>
            <option value="">All campaigns</option>
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ColorPicker value={form.color} colors={colors} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={form.is_callback}
            onChange={(e) => setForm((f) => ({ ...f, is_callback: e.target.checked }))} />
          Callback (asks for a date &amp; time)
        </label>
        <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
          {code
            ? `New code ${code}${typed ? '' : ' (made from the label)'} for ${form.campaign_id || 'all your campaigns'}.`
            : 'Type a label. Leave Code blank to get a new one.'}
        </p>
        <button type="submit" disabled={busy || !form.label.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold
            text-primary-foreground transition-smooth hover:opacity-90 active:scale-[0.97] disabled:opacity-40">
          <Plus className="w-4 h-4" /> Add disposition
        </button>
      </div>
    </form>
  );
}

export default function DispositionsPage() {
  const { success, error } = useToast();
  const { data, isLoading, error: loadError } = useGetDispositionSettingsQuery();
  const [createDisposition, { isLoading: creating }] = useCreateDispositionMutation();
  const [updateDisposition, { isLoading: updating }] = useUpdateDispositionMutation();
  const [deleteDisposition, { isLoading: deleting }] = useDeleteDispositionMutation();
  const [reorderDispositions, { isLoading: reordering }] = useReorderDispositionsMutation();
  const busy = creating || updating || deleting || reordering;

  const rows = useMemo(() => data?.dispositions ?? [], [data]);
  const campaigns = data?.campaigns ?? [];
  const colors = data?.colors ?? Object.keys(SWATCH);

  const onAdd = async (body) => {
    try {
      const res = await createDisposition(body).unwrap();
      success(`${body.label} added as ${res.status}`);
      return true;
    } catch (e) { error(apiError(e, 'Could not add the disposition')); return false; }
  };

  const onSave = async (row, patch) => {
    try {
      const res = await updateDisposition({ id: row.id, ...patch }).unwrap();
      success(`${res.label} saved`);
    } catch (e) { error(apiError(e, 'Could not save')); }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Remove "${row.label}" (${row.status}) from the list? Calls already marked with it keep their status.`)) return;
    try { await deleteDisposition(row.id).unwrap(); success(`${row.label} removed`); }
    catch (e) { error(apiError(e, 'Could not remove')); }
  };

  const onMove = async (row, step) => {
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(row.id);
    const j = i + step;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await reorderDispositions(ids).unwrap(); }
    catch (e) { error(apiError(e, 'Could not reorder')); }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] space-y-5 stagger-children">
        <div className="relative overflow-hidden rounded-2xl border border-white/10
          bg-gradient-to-b from-slate-900/70 to-slate-950/80
          shadow-[0_30px_120px_rgba(0,0,0,0.55)] px-5 py-5 transition-smooth">
          <div className="pointer-events-none absolute inset-0 opacity-60
            bg-[radial-gradient(700px_circle_at_0%_0%,hsl(var(--primary)/0.14),transparent_55%)]" />
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-primary/20 bg-primary/10 grid place-items-center shrink-0">
              <ListChecks className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground leading-none">Dispositions</h1>
              <p className="text-xs text-muted-foreground mt-1">
                What your agents choose after each call. Rename, recolour, reorder, hide or add your own.
              </p>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loadError && <p className="text-sm text-rose-300">{apiError(loadError, 'Could not load the dispositions')}</p>}

        {!isLoading && !loadError && (
          <>
            <ul className="space-y-2">
              {/* Keyed on the saved row: after a save the label input restarts from the server. */}
              {rows.map((row, i) => (
                <Row key={`${row.id}:${row.label}`} row={row} campaigns={campaigns} colors={colors}
                  first={i === 0} last={i === rows.length - 1} busy={busy}
                  onMove={onMove} onSave={onSave} onDelete={onDelete} />
              ))}
              {rows.length === 0 && (
                <li className="text-sm text-muted-foreground">No dispositions yet. Agents cannot close a call until you add one.</li>
              )}
            </ul>
            <AddForm campaigns={campaigns} colors={colors} onAdd={onAdd} busy={busy} />
          </>
        )}
      </div>
    </div>
  );
}
