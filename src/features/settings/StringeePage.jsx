import { useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, MessageSquare, PhoneOutgoing, RefreshCw, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useGetStringeeSettingsQuery, useSaveStringeeSettingsMutation } from '@/services';
import { useToast } from '@/shared/hooks/useToast';

// Settings → Stringee (api/routers/settings.py, services/stringee_settings.py): the
// numbers the company's calls go out from and the sender of its SMS. Empty = the
// server's .env values. A campaign's own caller IDs (Admin → Campaigns) still win.

const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';

const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};

const plus = (n) => `+${n}`;

function Card({ icon: Icon, title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg border border-primary/20 bg-primary/10 grid place-items-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StringeeForm({ data, onRefresh, refreshing }) {
  const { success, error } = useToast();
  const [saveSettings, { isLoading: saving }] = useSaveStringeeSettingsMutation();
  const [selected, setSelected] = useState(() => data.caller_ids);
  const [smsFrom, setSmsFrom] = useState(data.sms_from);

  const numbers = useMemo(() => data.numbers ?? [], [data.numbers]);
  const outbound = numbers.filter((n) => n.outbound);
  // Saved numbers Stringee no longer lists (removed, or outbound switched off).
  const stale = selected.filter((n) => !outbound.some((o) => o.number === n));

  const dirty =
    smsFrom.trim() !== data.sms_from ||
    selected.length !== data.caller_ids.length ||
    selected.some((n, i) => n !== data.caller_ids[i]);

  const toggle = (number) =>
    setSelected((cur) => (cur.includes(number) ? cur.filter((n) => n !== number) : [...cur, number]));

  const save = async () => {
    try {
      await saveSettings({ caller_ids: selected, sms_from: smsFrom.trim() }).unwrap();
      success('Stringee settings saved');
    } catch (e) {
      error(apiError(e, 'Could not save the Stringee settings'));
    }
  };

  const using = data.caller_ids.length ? data.caller_ids : data.defaults.caller_ids;

  return (
    <>
      <Card
        icon={PhoneOutgoing}
        title="Caller IDs"
        description="Calls go out from one of the ticked numbers, and a client always sees the same one. A campaign with its own caller IDs (Admin → Campaigns) uses those instead."
        action={
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Reload the numbers from Stringee"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      >
        <p className="text-xs text-muted-foreground">
          In use now{data.caller_ids.length ? '' : ' (server default)'}:{' '}
          <span className="font-mono text-foreground">
            {using.length ? using.map(plus).join(', ') : 'none — calls cannot be placed'}
          </span>
        </p>

        {data.numbers_error && (
          <p className="flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            {data.numbers_error}. Saving caller IDs needs Stringee; try Refresh in a minute.
          </p>
        )}

        {numbers.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-xs">
              <button type="button" className="text-primary hover:underline"
                onClick={() => setSelected(outbound.map((n) => n.number))}>
                Select all
              </button>
              <button type="button" className="text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => setSelected([])}>
                Clear (use server default)
              </button>
              <span className="ml-auto text-muted-foreground">{selected.length} selected</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {numbers.map((n) => (
                <li key={n.number}>
                  <label
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-smooth
                      ${n.outbound ? 'cursor-pointer hover:bg-secondary/40' : 'opacity-50 cursor-not-allowed'}
                      ${selected.includes(n.number) ? 'border-primary/50 bg-primary/10' : 'border-border'}`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[hsl(var(--primary))]"
                      checked={selected.includes(n.number)}
                      disabled={!n.outbound}
                      onChange={() => toggle(n.number)}
                    />
                    <span className="font-mono">{plus(n.number)}</span>
                    {n.nickname && n.nickname !== n.number && <span className="truncate text-xs text-muted-foreground">{n.nickname}</span>}
                    {!n.outbound && (
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">Outbound off</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        {numbers.length > 0 && stale.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 space-y-1.5">
            <p>These saved numbers can no longer dial out on Stringee. Remove them to save:</p>
            <div className="flex flex-wrap gap-2">
              {stale.map((n) => (
                <button key={n} type="button" onClick={() => toggle(n)}
                  className="rounded-md border border-amber-500/40 px-2 py-0.5 font-mono hover:bg-amber-500/20">
                  {plus(n)} ✕
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card
        icon={MessageSquare}
        title="SMS sender"
        description="The brandname or number Stringee approved for your SMS. Leave it blank to use the server default."
      >
        <input
          className={inputClass}
          value={smsFrom}
          maxLength={20}
          onChange={(e) => setSmsFrom(e.target.value)}
          placeholder={data.defaults.sms_from ? `Server default: ${data.defaults.sms_from}` : 'Not set — SMS is off'}
        />
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </>
  );
}

export default function StringeePage() {
  const { data, isLoading, isFetching, error: loadError, refetch } = useGetStringeeSettingsQuery();
  // Restart the form from the server after every save / refresh.
  const formKey = data ? JSON.stringify([data.caller_ids, data.sms_from, data.numbers]) : '';

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
              <PhoneOutgoing className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground leading-none">Stringee</h1>
              <p className="text-xs text-muted-foreground mt-1">
                The numbers your calls go out from and the sender of your SMS. Changes apply to the next call.
              </p>
            </div>
          </div>
        </div>

        {data && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            {data.account === 'own'
              ? 'Using your own Stringee account.'
              : 'Using the shared Stringee account.'}
            <Link to="/settings/integrations" className="text-primary hover:underline">
              {data.account === 'own' ? 'Change the key' : 'Use your own account'} in Integrations
            </Link>
          </p>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loadError && <p className="text-sm text-rose-300">{apiError(loadError, 'Could not load the Stringee settings')}</p>}
        {data && <StringeeForm key={formKey} data={data} onRefresh={refetch} refreshing={isFetching} />}
      </div>
    </div>
  );
}
