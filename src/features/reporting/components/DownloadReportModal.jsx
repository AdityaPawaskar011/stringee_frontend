import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { X, Download, Loader2, Search, FileSpreadsheet, FileText, Check } from 'lucide-react';

import { selectMaskPii } from '@/features/auth/slices/authSlice';
import { selectDateRange } from '@/features/dashboard/slices/dateFilterSlice';
import { useToast } from '@/shared/hooks/useToast';
import { buildExportColumns, downloadReport, DEFAULT_EXPORT_KEYS, EXPORT_GROUPS } from '../exportColumns';

// The user's last column pick and format, per browser.
const COLS_KEY = 'rv-export-columns';
const FORMAT_KEY = 'rv-export-format';

function readStored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// `getRows` returns the rows exactly as the grid shows them (sort + header filters).
// It is read once on open, so the file holds the rows the header counts even if the
// page's 10 s poll refreshes the grid meanwhile.
export default function DownloadReportModal({ onClose, getRows, formFields = [] }) {
  const { error: toastError } = useToast();
  const maskPii = useSelector(selectMaskPii);
  const { from, to } = useSelector(selectDateRange) || {};

  const [rows] = useState(() => getRows());
  const columns = useMemo(() => buildExportColumns(rows, formFields, { maskPii }), [rows, formFields, maskPii]);

  const [format, setFormat] = useState(() => (readStored(FORMAT_KEY, 'xlsx') === 'csv' ? 'csv' : 'xlsx'));
  const [selected, setSelected] = useState(() => new Set(readStored(COLS_KEY, DEFAULT_EXPORT_KEYS)));
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      EXPORT_GROUPS.map((g) => {
        const all = columns.filter((c) => c.group === g.id);
        return {
          ...g,
          all,
          shown: q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all,
          picked: all.filter((c) => selected.has(c.key)).length,
        };
      }).filter((g) => g.all.length > 0),
    [columns, selected, q],
  );

  const chosen = columns.filter((c) => selected.has(c.key));

  const setKeys = (keys, on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  const toggle = (key) => setKeys([key], !selected.has(key));
  const visibleKeys = groups.flatMap((g) => g.shown.map((c) => c.key));

  const handleDownload = async () => {
    if (!chosen.length || !rows.length) return;
    setBusy(true);
    try {
      writeStored(COLS_KEY, [...selected]);
      writeStored(FORMAT_KEY, format);
      await downloadReport({ rows, columns: chosen, format, from, to });
      onClose();
    } catch (e) {
      toastError(`Download failed: ${e?.message || 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const formatBtn = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setFormat(value)}
      aria-pressed={format === value}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-smooth ${
        format === value
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-[0_30px_120px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] animate-pop-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground leading-none">Download report</h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              {rows.length} row{rows.length === 1 ? '' : 's'} — the current view (date range, filters and search), in the order shown
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-90"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format + column search */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            {formatBtn('xlsx', 'Excel (.xlsx)', FileSpreadsheet)}
            {formatBtn('csv', 'CSV', FileText)}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a column…"
                className="w-52 rounded-md border border-input bg-input/40 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-smooth"
              />
            </div>
            <button type="button" onClick={() => setKeys(visibleKeys, true)} className="text-xs text-primary hover:underline">
              Select all
            </button>
            <button type="button" onClick={() => setKeys(visibleKeys, false)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Clear
            </button>
          </div>
        </div>

        {/* Column groups */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-5">
          {groups.every((g) => g.shown.length === 0) && (
            <p className="text-xs text-muted-foreground italic">No column matches "{query}".</p>
          )}
          {groups.map((g) => {
            if (!g.shown.length) return null;
            const allOn = g.shown.every((c) => selected.has(c.key));
            return (
              <section key={g.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {g.label} <span className="font-normal">({g.picked}/{g.all.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKeys(g.shown.map((c) => c.key), !allOn)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {allOn ? 'Clear group' : 'Select group'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5">
                  {g.shown.map((c) => {
                    const on = selected.has(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggle(c.key)}
                        title={c.label}
                        aria-pressed={on}
                        className="flex items-center gap-2 min-w-0 text-left text-xs text-foreground/90 hover:text-foreground py-0.5"
                      >
                        <span
                          className={`h-3.5 w-3.5 rounded border grid place-items-center shrink-0 transition-smooth ${
                            on ? 'bg-primary border-primary' : 'border-border bg-input/40'
                          }`}
                        >
                          {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </span>
                        <span className="truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {chosen.length} column{chosen.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary text-sm transition-smooth"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy || chosen.length === 0 || rows.length === 0}
              title={rows.length === 0 ? 'No rows in this view' : chosen.length === 0 ? 'Pick at least one column' : undefined}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-primary/40 bg-primary/20 text-primary font-semibold text-sm hover:bg-primary/30 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
