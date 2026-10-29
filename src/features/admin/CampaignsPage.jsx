import { useMemo, useState } from 'react';
import { Megaphone, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import Modal from '@/features/email-templates/components/Modal';
import {
  useGetAdminCampaignsQuery,
  useCreateAdminCampaignMutation,
  useUpdateAdminCampaignMutation,
  useGetAdminUsersQuery,
  useGetDispositionsQuery,
} from '@/services';
import { Card, CheckList, Field, Pill, Table } from './ui';
import { apiError, buttonClass, ghostButtonClass, inputClass } from './lib';

// Dialer setup → Campaigns (api/routers/admin.py /admin/campaigns): what Dial Next
// does for each campaign, and which logins work it.

const DEFAULTS = {
  code: '', name: '', is_active: true, fresh_days: 42, redial_window_days: 15,
  redial_min_gap_hours: 3, max_attempts: 4, exclude_statuses: ['IN', 'INVN', 'NI'],
  caller_ids: [], auto_dial_delay_sec: 0, record: true, agent_ids: [],
};

const splitList = (text) => text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);

const NUMBERS = [
  ['fresh_days', 'New lead window (days)', 'Leads older than this are no longer dialled as new', 1, 3650],
  ['redial_window_days', 'Redial window (days)', 'How long after the last call a lead may be redialled', 0, 3650],
  ['redial_min_gap_hours', 'Gap between attempts (hours)', 'Never redial sooner than this', 0, 8760],
  ['max_attempts', 'Max attempts', 'Calls per lead before it stops being redialled', 1, 100],
  ['auto_dial_delay_sec', 'Auto-dial delay (seconds)', 'Pause after a disposition before the next auto dial (0 = off)', 0, 600],
];

function CampaignForm({ campaign, agents, onDone }) {
  const { success, error } = useToast();
  const [createCampaign, { isLoading: creating }] = useCreateAdminCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateAdminCampaignMutation();
  const { data: dispositions = [] } = useGetDispositionsQuery();
  const isNew = !campaign;
  const [form, setForm] = useState(() => ({ ...DEFAULTS, ...(campaign || {}) }));
  const [excludeText, setExcludeText] = useState(() => form.exclude_statuses.join(', '));
  const [callerText, setCallerText] = useState(() => form.caller_ids.join(', '));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      is_active: form.is_active,
      record: form.record,
      exclude_statuses: splitList(excludeText).map((s) => s.toUpperCase()),
      caller_ids: splitList(callerText),
      agent_ids: form.agent_ids,
      ...Object.fromEntries(NUMBERS.map(([k]) => [k, Number(form[k])])),
    };
    try {
      if (isNew) {
        await createCampaign({ ...body, code: form.code.trim() }).unwrap();
        success(`Campaign ${body.name} created`);
      } else {
        await updateCampaign({ id: campaign.id, ...body }).unwrap();
        success(`${body.name} saved`);
      }
      onDone();
    } catch (err) { error(apiError(err, 'Could not save the campaign')); }
  };

  const agentOptions = agents.map((a) => ({ id: a.id, label: a.full_name ? `${a.username} · ${a.full_name}` : a.username, hint: a.role }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" hint={isNew ? '1-20 letters, digits, _ or - (cannot change later)' : 'Fixed once created'}>
          <input className={inputClass} value={form.code} maxLength={20} disabled={!isNew}
            onChange={(e) => set('code', e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))} />
        </Field>
        <Field label="Name">
          <input className={inputClass} value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} />
        </Field>
        {NUMBERS.map(([k, label, hint, min, max]) => (
          <Field key={k} label={label} hint={hint}>
            <input className={inputClass} type="number" min={min} max={max} value={form[k]}
              onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
        <Field label="Switches">
          <div className="flex flex-col gap-1 py-1 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.record} onChange={(e) => set('record', e.target.checked)} /> Record calls
            </label>
          </div>
        </Field>
      </div>
      <Field label="Never redial these statuses" hint={
        dispositions.length ? `Your codes: ${dispositions.map((d) => d.status).join(', ')}` : 'Comma-separated status codes'}>
        <input className={inputClass} value={excludeText} onChange={(e) => setExcludeText(e.target.value.toUpperCase())}
          placeholder="IN, INVN, NI" />
      </Field>
      <Field label="Caller IDs" hint="Comma-separated numbers shown to customers. Blank = the company's default numbers">
        <input className={inputClass} value={callerText} onChange={(e) => setCallerText(e.target.value)}
          placeholder="e.g. 912240001234, 912240005678" />
      </Field>
      <Field label="Logins on this campaign">
        <CheckList options={agentOptions} value={form.agent_ids} onChange={(v) => set('agent_ids', v)}
          empty="No logins yet: create them on Dialer setup → Users" />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onDone}>Cancel</button>
        <button type="submit" className={buttonClass}
          disabled={!form.name.trim() || (isNew && !form.code.trim()) || creating || updating}>
          {isNew ? 'Create campaign' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default function CampaignsPage() {
  const { data, isLoading } = useGetAdminCampaignsQuery();
  const { data: userData } = useGetAdminUsersQuery({ active: 'true' });
  const agents = useMemo(() => (userData?.rows ?? []).filter((u) => u.role !== 'admin'), [userData]);
  const rows = data?.rows ?? [];
  const [editing, setEditing] = useState(null);   // null | 'new' | campaign

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card icon={Megaphone} title="Campaigns" subtitle="How Dial Next picks leads, and who dials each campaign"
        actions={<button type="button" className={buttonClass} onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> New campaign</button>}>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <Table head={['Code', 'Name', 'New / redial', 'Attempts', 'Caller IDs', 'Logins', 'Recording', 'Status', '']}
          empty={!isLoading && !rows.length ? 'No campaigns yet' : null}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono text-xs text-foreground">{c.code}</td>
              <td className="px-3 py-2 font-semibold text-foreground">{c.name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {c.fresh_days}d new · {c.redial_window_days}d redial · {c.redial_min_gap_hours}h gap
              </td>
              <td className="px-3 py-2">{c.max_attempts}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{c.caller_ids?.length ? c.caller_ids.join(', ') : 'default'}</td>
              <td className="px-3 py-2">{c.agent_ids?.length ?? 0}</td>
              <td className="px-3 py-2 text-xs">{c.record ? 'on' : 'off'}</td>
              <td className="px-3 py-2"><Pill on={c.is_active} /></td>
              <td className="px-3 py-2 text-right">
                <button type="button" className={ghostButtonClass} onClick={() => setEditing(c)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={!!editing} wide onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New campaign' : `Edit ${editing?.name ?? ''}`}>
        {editing && (
          <CampaignForm key={editing === 'new' ? 'new' : editing.id} campaign={editing === 'new' ? null : editing}
            agents={agents} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
