import { useEffect, useMemo, useState } from 'react';
import { Ban, Plus, Search, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useToast } from '@/shared/hooks/useToast';
import ConfirmDeletePopup from '@/shared/components/ConfirmDeletePopup';
import { selectMaskPii } from '@/features/auth/slices/authSlice';
import { maskPhone } from '@/shared/lib/mask';
import { useGetDncQuery, useAddDncMutation, useDeleteDncMutation } from '@/services';
import { Card, Field, Pager, Table } from './ui';
import { apiError, buttonClass, fmtDateTime, ghostButtonClass, inputClass } from './lib';

// Dialer setup → Do-not-call (api/routers/admin_leads.py /admin/dnc): numbers your
// company never dials. Dial Next skips them, a manual dial is refused, and uploads
// leave them out.

const PAGE_SIZE = 50;

function AddForm() {
  const { success, error } = useToast();
  const [addDnc, { isLoading }] = useAddDncMutation();
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const row = await addDnc({ phone: phone.trim(), reason: reason.trim() }).unwrap();
      success(`${row.phone} will not be called`);
      setPhone('');
      setReason('');
    } catch (err) { error(apiError(err, 'Could not add the number')); }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border bg-background/30 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] items-end">
        <Field label="Phone number">
          <input className={inputClass} value={phone} maxLength={20} placeholder="e.g. 9876543210"
            onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Reason (optional)">
          <input className={inputClass} value={reason} maxLength={200} placeholder="e.g. Asked not to be called"
            onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button type="submit" className={buttonClass} disabled={phone.trim().length < 6 || isLoading}>
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </form>
  );
}

export default function DncPage() {
  const { success, error } = useToast();
  const maskPii = useSelector(selectMaskPii);
  const [qText, setQText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => { setQ(qText.trim()); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [qText]);

  const params = useMemo(() => ({ page, page_size: PAGE_SIZE, ...(q ? { q } : {}) }), [page, q]);
  const { data, isLoading, isFetching } = useGetDncQuery(params);
  const [deleteDnc, { isLoading: deleting }] = useDeleteDncMutation();
  const rows = data?.rows ?? [];

  const remove = async () => {
    try {
      await deleteDnc(removing.id).unwrap();
      success(`${removing.phone} can be called again`);
    } catch (e) { error(apiError(e, 'Could not remove the number')); }
    setRemoving(null);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card icon={Ban} title="Do-not-call" subtitle="Numbers your company never dials">
        <AddForm />
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input className={`${inputClass} pl-9`} value={qText} placeholder="Search number"
              onChange={(e) => setQText(e.target.value)} />
          </label>
          {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        <Table head={['Phone', 'Reason', 'Added by', 'Added', '']}
          empty={!isLoading && !rows.length ? 'No numbers on the list' : null}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono text-xs">{maskPii ? maskPhone(r.phone) : r.phone}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.reason || '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.added_by_username || '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
              <td className="px-3 py-2 text-right">
                <button type="button" className={ghostButtonClass} onClick={() => setRemoving(r)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </td>
            </tr>
          ))}
        </Table>
        <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
      </Card>

      <ConfirmDeletePopup
        open={!!removing}
        title="Remove from do-not-call"
        message={`Allow calls to ${removing?.phone ?? ''} again?`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
