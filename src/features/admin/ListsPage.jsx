import { useState } from 'react';
import { ListOrdered, Pencil, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/shared/hooks/useToast';
import Modal from '@/features/email-templates/components/Modal';
import {
  useGetAdminListsQuery,
  useCreateAdminListMutation,
  useUpdateAdminListMutation,
  useGetAdminCampaignsQuery,
} from '@/services';
import { Card, Field, Pill, Table } from './ui';
import { apiError, buttonClass, ghostButtonClass, inputClass } from './lib';

// Dialer setup → Lead lists (api/routers/admin.py /admin/lists). A list belongs to a
// campaign (its leads are dialled there) or is parked (no campaign: never dialled).
// The default list (★) is where a new lead lands when no Lead Router rule matches.

function ListForm({ list, campaigns, onDone }) {
  const { success, error } = useToast();
  const [createList, { isLoading: creating }] = useCreateAdminListMutation();
  const [updateList, { isLoading: updating }] = useUpdateAdminListMutation();
  const isNew = !list;
  const [form, setForm] = useState(() => ({
    name: list?.name ?? '',
    campaign_id: list?.campaign_id ?? '',
    is_active: list?.is_active ?? true,
    is_default: list?.is_default ?? false,
    source: list?.source ?? '',
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      campaign_id: form.campaign_id === '' ? null : Number(form.campaign_id),
      is_active: form.is_active,
      is_default: form.is_default,
      source: form.source.trim(),
    };
    try {
      if (isNew) await createList(body).unwrap();
      else await updateList({ id: list.id, ...body }).unwrap();
      success(`${body.name} ${isNew ? 'created' : 'saved'}`);
      onDone();
    } catch (err) { error(apiError(err, 'Could not save the list')); }
  };

  const moving = !isNew && String(list.campaign_id ?? '') !== String(form.campaign_id);

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name">
        <input className={inputClass} value={form.name} maxLength={80} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Campaign" hint={moving ? `All ${list.lead_count} lead(s) in this list move with it.` : 'Parked = kept, never dialled'}>
        <select className={inputClass} value={form.campaign_id} onChange={(e) => set('campaign_id', e.target.value)}>
          <option value="">Parked (no campaign)</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
      </Field>
      <Field label="Source label (optional)" hint="A note for you, e.g. Facebook, Website, Expo 2026">
        <input className={inputClass} value={form.source} maxLength={100} onChange={(e) => set('source', e.target.value)} />
      </Field>
      <div className="flex flex-col gap-1 text-sm text-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          Active (its leads are dialled)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} />
          Default list for new leads no Lead Router rule claims
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onDone}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={!form.name.trim() || creating || updating}>
          {isNew ? 'Create list' : 'Save'}
        </button>
      </div>
    </form>
  );
}

const countsText = (counts) => Object.entries(counts || {})
  .sort((a, b) => b[1] - a[1])
  .map(([status, n]) => `${status} ${n}`)
  .join(' · ');

export default function ListsPage() {
  const [campaignFilter, setCampaignFilter] = useState('');
  const { data, isLoading, isFetching } = useGetAdminListsQuery(campaignFilter || undefined);
  const { data: campaignData } = useGetAdminCampaignsQuery();
  const campaigns = campaignData?.rows ?? [];
  const rows = data?.rows ?? [];
  const [editing, setEditing] = useState(null);   // null | 'new' | list

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card icon={ListOrdered} title="Lead lists" subtitle="Where leads live, and which campaign dials them"
        actions={<button type="button" className={buttonClass} onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> New list</button>}>
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${inputClass} w-auto`} value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
            <option value="">Every campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
          {!isLoading && !rows.some((l) => l.is_default) && !campaignFilter && (
            <span className="text-xs text-amber-300">No default list: leads no rule claims are parked until you set one.</span>
          )}
        </div>
        <Table head={['', 'List', 'Campaign', 'Leads', 'By status', 'Status', '']}
          empty={!isLoading && !rows.length ? 'No lists yet' : null}>
          {rows.map((l) => (
            <tr key={l.id} className="hover:bg-secondary/20">
              <td className="px-3 py-2 w-6" title={l.is_default ? 'Default list for new leads' : undefined}>
                {l.is_default && <Star className="w-4 h-4 text-amber-300 fill-amber-300" />}
              </td>
              <td className="px-3 py-2">
                <div className="font-semibold text-foreground">{l.name}</div>
                <div className="text-xs text-muted-foreground">#{l.id}{l.source ? ` · ${l.source}` : ''}</div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{l.campaign_name || <em>parked</em>}</td>
              <td className="px-3 py-2">
                <Link className="text-primary hover:underline" to={`/admin/leads?list_id=${l.id}`}>{l.lead_count}</Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{countsText(l.counts) || '—'}</td>
              <td className="px-3 py-2"><Pill on={l.is_active} /></td>
              <td className="px-3 py-2 text-right">
                <button type="button" className={ghostButtonClass} onClick={() => setEditing(l)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New list' : `Edit ${editing?.name ?? ''}`}>
        {editing && (
          <ListForm key={editing === 'new' ? 'new' : editing.id} list={editing === 'new' ? null : editing}
            campaigns={campaigns} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
