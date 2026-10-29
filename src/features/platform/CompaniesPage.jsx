import { useMemo, useState } from 'react';
import { Building2, Plus, Search, Users } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import {
  useGetPlatformCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useGetPlatformAgentsQuery,
  useSetAgentCompanyMutation,
} from '@/services';

// Platform → Companies (platform admins only, api/routers/platform.py): create companies
// and move any login to a company. A login's company decides everything it sees.

const inputClass =
  'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition';

const apiError = (e, fallback) => {
  const d = e?.data?.detail;
  return typeof d === 'string' ? d : fallback;
};

const SOURCE = {
  login: 'set for this login',
  group: 'from its user group',
  default: 'default company',
  none: 'no company',
};

function Card({ icon, title, subtitle, children }) {
  const Icon = icon;
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-primary/20 bg-primary/10 grid place-items-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function NewCompanyForm() {
  const { success, error } = useToast();
  const [createCompany, { isLoading }] = useCreateCompanyMutation();
  const empty = { name: '', slug: '', primary_color: '#2F7BFF', accent_color: '', useColors: false };
  const [form, setForm] = useState(empty);
  const autoSlug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await createCompany({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        ...(form.useColors ? { primary_color: form.primary_color, accent_color: form.accent_color || undefined } : {}),
      }).unwrap();
      success(`${res.name} created (${res.slug})`);
      setForm(empty);
    } catch (err) { error(apiError(err, 'Could not create the company')); }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border bg-background/30 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Company name</label>
          <input className={inputClass} value={form.name} maxLength={60} placeholder="e.g. Acme Brokers"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Short name (optional)</label>
          <input className={inputClass} value={form.slug} maxLength={41} placeholder={autoSlug || 'acme'}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={form.useColors}
            onChange={(e) => setForm((f) => ({ ...f, useColors: e.target.checked }))} />
          Brand colours
        </label>
        {form.useColors && (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Primary <input type="color" value={form.primary_color}
                onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value.toUpperCase() }))} />
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Accent <input type="color" value={form.accent_color || '#08C9E8'}
                onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value.toUpperCase() }))} />
            </label>
          </>
        )}
        <p className="flex-1 min-w-[200px] text-xs text-muted-foreground">
          Starts with the standard dispositions. Then move its logins below, and map its campaigns.
        </p>
        <button type="submit" disabled={isLoading || form.name.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold
            text-primary-foreground transition-smooth hover:opacity-90 active:scale-[0.97] disabled:opacity-40">
          <Plus className="w-4 h-4" /> Create company
        </button>
      </div>
    </form>
  );
}

function Companies() {
  const { success, error } = useToast();
  const { data: companies = [], isLoading } = useGetPlatformCompaniesQuery();
  const [updateCompany, { isLoading: saving }] = useUpdateCompanyMutation();

  const toggle = async (c) => {
    const status = c.status === 'active' ? 'suspended' : 'active';
    if (status === 'suspended' && !window.confirm(`Suspend ${c.name}? Its logins lose access until it is reactivated.`)) return;
    try {
      await updateCompany({ slug: c.slug, status }).unwrap();
      success(`${c.name} ${status === 'active' ? 'reactivated' : 'suspended'}`);
    } catch (e) { error(apiError(e, 'Could not update the company')); }
  };

  return (
    <Card icon={Building2} title="Companies" subtitle="Every company on this dialer">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <ul className="divide-y divide-border rounded-lg border border-border">
        {companies.map((c) => (
          <li key={c.slug} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="font-semibold text-foreground">{c.name}</span>
            <code className="text-xs text-muted-foreground">{c.slug}</code>
            {c.is_default && <span className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">default</span>}
            <span className="text-xs text-muted-foreground">{c.logins} login{c.logins === 1 ? '' : 's'} set</span>
            <span className={`ml-auto text-[11px] font-semibold rounded-full px-2.5 py-1 border
              ${c.status === 'active' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-rose-500/30 text-rose-300 bg-rose-500/10'}`}>
              {c.status}
            </span>
            {!c.is_default && (
              <button type="button" onClick={() => toggle(c)} disabled={saving}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-secondary/60 disabled:opacity-40">
                {c.status === 'active' ? 'Suspend' : 'Reactivate'}
              </button>
            )}
          </li>
        ))}
      </ul>
      <NewCompanyForm />
    </Card>
  );
}

function Agents() {
  const { success, error } = useToast();
  const { data: companies = [] } = useGetPlatformCompaniesQuery();
  const { data: agents = [], isLoading } = useGetPlatformAgentsQuery();
  const [setAgentCompany, { isLoading: moving }] = useSetAgentCompanyMutation();
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [company, setCompany] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents.filter((a) => (!onlyActive || a.active)
      && (!company || a.company === company)
      && (!needle || `${a.user} ${a.full_name} ${a.user_group}`.toLowerCase().includes(needle)));
  }, [agents, q, onlyActive, company]);

  const move = async (a, slug) => {
    if (!slug || slug === a.company) return;
    try {
      const res = await setAgentCompany({ user: a.user, company: slug }).unwrap();
      success(`${a.user} moved to ${res.company_name}`);
    } catch (e) { error(apiError(e, 'Could not move the login')); }
  };

  return (
    <Card icon={Users} title="Logins" subtitle="Every login and the company it works for">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input className={`${inputClass} pl-9`} value={q} placeholder="Search login, name or group"
            onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className={`${inputClass} w-auto`} value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">Every company</option>
          {companies.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          Active only
        </label>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Login</th><th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Level</th><th className="px-3 py-2">Group</th>
              <th className="px-3 py-2">Company</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.user} className={a.active ? '' : 'opacity-50'}>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {a.user}{a.is_platform_admin && <span className="ml-2 text-[10px] text-primary">platform</span>}
                </td>
                <td className="px-3 py-2 text-foreground">{a.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.user_level >= 7 ? `${a.user_level} admin` : a.user_level}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.user_group}</td>
                <td className="px-3 py-2">
                  <select className={`${inputClass} py-1.5`} value={a.company || ''} disabled={moving}
                    onChange={(e) => move(a, e.target.value)}>
                    {!a.company && <option value="">—</option>}
                    {companies.filter((c) => c.status === 'active' || c.slug === a.company)
                      .map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{SOURCE[a.source] || a.source}</div>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No logins match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        A login's company decides every lead, call, report and setting it sees. The change applies within a minute,
        and a logged-in agent should sign in again.
      </p>
    </Card>
  );
}

export default function CompaniesPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="mx-auto max-w-[1200px] space-y-5 stagger-children">
        <Companies />
        <Agents />
      </div>
    </div>
  );
}
