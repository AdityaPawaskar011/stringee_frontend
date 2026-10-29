import { useMemo, useRef, useState } from 'react';
import {
  AudioLines, UploadCloud, Loader2, RefreshCw, RotateCw, Trash2, X, FileAudio, AlertTriangle,
} from 'lucide-react';

import {
  useGetManualAnalysesQuery,
  useUploadManualRecordingsMutation,
  useAnalyseManualRecordingsMutation,
  useDeleteManualRecordingMutation,
} from '@/services';
import { useToast } from '@/shared/hooks/useToast';
import ConfirmDeletePopup from '@/shared/components/ConfirmDeletePopup';
import ManualAnalysisDetailModal from './ManualAnalysisDetailModal';
import StatusBadge from './StatusBadge';
import { formatWhen, formatSize, isBusy } from './status';

// Fallbacks until the API answers with its own limits.
const DEFAULT_EXTS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.aac', '.amr'];
const DEFAULT_MAX_MB = 25;
const EMPTY = [];

const inputCls =
  'w-full rounded-lg border border-input bg-input/40 px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-smooth';
const ghostBtn =
  'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-secondary/40 text-xs ' +
  'text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth disabled:opacity-50 disabled:cursor-not-allowed';
const primaryBtn =
  'inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-primary/40 bg-primary/20 text-primary ' +
  'text-sm font-semibold hover:bg-primary/30 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed';

const extOf = (name) => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i).toLowerCase();
};

export default function ManualAnalysisPage() {
  const { success, error: toastError } = useToast();

  // Poll only while something is waiting for the AI.
  const [polling, setPolling] = useState(false);
  const { data, isLoading, isFetching, isError, refetch } = useGetManualAnalysesQuery(undefined, {
    pollingInterval: polling ? 4000 : 0,
  });
  const rows = data?.data ?? EMPTY;
  const hasBusy = rows.some((r) => isBusy(r.status));
  if (hasBusy !== polling) setPolling(hasBusy);

  const maxMb = data?.max_mb ?? DEFAULT_MAX_MB;
  const exts = data?.extensions ?? DEFAULT_EXTS;

  const [uploadFiles, { isLoading: uploading }] = useUploadManualRecordingsMutation();
  const [analyse, { isLoading: analysing }] = useAnalyseManualRecordingsMutation();
  const [deleteRow, { isLoading: deleting }] = useDeleteManualRecordingMutation();

  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const fileInput = useRef(null);

  const [selected, setSelected] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  // Keep only ids still listed (a row may have been deleted).
  const selectedIds = useMemo(() => rows.filter((r) => selected.has(r.id)).map((r) => r.id), [rows, selected]);
  const selectable = rows.filter((r) => !isBusy(r.status));
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    const bad = [];
    const good = incoming.filter((f) => {
      if (!exts.includes(extOf(f.name))) { bad.push(`${f.name}: not a supported audio file`); return false; }
      if (f.size > maxMb * 1024 * 1024) { bad.push(`${f.name}: larger than ${maxMb} MB`); return false; }
      return true;
    });
    if (bad.length) toastError(bad.join(' · '));
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}`));
      return [...prev, ...good.filter((f) => !seen.has(`${f.name}|${f.size}`))];
    });
  };

  const handleUpload = async () => {
    if (!files.length) return;
    try {
      const res = await uploadFiles({ files, agentName, clientName, notes }).unwrap();
      const n = res.created?.length ?? 0;
      if (n) success(`Uploaded ${n} recording${n === 1 ? '' : 's'} — analysis has started`);
      if (res.rejected?.length) toastError(res.rejected.map((r) => `${r.name}: ${r.reason}`).join(' · '));
      setFiles([]);
      if (fileInput.current) fileInput.current.value = '';
    } catch (e) {
      toastError(`Upload failed: ${e?.data?.detail || e?.error || 'unknown error'}`);
    }
  };

  const runAnalyse = async (ids) => {
    if (!ids.length) return;
    try {
      const res = await analyse(ids).unwrap();
      success(res.queued ? `Analysing ${res.queued} recording${res.queued === 1 ? '' : 's'}` : 'Nothing to analyse');
      setSelected(new Set());
    } catch (e) {
      toastError(`Could not start analysis: ${e?.data?.detail || e?.error || 'unknown error'}`);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRow(toDelete.id).unwrap();
      success('Recording deleted');
    } catch (e) {
      toastError(`Delete failed: ${e?.data?.detail || e?.error || 'unknown error'}`);
    } finally {
      setToDelete(null);
    }
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-xl border border-border bg-gradient-to-b from-card/70 to-card/40 px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-primary/30 bg-primary/10 grid place-items-center shrink-0">
          <AudioLines className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-none">Manual Analysis</h1>
          <p className="text-[11px] text-muted-foreground mt-1">
            Upload call recordings and score them with the same AI used for dialer calls
          </p>
        </div>
      </div>

      {/* Upload */}
      <section className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-smooth ${
            dragOver ? 'border-primary/70 bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-secondary/20'
          }`}
        >
          <UploadCloud className="w-7 h-7 mx-auto text-primary" />
          <p className="mt-2 text-sm font-medium text-foreground">Drop call recordings here, or click to choose</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {exts.map((e) => e.slice(1).toUpperCase()).join(', ')} · up to {maxMb} MB each
          </p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={['audio/*', ...exts].join(',')}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}`}
                className="inline-flex items-center gap-1.5 max-w-xs rounded-md border border-primary/30 bg-primary/10 pl-2 pr-1 py-1 text-xs text-foreground"
              >
                <FileAudio className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate" title={f.name}>{f.name}</span>
                <span className="text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="h-5 w-5 grid place-items-center rounded hover:bg-primary/20 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name (optional)" className={inputCls} />
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name (optional)" className={inputCls} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={inputCls} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Names are used to label the transcript as &ldquo;Name (Agent)&rdquo; / &ldquo;Name (Client)&rdquo;. They apply to every file in this upload.
          </p>
          <button type="button" onClick={handleUpload} disabled={!files.length || uploading} className={primaryBtn}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? 'Uploading…' : `Upload ${files.length ? files.length + ' ' : ''}recording${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </section>

      {/* Recordings */}
      <section className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">
            {rows.length} recording{rows.length === 1 ? '' : 's'}
            {hasBusy && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal">
                <Loader2 className="w-3 h-3 animate-spin" /> analysing
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={refetch} disabled={isFetching} className={ghostBtn}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => runAnalyse(selectedIds)}
              disabled={!selectedIds.length || analysing}
              className={ghostBtn}
              title="Run the AI again on the selected recordings"
            >
              <RotateCw className="w-3.5 h-3.5" /> Analyse selected ({selectedIds.length})
            </button>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 py-12 text-destructive">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm">Failed to load recordings</p>
            <button onClick={refetch} className="text-xs underline">Retry</button>
          </div>
        ) : isLoading ? (
          <div className="py-12 grid place-items-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No recordings uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="w-10 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)))}
                      aria-label="Select all"
                      className="accent-[hsl(var(--primary))]"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">File</th>
                  <th className="px-3 py-2 text-left font-medium">Uploaded</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Rating</th>
                  <th className="px-3 py-2 text-left font-medium">Outcome</th>
                  <th className="px-3 py-2 text-left font-medium">Summary</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const busy = isBusy(r.status);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setOpenId(r.id)}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/30 cursor-pointer transition-smooth"
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          disabled={busy}
                          onChange={() => toggle(r.id)}
                          aria-label={`Select ${r.original_name}`}
                          className="accent-[hsl(var(--primary))]"
                        />
                      </td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <div className="truncate font-medium text-foreground" title={r.original_name}>{r.original_name}</div>
                        {(r.agent_name || r.client_name) && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {[r.agent_name && `Agent: ${r.agent_name}`, r.client_name && `Client: ${r.client_name}`].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-xs text-foreground/90">{r.uploaded_by}</div>
                        <div className="text-[11px] text-muted-foreground">{formatWhen(r.uploaded_at)}</div>
                      </td>
                      <td className="px-3 py-2.5" title={r.error || undefined}><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono-nums">
                        {r.overall_rating != null ? `${Number(r.overall_rating).toFixed(1)}/5` : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-foreground/90">{r.call_outcome || '—'}</td>
                      <td className="px-3 py-2.5 max-w-[320px]">
                        <div className="truncate text-xs text-muted-foreground" title={r.summary || r.error || ''}>
                          {r.summary || (r.status === 'failed' ? r.error : '') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!busy && r.status !== 'successful' && (
                            <button
                              type="button"
                              onClick={() => runAnalyse([r.id])}
                              disabled={analysing}
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-smooth disabled:opacity-50"
                            >
                              <RotateCw className="w-3 h-3" /> Re-analyse
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setToDelete(r)}
                            disabled={r.status === 'analysing'}
                            title={r.status === 'analysing' ? 'Wait until the analysis finishes' : 'Delete'}
                            className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openId != null && (
        <ManualAnalysisDetailModal
          id={openId}
          onClose={() => setOpenId(null)}
          onAnalyse={(id) => runAnalyse([id])}
        />
      )}

      <ConfirmDeletePopup
        open={!!toDelete}
        title="Delete recording"
        message={toDelete ? `Delete "${toDelete.original_name}" and its analysis? This cannot be undone.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        loading={deleting}
      />
    </div>
  );
}
