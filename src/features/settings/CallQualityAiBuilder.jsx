import { useMemo, useState } from 'react';
import { Wand2, Loader2, Plus, Trash2, FlaskConical, Check, X, History, FileSpreadsheet } from 'lucide-react';

import { useToast } from '@/shared/hooks/useToast';
import {
  useGenerateCallQualityDraftMutation,
  usePreviewCallQualityDraftMutation,
  useGetCallQualitySampleCallsQuery,
  useTestCallQualityDraftMutation,
  useApplyCallQualityDraftMutation,
  useRestoreCallQualityMutation,
} from '@/services';
import { inputClass, label, primaryBtn, ghostBtn, apiError } from './callQualityUi';
import Section from './CallQualitySection';

// Settings → Call Quality → Build with AI (api/services/call_quality_builder.py): the
// admin's own QA form + a plain-English request → the AI drafts the whole setup →
// review / edit → test on one call → apply. Nothing is saved before Apply, and the
// setup it replaces is kept for "Restore previous".

const FORM_ACCEPT = '.xlsx,.csv,.pdf';
const FORM_MAX_MB = 10;

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');

// The draft as edited here → what the API expects (outcomes typed one per line).
const toApi = (d) => ({ ...d, outcomes: d.outcomes.split('\n').map((o) => o.trim()).filter(Boolean) });

function ScoreCard({ title, result }) {
  return (
    <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className={label}>{title}</p>
        <span className="text-sm font-semibold text-foreground">
          {result.overall_rating != null ? `${Number(result.overall_rating).toFixed(1)}/5` : '—'}
        </span>
      </div>
      {result.call_outcome && <p className="text-xs text-muted-foreground">{result.call_outcome}</p>}
      {result.summary && <p className="text-xs text-foreground/90">{result.summary}</p>}
      <ul className="space-y-1.5">
        {(result.parts || []).map((p) => (
          <li key={p.label} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-foreground">{p.label}</span>
              <span className="font-mono text-primary">{p.score != null ? `${p.score}/5` : 'n/a'}</span>
            </div>
            {p.comment && <p className="text-muted-foreground">{p.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CallQualityAiBuilder({ data }) {
  const { success, error } = useToast();
  const [generate, { isLoading: generating }] = useGenerateCallQualityDraftMutation();
  const [preview, { isLoading: previewing }] = usePreviewCallQualityDraftMutation();
  const [testDraft, { isLoading: testing }] = useTestCallQualityDraftMutation();
  const [apply, { isLoading: applying }] = useApplyCallQualityDraftMutation();
  const [restore, { isLoading: restoring }] = useRestoreCallQualityMutation();

  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState('');
  const [draft, setDraft] = useState(null);           // { criteria, outcomes (text), company_context, instructions, overall_mode }
  const [explanation, setExplanation] = useState('');
  const [prompt, setPrompt] = useState(null);         // the full prompt, once asked for
  const [sample, setSample] = useState('');
  const [testResult, setTestResult] = useState(null);

  const { data: samples } = useGetCallQualitySampleCallsQuery(undefined, { skip: !draft });

  const changes = useMemo(() => {
    if (!draft) return null;
    const current = data.criteria.filter((c) => c.is_active).map((c) => c.label);
    const next = draft.criteria.map((c) => c.label.trim()).filter(Boolean);
    const has = (list, l) => list.some((x) => x.toLowerCase() === l.toLowerCase());
    return {
      added: next.filter((l) => !has(current, l)),
      removed: current.filter((l) => !has(next, l)),
      kept: next.filter((l) => has(current, l)),
    };
  }, [draft, data.criteria]);

  // Any edit makes the shown prompt and test result stale.
  const edit = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setPrompt(null);
    setTestResult(null);
  };
  const editCriterion = (i, patch) =>
    edit({ criteria: draft.criteria.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const reset = () => {
    setDraft(null); setExplanation(''); setPrompt(null); setTestResult(null); setSample('');
  };

  const onGenerate = async (e) => {
    e.preventDefault();
    if (!file) return;
    if (file.size > FORM_MAX_MB * 1024 * 1024) { error(`The form is larger than ${FORM_MAX_MB} MB`); return; }
    try {
      const res = await generate({ file, instruction: instruction.trim() }).unwrap();
      setDraft({ ...res.draft, outcomes: res.draft.outcomes.join('\n') });
      setExplanation(res.explanation);
      setPrompt(null);
      setTestResult(null);
      success('Draft ready — review it below. Nothing is applied yet.');
    } catch (err) { error(apiError(err, 'The AI could not build a draft')); }
  };

  const onPreview = async () => {
    if (prompt) { setPrompt(null); return; }
    try { setPrompt((await preview(toApi(draft)).unwrap()).system_prompt); }
    catch (err) { error(apiError(err, 'Fix the draft first')); }
  };

  const onTest = async () => {
    const [source, id] = sample.split(':');
    try {
      setTestResult(await testDraft({ draft: toApi(draft), source, id: Number(id) }).unwrap());
    } catch (err) { error(apiError(err, 'Could not test the draft')); }
  };

  const onApply = async () => {
    if (!window.confirm('Apply this setup? It replaces your current criteria and settings for new calls. '
      + 'Your current setup is kept, so you can restore it.')) return;
    try {
      await apply(toApi(draft)).unwrap();
      success('Applied — new calls are scored with it within a minute. Use "Re-score past calls" below for older calls.');
      reset();
      setFile(null);
      setInstruction('');
    } catch (err) { error(apiError(err, 'Could not apply the draft')); }
  };

  const onRestore = async () => {
    if (!window.confirm(`Put back the setup saved on ${when(data.backup.saved_at)}? `
      + 'Your current setup is kept as the new backup.')) return;
    try { await restore().unwrap(); success('Previous setup restored'); }
    catch (err) { error(apiError(err, 'Could not restore')); }
  };

  const hasSamples = samples && (samples.calls.length || samples.uploads.length);

  return (
    <Section icon={Wand2} title="Build with AI"
      subtitle="Upload your own QA form and say what you want — the AI drafts the criteria and instructions. You review it before anything changes.">
      {data.backup && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/30 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <History className="w-3.5 h-3.5" />
            Previous setup saved {when(data.backup.saved_at)} by {data.backup.saved_by}
          </span>
          <button type="button" className={ghostBtn} onClick={onRestore} disabled={restoring}>
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />} Restore previous
          </button>
        </div>
      )}

      {/* 1. Describe */}
      <form onSubmit={onGenerate} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_2fr]">
          <label className="space-y-1.5">
            <span className={label}>Your QA form</span>
            <span className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background/30 px-3 py-2 cursor-pointer hover:border-primary/40">
              <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm truncate text-foreground">{file ? file.name : 'Choose Excel, CSV or PDF…'}</span>
              <input type="file" accept={FORM_ACCEPT} className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </span>
            <span className="block text-[11px] text-muted-foreground">Up to {FORM_MAX_MB} MB</span>
          </label>
          <label className="space-y-1.5">
            <span className={label}>What you want, in plain English</span>
            <textarea className={`${inputClass} min-h-[84px]`} maxLength={2000} value={instruction}
              placeholder="e.g. Use this audit sheet as our scorecard. Compliance matters most. Agents must never promise returns."
              onChange={(e) => setInstruction(e.target.value)} />
          </label>
        </div>
        <button type="submit" className={primaryBtn} disabled={!file || !instruction.trim() || generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Building the draft… (up to a minute)' : draft ? 'Generate again' : 'Generate draft'}
        </button>
      </form>

      {draft && (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Draft — not applied yet</p>
              {explanation && <p className="text-xs text-muted-foreground mt-1">{explanation}</p>}
            </div>
            <button type="button" className={ghostBtn} onClick={reset}><X className="w-4 h-4" /> Discard</button>
          </div>

          {changes && (
            <p className="text-xs text-muted-foreground">
              {changes.added.length > 0 && <span className="text-emerald-400">New: {changes.added.join(', ')}. </span>}
              {changes.removed.length > 0 && <span className="text-rose-300">Removed: {changes.removed.join(', ')}. </span>}
              {changes.kept.length > 0 && <span>Kept: {changes.kept.join(', ')}.</span>}
            </p>
          )}

          {/* 2. Review / edit */}
          <div className="space-y-2">
            <p className={label}>Criteria (each scored 1–5)</p>
            {draft.criteria.map((c, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[minmax(160px,1fr)_minmax(220px,2fr)_90px_auto] items-start">
                <input className={inputClass} maxLength={40} value={c.label} placeholder="Name"
                  onChange={(e) => editCriterion(i, { label: e.target.value })} />
                <input className={inputClass} maxLength={500} value={c.description} placeholder="What should the AI look for?"
                  onChange={(e) => editCriterion(i, { description: e.target.value })} />
                <input className={inputClass} type="number" min={0} max={10} step={0.5} value={c.weight}
                  title="Weight" onChange={(e) => editCriterion(i, { weight: e.target.value })} />
                <button type="button" title="Remove" aria-label="Remove"
                  className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-rose-500/15 hover:text-rose-300"
                  onClick={() => edit({ criteria: draft.criteria.filter((_, j) => j !== i) })}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button" className={ghostBtn}
              onClick={() => edit({ criteria: [...draft.criteria, { label: '', description: '', weight: 1 }] })}>
              <Plus className="w-4 h-4" /> Add criterion
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className={label}>Overall rating</p>
              {[['ai', 'The AI decides'], ['weighted', 'Weighted average of the criteria']].map(([value, title]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="radio" checked={draft.overall_mode === value} onChange={() => edit({ overall_mode: value })} />
                  {title}
                </label>
              ))}
              <p className={`${label} pt-2`}>Call outcomes (one per line)</p>
              <textarea className={`${inputClass} min-h-[100px]`} value={draft.outcomes}
                onChange={(e) => edit({ outcomes: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <p className={label}>About your company / rules</p>
              <textarea className={`${inputClass} min-h-[170px]`} maxLength={2000} value={draft.company_context}
                onChange={(e) => edit({ company_context: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className={label}>Instructions to the AI</p>
            <textarea className={`${inputClass} min-h-[160px] font-mono text-xs`} maxLength={8000}
              value={draft.instructions} onChange={(e) => edit({ instructions: e.target.value })} />
            <p className="text-[11px] text-muted-foreground">
              The reply format (your criteria and outcomes as JSON) is always added after these, so scoring keeps working.
            </p>
            <button type="button" className={ghostBtn} onClick={onPreview} disabled={previewing}>
              {previewing && <Loader2 className="w-4 h-4 animate-spin" />} {prompt ? 'Hide' : 'Show'} the full prompt
            </button>
            {prompt && (
              <pre className="max-h-[360px] overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {prompt}
              </pre>
            )}
          </div>

          {/* 3. Test */}
          <div className="space-y-2 rounded-lg border border-border bg-background/20 p-3">
            <p className={label}>Test on a real call (uses one AI call)</p>
            {hasSamples ? (
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inputClass} md:max-w-xl`} value={sample} onChange={(e) => { setSample(e.target.value); setTestResult(null); }}>
                  <option value="">Choose a call…</option>
                  {samples.calls.length > 0 && (
                    <optgroup label="Dialer calls">
                      {samples.calls.map((s) => (
                        <option key={`call:${s.id}`} value={`call:${s.id}`}>
                          {when(s.at)} · {s.agent || '—'} · {s.overall_rating != null ? `${s.overall_rating}/5` : '—'} · {s.summary || ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {samples.uploads.length > 0 && (
                    <optgroup label="Manual Analysis uploads">
                      {samples.uploads.map((s) => (
                        <option key={`manual:${s.id}`} value={`manual:${s.id}`}>
                          {s.name} · {s.agent || '—'} · {s.overall_rating != null ? `${s.overall_rating}/5` : '—'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button type="button" className={ghostBtn} onClick={onTest} disabled={!sample || testing}>
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Test on this call
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No analysed calls with a transcript yet.</p>
            )}
            {testResult && (
              <div className="grid gap-3 md:grid-cols-2">
                <ScoreCard title="Current score" result={testResult.current_result} />
                <ScoreCard title="With this draft" result={testResult.draft_result} />
              </div>
            )}
          </div>

          {/* 4. Confirm */}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={onApply} disabled={applying}>
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Apply this setup
            </button>
            <button type="button" className={ghostBtn} onClick={reset}>Discard</button>
          </div>
        </div>
      )}
    </Section>
  );
}
