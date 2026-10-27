import { useMemo, useState } from 'react';
import { PlugZap, CheckCircle2, AlertTriangle, CircleOff, KeyRound, Send, Activity } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetIntegrationsQuery,
  useSaveIntegrationMutation,
  useTestIntegrationMutation,
} from '@/services';

// Settings → Integrations: the company's OWN accounts (api/routers/settings.py).
// Each card is generated from the field list the API sends, so a new integration needs
// no page change. Secrets are write-only: the API only says whether one is set.

const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';

const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 shrink-0 rounded-full transition-smooth disabled:opacity-50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ background: checked ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-smooth
        ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </button>
  );
}

function Status({ item }) {
  if (item.ready) {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
      <CheckCircle2 className="w-3.5 h-3.5" /> Active
    </span>;
  }
  if (item.enabled) {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
      <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
    </span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
    <CircleOff className="w-3.5 h-3.5" /> Off
  </span>;
}

function FieldInput({ field, value, onChange }) {
  if (field.type === 'bool') {
    return <Toggle checked={!!value} onChange={onChange} />;
  }
  return (
    <input
      className={inputClass}
      type={field.type === 'int' ? 'number' : field.type === 'email' ? 'email' : 'text'}
      value={value ?? ''}
      placeholder={field.default != null ? String(field.default) : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function IntegrationCard({ item }) {
  const { success, error } = useToast();
  const [saveIntegration, { isLoading: saving }] = useSaveIntegrationMutation();
  const [testIntegration, { isLoading: testing }] = useTestIntegrationMutation();

  const initial = useMemo(() => ({
    enabled: item.enabled,
    values: Object.fromEntries(item.fields.map((f) => [f.name, f.value ?? f.default ?? ''])),
  }), [item]);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [values, setValues] = useState(initial.values);
  const [secrets, setSecrets] = useState({});       // only what the admin typed
  const [testTo, setTestTo] = useState('');

  const dirty = enabled !== initial.enabled
    || JSON.stringify(values) !== JSON.stringify(initial.values)
    || Object.values(secrets).some(Boolean);

  const save = async () => {
    try {
      await saveIntegration({ kind: item.kind, enabled, values, secrets }).unwrap();
      setSecrets({});
      success(`${item.label} saved`);
    } catch (e) { error(apiError(e, 'Could not save the settings')); }
  };

  const test = async (to) => {
    try {
      const res = await testIntegration({ kind: item.kind, ...(to ? { to } : {}) }).unwrap();
      (res.ok ? success : error)(res.detail);
    } catch (e) { error(apiError(e, 'The test could not run')); }
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 md:p-5 transition-smooth">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">{item.label}</h2>
          <Status item={item} />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          {enabled ? 'Enabled' : 'Disabled'}
          <Toggle checked={enabled} onChange={setEnabled} disabled={saving} />
        </label>
      </header>

      {item.source === 'env' && (
        <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Currently using the server's .env values. Save once to keep them here.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {item.fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {f.label}{f.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <FieldInput field={f} value={values[f.name]}
              onChange={(v) => setValues((cur) => ({ ...cur, [f.name]: v }))} />
            {f.help && <p className="text-[11px] text-muted-foreground/80">{f.help}</p>}
          </div>
        ))}

        {item.secrets.map((s) => (
          <div key={s.name} className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <KeyRound className="w-3.5 h-3.5" />
              {s.label}{s.required && <span className="text-rose-400 ml-1">*</span>}
            </label>
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={secrets[s.name] ?? ''}
              placeholder={s.set ? `${s.value}  (saved — type to replace)` : 'Not set'}
              onChange={(e) => setSecrets((cur) => ({ ...cur, [s.name]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button type="button" onClick={save} disabled={!dirty || saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground
            transition-smooth hover:opacity-90 active:scale-[0.97] disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => test()} disabled={testing || dirty || item.missing.length > 0}
          title={dirty ? 'Save first' : item.missing.length ? 'Fill in the required fields first' : ''}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm
            text-foreground transition-smooth hover:bg-secondary/60 active:scale-[0.97] disabled:opacity-40">
          <Activity className="w-4 h-4" /> {testing ? 'Testing…' : 'Test connection'}
        </button>

        {item.kind === 'email' && (
          <div className="flex flex-1 min-w-[260px] items-center gap-2 sm:justify-end">
            <input className={`${inputClass} max-w-[260px]`} type="email" value={testTo}
              placeholder="you@company.com" onChange={(e) => setTestTo(e.target.value)} />
            <button type="button" onClick={() => test(testTo)}
              disabled={!testTo || testing || dirty || item.missing.length > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm
                text-foreground transition-smooth hover:bg-secondary/60 active:scale-[0.97] disabled:opacity-40">
              <Send className="w-4 h-4" /> Send test email
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}

export default function IntegrationsPage() {
  const { data: items = [], isLoading, error } = useGetIntegrationsQuery();

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
              <PlugZap className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground leading-none">Integrations</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Your company's own accounts. A feature shows in the menu only once it is set up and enabled here.
              </p>
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-rose-300">{apiError(error, 'Could not load the settings')}</p>}
        {/* Keyed on the saved state: after a save the card starts again from the server's values. */}
        {items.map((item) => <IntegrationCard key={`${item.kind}:${JSON.stringify(item)}`} item={item} />)}
      </div>
    </div>
  );
}
