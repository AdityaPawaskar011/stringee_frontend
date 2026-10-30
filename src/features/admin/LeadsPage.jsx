import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, ChevronDown, Contact, Download, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useToast } from '@/shared/hooks/useToast';
import ConfirmDeletePopup from '@/shared/components/ConfirmDeletePopup';
import { selectMaskPii } from '@/features/auth/slices/authSlice';
import { maskPhone } from '@/shared/lib/mask';
import {
  useGetAdminLeadsQuery,
  useGetAdminListsQuery,
  useUploadAdminLeadsMutation,
  useMoveAdminLeadsMutation,
  useResetAdminLeadsMutation,
  useDeleteAdminLeadsMutation,
  useGetDispositionsQuery,
} from '@/services';
import { Card, Field, Pager, Table } from './ui';
import { apiError, buttonClass, fmtDateTime, ghostButtonClass, inputClass } from './lib';

// Dialer setup → Leads (api/routers/admin_leads.py): every lead of the company, with
// upload into a list and bulk move / reset / delete. A lead an agent is on right now
// is never changed; the API counts it as skipped.

const PAGE_SIZE = 50;

// The rows of public/sample-admin-leads.xlsx, shown under "See an example".
const SAMPLE_HEAD = ['phone', 'first_name', 'last_name', 'email', 'city', 'address1', 'comments', 'source', 'owner', 'budget'];
const SAMPLE_ROWS = [
  ['9000000001', 'Asha', 'Patel', 'asha@example.com', 'Mumbai', '12 MG Road', 'Interested in gold plan', 'Expo 2026', '', '50000'],
  ['+91 90000 00002', 'Ravi', 'Kumar', 'ravi@example.com', 'Pune', '', 'Call after 5 pm', 'Website', '', ''],
  ['09000000003', 'Neha', '', 'neha@example.com', 'Delhi', '', '', 'Referral', '', '25000'],
];

function SampleFile() {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <a href="/sample-admin-leads.xlsx" download
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/20 transition-smooth">
          <Download className="w-3.5 h-3.5" /> Download sample Excel
        </a>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-smooth">
          See an example
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="space-y-2 animate-fade-in">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-xs">
              <thead className="bg-secondary/40">
                <tr>
                  {SAMPLE_HEAD.map((h) => (
                    <th key={h} className={`px-3 py-2 text-left font-mono font-semibold whitespace-nowrap
                      ${h === 'phone' ? 'text-primary' : 'text-foreground'}`}>
                      {h}{h === 'phone' && ' *'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    {r.map((v, j) => (
                      <td key={j} className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{v || <span className="opacity-40">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
            <li><span className="text-primary">phone *</span> is the only required column. 10 digits = India; +91, spaces and a leading 0 are fine.</li>
            <li>Instead of first_name / last_name you can use one <code>name</code> column.</li>
            <li><code>owner</code> is an agent&apos;s login username (e.g. agentA), or blank. A name that is not a login rejects that row.</li>
            <li>Any other column (like <code>budget</code>) is kept on the lead as extra details.</li>
            <li>Choose the list above; the file needs no list or campaign column. Max 50,000 rows.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadPanel({ lists, defaultListId }) {
  const { success, error } = useToast();
  const [upload, { isLoading }] = useUploadAdminLeadsMutation();
  // The list picked here, else the one the page is filtered to.
  const [picked, setListId] = useState('');
  const listId = picked || defaultListId || '';
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await upload({ listId, file }).unwrap();
      setResult(res);
      success(`${res.inserted} lead(s) added`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) { error(apiError(err, 'Upload failed')); }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed border-border bg-background/30 p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
        <Field label="Into list">
          <select className={inputClass} value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">Choose a list…</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}{l.campaign_name ? ` · ${l.campaign_name}` : ' · parked'}</option>)}
          </select>
        </Field>
        <Field label="File (.csv or .xlsx)">
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className={inputClass}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <button type="submit" className={buttonClass} disabled={!listId || !file || isLoading}>
          <Upload className="w-4 h-4" /> {isLoading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Needs a <code>phone</code> column. Also read: first_name, last_name (or name), email, city, address1–3,
        comments, source, owner (a username). Any other column is kept on the lead.
        Numbers already in your company or on the do-not-call list are skipped.
      </p>
      <SampleFile />
      {result && (
        <div className="rounded-lg border border-border bg-card/60 p-3 text-sm space-y-2">
          <div className="flex flex-wrap gap-4">
            <span>{result.total_rows} row(s)</span>
            <span className="text-emerald-300">{result.inserted} added</span>
            <span className="text-amber-300">{result.duplicates} duplicate</span>
            <span className="text-rose-300">{result.invalid} invalid</span>
          </div>
          {result.errors?.length > 0 && (
            <ul className="max-h-36 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
              {result.errors.map((er, i) => (
                <li key={i}>Row {er.row}{er.phone ? ` (${er.phone})` : ''}: {er.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

export default function LeadsPage() {
  const { success, error, info } = useToast();
  const maskPii = useSelector(selectMaskPii);
  const [searchParams, setSearchParams] = useSearchParams();
  const listId = searchParams.get('list_id') || '';
  const [status, setStatus] = useState('');
  const [qText, setQText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [moveTo, setMoveTo] = useState('');
  const [confirm, setConfirm] = useState(null);    // 'reset' | 'delete' | 'move'

  // Search after the admin stops typing.
  useEffect(() => {
    const id = setTimeout(() => { setQ(qText.trim()); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [qText]);

  const params = useMemo(() => ({
    page, page_size: PAGE_SIZE,
    ...(listId ? { list_id: listId } : {}),
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  }), [page, listId, status, q]);
  const { data, isLoading, isFetching } = useGetAdminLeadsQuery(params);
  const { data: listData } = useGetAdminListsQuery();
  const lists = listData?.rows ?? [];
  const rows = data?.rows ?? [];
  // NEW and INCALL are the dialer's own; the rest are the company's dispositions.
  const { data: dispositions = [] } = useGetDispositionsQuery();
  const statuses = useMemo(
    () => [...new Set(['NEW', 'INCALL', ...dispositions.map((d) => d.status)])],
    [dispositions],
  );

  const [moveLeads, { isLoading: moving }] = useMoveAdminLeadsMutation();
  const [resetLeads, { isLoading: resetting }] = useResetAdminLeadsMutation();
  const [deleteLeads, { isLoading: deleting }] = useDeleteAdminLeadsMutation();
  const busy = moving || resetting || deleting;

  const setList = (v) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set('list_id', v); else next.delete('list_id');
    setSearchParams(next, { replace: true });
    setPage(1);
    setSelected(new Set());
  };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () => setSelected((s) => {
    const next = new Set(s);
    rows.forEach((r) => (allOnPage ? next.delete(r.id) : next.add(r.id)));
    return next;
  });
  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runBulk = async () => {
    const ids = [...selected];
    try {
      let done, verb;
      if (confirm === 'move') {
        const res = await moveLeads({ ids, listId: Number(moveTo) }).unwrap();
        [done, verb] = [res.moved, 'moved'];
      } else if (confirm === 'reset') {
        const res = await resetLeads(ids).unwrap();
        [done, verb] = [res.reset, 'reset to NEW'];
      } else {
        const res = await deleteLeads(ids).unwrap();
        [done, verb] = [res.deleted, 'deleted'];
      }
      success(`${done} lead(s) ${verb}`);
      if (done < ids.length) info(`${ids.length - done} skipped: in a call right now, or already gone`);
      setSelected(new Set());
    } catch (e) { error(apiError(e, 'Could not update the leads')); }
    setConfirm(null);
  };

  const confirmText = {
    move: `Move ${selected.size} lead(s) to ${lists.find((l) => String(l.id) === String(moveTo))?.name ?? 'that list'}? They are dialled by that list's campaign.`,
    reset: `Reset ${selected.size} lead(s) to NEW? Their attempt count starts again and they are dialled as new leads.`,
    delete: `Delete ${selected.size} lead(s)? Their call history stays, but the leads cannot be brought back.`,
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card icon={Contact} title="Leads" subtitle="Every lead in your company's lists">
        <UploadPanel lists={lists} defaultListId={listId} />

        <div className="flex flex-wrap items-center gap-3">
          <select className={`${inputClass} w-auto`} value={listId} onChange={(e) => setList(e.target.value)}>
            <option value="">Every list</option>
            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className={`${inputClass} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Every status</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input className={`${inputClass} pl-9`} value={qText} placeholder="Search name, email or phone"
              onChange={(e) => setQText(e.target.value)} />
          </label>
          {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{selected.size} selected</span>
            <button type="button" className={ghostButtonClass} onClick={() => setSelected(new Set())}>Clear</button>
            <span className="flex-1" />
            <select className={`${inputClass} w-auto py-1.5`} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">Move to list…</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <button type="button" className={ghostButtonClass} disabled={!moveTo || busy} onClick={() => setConfirm('move')}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Move
            </button>
            <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => setConfirm('reset')}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset to NEW
            </button>
            <button type="button" className={`${ghostButtonClass} text-rose-300`} disabled={busy} onClick={() => setConfirm('delete')}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}

        <Table
          head={[
            <input key="all" type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select page" />,
            'ID', 'Phone', 'Name', 'List', 'Status', 'Calls', 'Last call', 'Added',
          ]}
          empty={!isLoading && !rows.length ? 'No leads match' : null}>
          {rows.map((r) => (
            <tr key={r.id} className={`hover:bg-secondary/20 ${selected.has(r.id) ? 'bg-primary/5' : ''}`}>
              <td className="px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.id}</td>
              <td className="px-3 py-2 font-mono text-xs">{maskPii ? maskPhone(r.phone) : r.phone}</td>
              <td className="px-3 py-2">
                <div className="text-foreground">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</div>
                {r.address1 && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.address1}</div>}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.list_name}{r.campaign_code ? ` · ${r.campaign_code}` : ''}</td>
              <td className="px-3 py-2"><span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold">{r.status}</span></td>
              <td className="px-3 py-2">{r.called_count}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {fmtDateTime(r.last_called_at)}{r.last_called_by_username ? ` · ${r.last_called_by_username}` : ''}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
            </tr>
          ))}
        </Table>
        <Pager page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPage={setPage} />
      </Card>

      <ConfirmDeletePopup
        open={!!confirm}
        title={confirm === 'move' ? 'Move leads' : confirm === 'reset' ? 'Reset leads' : 'Delete leads'}
        message={confirmText[confirm]}
        loading={busy}
        confirmLabel={confirm === 'move' ? 'Move' : confirm === 'reset' ? 'Reset' : 'Delete'}
        onConfirm={runBulk}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
