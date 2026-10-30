import { useEffect, useRef, useState } from "react";
import { ChevronDown, Coffee } from "lucide-react";

import { useAgentState } from "@/features/calls/hooks/useAgentState";
import { formatElapsed } from "@/features/calls/lib/breaks";
import { useGetBreakTypesQuery } from "@/services";

/**
 * The agent's Break / Resume control. Not paused: a "BREAK" menu of the break
 * types (GET /agent/breaks); picking one pauses dialling and logs the break for the
 * admins. Paused: which break and for how long, and RESUME.
 */
export default function BreakMenu() {
  const { isPaused, reason, since, takeBreak, resume, isBusy } = useAgentState();
  const { data: breakTypes = [] } = useGetBreakTypesQuery();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(null);

  // Tick the "on break for" clock while paused.
  useEffect(() => {
    if (!isPaused || !since) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isPaused, since]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = async (key) => {
    setOpen(false);
    await takeBreak(key);
  };

  const label = breakTypes.find((b) => b.key === reason)?.label;
  const buttonBase = [
    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold",
    "border transition-all duration-200 backdrop-blur",
    "shadow-[0_10px_30px_rgba(0,0,0,0.45)] disabled:opacity-60",
  ].join(" ");

  if (isPaused) {
    return (
      <div className="flex items-center gap-2">
        {label && (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200"
            title="You are on a break; dialling is paused"
          >
            <Coffee className="h-3.5 w-3.5" />
            {label}
            {since && <span className="font-mono-nums text-amber-100/80">· {formatElapsed(since, now)}</span>}
          </span>
        )}
        <button
          type="button"
          onClick={resume}
          disabled={isBusy}
          className={`${buttonBase} border-emerald-500/40 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30 hover:text-emerald-100 active:bg-emerald-600/40`}
          title="Resume receiving calls"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          RESUME
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isBusy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${buttonBase} border-amber-500/40 bg-amber-600/20 text-amber-200 hover:bg-amber-600/30 hover:text-amber-100 active:bg-amber-600/40`}
        title="Take a break (pauses receiving calls)"
      >
        <Coffee className="h-4 w-4" />
        BREAK
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl animate-pop-in"
        >
          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Take a break
          </div>
          {breakTypes.map((b) => (
            <button
              key={b.key}
              type="button"
              role="menuitem"
              onClick={() => pick(b.key)}
              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50 transition-smooth"
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
