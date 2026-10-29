import { useEffect, useState } from 'react';
import { X, Loader2, RotateCw, AudioLines } from 'lucide-react';

import { useGetManualAnalysisQuery } from '@/services';
import RecordingPlayer from '@/features/reporting/components/RecordingPlayer';
import StatusBadge from './StatusBadge';
import { formatWhen, isBusy } from './status';

const labelCls = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground truncate" title={value || ''}>{value || '—'}</div>
    </div>
  );
}

// One upload: the audio, every score with the AI's reason, strengths, improvements
// and the labelled transcript.
export default function ManualAnalysisDetailModal({ id, onClose, onAnalyse }) {
  // Keep following a row while the AI is still on it.
  const [polling, setPolling] = useState(true);
  const { data: row, isLoading, isError } = useGetManualAnalysisQuery(id, {
    pollingInterval: polling ? 4000 : 0,
    skipPollingIfUnfocused: true,
  });
  const rowBusy = !row || isBusy(row.status);
  if (rowBusy !== polling) setPolling(rowBusy);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const busy = row && isBusy(row.status);
  const audioSrc = row?.audio_url ? `${import.meta.env.VITE_BASE_URL}${row.audio_url}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-[0_30px_120px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg border border-primary/30 bg-primary/10 grid place-items-center shrink-0">
              <AudioLines className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate" title={row?.original_name}>
                {row?.original_name || 'Recording'}
              </h3>
              {row && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Uploaded by {row.uploaded_by} · {formatWhen(row.uploaded_at)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth active:scale-90"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : isError || !row ? (
            <p className="text-sm text-destructive">Could not load this recording.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={row.status} />
                {row.overall_rating != null && (
                  <span className="text-sm font-semibold text-foreground font-mono-nums">
                    {Number(row.overall_rating).toFixed(1)}/5
                  </span>
                )}
                {row.call_outcome && <span className="text-xs text-muted-foreground">{row.call_outcome}</span>}
                {!busy && (
                  <button
                    type="button"
                    onClick={() => onAnalyse(row.id)}
                    className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-smooth"
                  >
                    <RotateCw className="w-3 h-3" /> Analyse again
                  </button>
                )}
              </div>

              {busy && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> The AI is working on this recording…
                </p>
              )}
              {row.status === 'failed' && row.error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{row.error}</p>
              )}

              {audioSrc && <RecordingPlayer src={audioSrc} title={row.original_name} />}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Agent" value={row.agent_name} />
                <Field label="Client" value={row.client_name} />
                <Field label="Agent sentiment" value={row.agent_sentiment} />
                <Field label="Client sentiment" value={row.client_sentiment} />
              </div>
              {row.notes && <Field label="Notes" value={row.notes} />}

              {row.summary && (
                <section className="space-y-1.5">
                  <div className={labelCls}>Summary</div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{row.summary}</p>
                </section>
              )}

              {row.rating_parts?.length > 0 && (
                <section className="space-y-2">
                  <div className={labelCls}>Scores</div>
                  <ul className="space-y-2">
                    {row.rating_parts.map((p) => (
                      <li key={p.label} className="rounded-md border border-border bg-secondary/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{p.label}</span>
                          <span className="text-xs font-mono-nums font-semibold text-primary">
                            {p.score != null ? `${p.score}/5` : 'n/a'}
                          </span>
                        </div>
                        {p.comment && <p className="mt-1 text-xs text-muted-foreground">{p.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(row.strengths?.length > 0 || row.improvements?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {[['Strengths', row.strengths], ['Improvements', row.improvements]].map(([title, list]) =>
                    list?.length ? (
                      <section key={title} className="space-y-1.5">
                        <div className={labelCls}>{title}</div>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-foreground/90">
                          {list.map((s) => <li key={s}>{s}</li>)}
                        </ul>
                      </section>
                    ) : null,
                  )}
                </div>
              )}

              {row.transcript && (
                <section className="space-y-1.5">
                  <div className={labelCls}>Transcript</div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/90 rounded-md border border-border bg-secondary/20 p-3 max-h-80 overflow-y-auto scrollbar-thin">
                    {row.transcript}
                  </pre>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
