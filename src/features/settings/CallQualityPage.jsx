import { useMemo, useState } from 'react';
import { Gauge, ArrowUp, ArrowDown, Trash2, Plus, Eye, EyeOff, Sparkles, RotateCcw, FileText } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetCallQualitySettingsQuery,
  useSaveCallQualitySettingsMutation,
  useAddCriterionMutation,
  useUpdateCriterionMutation,
  useDeleteCriterionMutation,
  useReorderCriteriaMutation,
  useGetCallQualityPreviewQuery,
  useRescoreCallsMutation,
} from '@/services';

import { inputClass, label, primaryBtn, ghostBtn, apiError } from './callQualityUi';
import Section from './CallQualitySection';
import CallQualityAiBuilder from './CallQualityAiBuilder';

// Settings → Call Quality (api/routers/call_quality_settings.py): what the AI scores
// this company's calls on. The call-quality service builds its prompt from these
// (api/services/call_quality_prompt.py); new calls use them within a minute.

function IconButton({ title, onClick, disabled, danger, children }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className={`h-8 w-8 grid place-items-center rounded-lg border border-border transition-smooth disabled:opacity-30
        active:scale-90 ${danger ? 'hover:bg-rose-500/15 hover:text-rose-300' : 'hover:bg-secondary/60'}`}>
      {children}
    </button>
  );
}

// ── one criterion ─────────────────────────────────────────────────────
function CriterionRow({ c, first, last, weighted, busy, onMove, onSave, onDelete }) {
  const [name, setName] = useState(c.label);
  const [desc, setDesc] = useState(c.description || '');
  const [weight, setWeight] = useState(String(c.weight));
  const commit = (patch) => onSave(c, patch);

  return (
    <li className={`rounded-xl border border-border bg-background/30 p-3 space-y-2 ${c.is_active ? '' : 'opacity-55'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <IconButton title="Move up" onClick={() => onMove(c, -1)} disabled={first || busy}><ArrowUp className="w-4 h-4" /></IconButton>
          <IconButton title="Move down" onClick={() => onMove(c, 1)} disabled={last || busy}><ArrowDown className="w-4 h-4" /></IconButton>
        </div>
        <input className={`${inputClass} flex-1 min-w-[180px]`} value={name} maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== c.label && commit({ label: name.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        {weighted && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground" title="How much this counts in the overall rating">
            Weight
            <input className={`${inputClass} w-20`} type="number" min="0" max="10" step="0.5" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={() => Number(weight) !== c.weight && commit({ weight: Number(weight) })} />
          </label>
        )}
        <IconButton title={c.is_active ? 'Scored — click to stop scoring it' : 'Not scored — click to score it'}
          onClick={() => commit({ is_active: !c.is_active })} disabled={busy}>
          {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </IconButton>
        <IconButton title="Delete" onClick={() => onDelete(c)} disabled={busy} danger><Trash2 className="w-4 h-4" /></IconButton>
      </div>
      <textarea className={`${inputClass} min-h-[44px]`} rows={1} maxLength={500} value={desc}
        placeholder="What should the AI look for? (optional — e.g. 'Agent states the risk disclosure before pitching')"
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc.trim() !== (c.description || '') && commit({ description: desc })} />
      <p className="text-[10px] text-muted-foreground font-mono">key: {c.key}</p>
    </li>
  );
}

function Criteria({ data }) {
  const { success, error } = useToast();
  const [addCriterion, { isLoading: adding }] = useAddCriterionMutation();
  const [updateCriterion, { isLoading: saving }] = useUpdateCriterionMutation();
  const [deleteCriterion, { isLoading: deleting }] = useDeleteCriterionMutation();
  const [reorderCriteria, { isLoading: moving }] = useReorderCriteriaMutation();
  const [form, setForm] = useState({ label: '', description: '', weight: '1' });
  const busy = adding || saving || deleting || moving;
  const rows = data.criteria;
  const weighted = data.settings.overall_mode === 'weighted';

  const onSave = async (c, patch) => {
    try { await updateCriterion({ id: c.id, ...patch }).unwrap(); success(`${patch.label || c.label} saved`); }
    catch (e) { error(apiError(e, 'Could not save')); }
  };
  const onDelete = async (c) => {
    if (!window.confirm(`Delete "${c.label}"? Calls already scored keep their score for it.`)) return;
    try { await deleteCriterion(c.id).unwrap(); success(`${c.label} deleted`); }
    catch (e) { error(apiError(e, 'Could not delete')); }
  };
  const onMove = async (c, step) => {
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(c.id), j = i + step;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await reorderCriteria(ids).unwrap(); } catch (e) { error(apiError(e, 'Could not reorder')); }
  };
  const onAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await addCriterion({ label: form.label.trim(), description: form.description.trim() || undefined,
        weight: Number(form.weight) || 1 }).unwrap();
      success(`${res.label} added`);
      setForm({ label: '', description: '', weight: '1' });
    } catch (err) { error(apiError(err, 'Could not add the criterion')); }
  };

  return (
    <Section icon={Gauge} title="What calls are scored on"
      subtitle="Each criterion is scored 1–5 with a comment. Add your own, describe what to look for, switch any off.">
      <ul className="space-y-2">
        {rows.map((c, i) => (
          <CriterionRow key={`${c.id}:${c.label}:${c.description}:${c.weight}`} c={c} first={i === 0}
            last={i === rows.length - 1} weighted={weighted} busy={busy}
            onMove={onMove} onSave={onSave} onDelete={onDelete} />
        ))}
      </ul>
      <form onSubmit={onAdd} className="rounded-xl border border-dashed border-border bg-background/20 p-3 space-y-2">
        <div className="grid gap-2 md:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)_auto]">
          <input className={inputClass} maxLength={40} placeholder="New criterion, e.g. Compliance" value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <input className={inputClass} maxLength={500} placeholder="What should the AI look for? (optional)"
            value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <button type="submit" className={primaryBtn} disabled={busy || !form.label.trim()}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── settings ─────────────────────────────────────────────────────────
function Settings({ data }) {
  const { success, error } = useToast();
  const [save, { isLoading }] = useSaveCallQualitySettingsMutation();
  const s = data.settings;
  const [form, setForm] = useState({
    overall_mode: s.overall_mode,
    outcomes: (s.outcomes || []).join('\n'),
    company_context: s.company_context || '',
    agent_role: s.agent_role || '',
    prompt_override: s.prompt_override || '',
  });
  const [advanced, setAdvanced] = useState(!!s.prompt_override);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save({
        overall_mode: form.overall_mode,
        outcomes: form.outcomes.split('\n').map((o) => o.trim()).filter(Boolean),
        company_context: form.company_context,
        agent_role: form.agent_role,
        prompt_override: advanced ? form.prompt_override : '',
      }).unwrap();
      success('Call quality settings saved');
    } catch (err) { error(apiError(err, 'Could not save')); }
  };

  return (
    <Section icon={Sparkles} title="How calls are judged" subtitle="Overall rating, outcomes and what the AI should know about you.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className={label}>Overall rating</p>
            {[['ai', 'The AI decides', 'It weighs the call as a whole (as before).'],
              ['weighted', 'Weighted average of my criteria', 'Set a weight on each criterion; the overall follows the scores.']]
              .map(([value, title, hint]) => (
                <label key={value} className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" name="overall" className="mt-1" checked={form.overall_mode === value}
                    onChange={() => setForm((f) => ({ ...f, overall_mode: value }))} />
                  <span>{title}<span className="block text-xs text-muted-foreground">{hint}</span></span>
                </label>
              ))}
          </div>
          <div className="space-y-1.5">
            <p className={label}>Call outcomes (one per line)</p>
            <textarea className={`${inputClass} min-h-[120px]`} value={form.outcomes}
              onChange={(e) => setForm((f) => ({ ...f, outcomes: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <p className={label}>About your company / product (optional)</p>
            <textarea className={`${inputClass} min-h-[90px]`} maxLength={2000} value={form.company_context}
              placeholder="e.g. We sell a trading app; agents must not promise returns."
              onChange={(e) => setForm((f) => ({ ...f, company_context: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <p className={label}>The agent's role (used to tell agent and customer apart)</p>
            <input className={inputClass} maxLength={200} value={form.agent_role}
              onChange={(e) => setForm((f) => ({ ...f, agent_role: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-background/20 p-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
            Advanced: write the instructions yourself
          </label>
          {advanced && (
            <>
              <textarea className={`${inputClass} min-h-[160px] font-mono text-xs`} maxLength={8000}
                value={form.prompt_override} placeholder="Your instructions to the AI…"
                onChange={(e) => setForm((f) => ({ ...f, prompt_override: e.target.value }))} />
              <p className="text-xs text-muted-foreground">
                Replaces the standard instructions. The reply format (your criteria and outcomes as JSON) is always
                added after it, so scoring keeps working. Untick to go back to the standard prompt.
              </p>
            </>
          )}
        </div>
        <button type="submit" className={primaryBtn} disabled={isLoading}>{isLoading ? 'Saving…' : 'Save'}</button>
      </form>
    </Section>
  );
}

// ── preview + re-score ───────────────────────────────────────────────
function Preview() {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useGetCallQualityPreviewQuery(undefined, { skip: !open });
  return (
    <Section icon={FileText} title="Prompt preview" subtitle="Exactly what the AI receives for your next call.">
      <button type="button" className={ghostBtn} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} the prompt
      </button>
      {open && (
        <pre className="max-h-[420px] overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
          {isFetching ? 'Loading…' : data?.system_prompt}
        </pre>
      )}
    </Section>
  );
}

function Rescore() {
  const { success, error } = useToast();
  const [rescore, { isLoading }] = useRescoreCallsMutation();
  const today = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState({ sd: today, ed: today });
  const run = async () => {
    try {
      const { count, cap } = await rescore({ ...range, confirm: false }).unwrap();
      if (!count) { success('No scored calls in that range'); return; }
      if (count > cap) { error(`${count} calls — re-score at most ${cap} at a time; narrow the dates`); return; }
      if (!window.confirm(`Re-score ${count} call(s) with your current criteria? Each one uses AI credit.`)) return;
      const res = await rescore({ ...range, confirm: true }).unwrap();
      success(`${res.queued} call(s) queued — they are re-scored over the next few minutes`);
    } catch (e) { error(apiError(e, 'Could not queue the re-score')); }
  };
  return (
    <Section icon={RotateCcw} title="Re-score past calls"
      subtitle="Changes apply to new calls. To apply them to calls already scored, re-score a date range.">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1"><span className={label}>From</span>
          <input type="date" className={inputClass} value={range.sd} max={range.ed}
            onChange={(e) => setRange((r) => ({ ...r, sd: e.target.value }))} /></label>
        <label className="space-y-1"><span className={label}>To</span>
          <input type="date" className={inputClass} value={range.ed} min={range.sd}
            onChange={(e) => setRange((r) => ({ ...r, ed: e.target.value }))} /></label>
        <button type="button" className={ghostBtn} onClick={run} disabled={isLoading}>
          <RotateCcw className="w-4 h-4" /> Count &amp; re-score
        </button>
      </div>
    </Section>
  );
}

export default function CallQualityPage() {
  const { data, isLoading, error } = useGetCallQualitySettingsQuery();
  // Re-mount the forms after a save so they start from the server's values.
  const key = useMemo(() => JSON.stringify(data?.settings ?? null), [data]);
  return (
    <div className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto max-w-[1100px] space-y-5 stagger-children">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-rose-300">{apiError(error, 'Could not load the settings')}</p>}
        {data && (
          <>
            <CallQualityAiBuilder data={data} />
            <Criteria data={data} />
            <Settings key={key} data={data} />
            <Preview />
            <Rescore />
          </>
        )}
      </div>
    </div>
  );
}
