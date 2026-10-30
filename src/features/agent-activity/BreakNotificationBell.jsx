import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Coffee } from "lucide-react";

import { selectIsAdmin, selectUser } from "@/features/auth/slices/authSlice";
import { formatElapsed, formatSeconds } from "@/features/calls/lib/breaks";
import { useGetAgentActivityQuery } from "@/services";
import { useToast } from "@/shared/hooks/useToast";

const POLL_MS = 15000;

const seenKey = (username) => `agentBreaks.lastSeen.${username || ""}`;

function readSeen(username) {
  try {
    return Number(localStorage.getItem(seenKey(username))) || 0;
  } catch {
    return 0;
  }
}

function writeSeen(username, ts) {
  try {
    localStorage.setItem(seenKey(username), String(ts));
  } catch {
    // Private window / storage blocked: the badge just resets on reload.
  }
}

const agentName = (r) => r.full_name || r.username;

const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * Admins only: agent breaks (GET /admin/agent-activity). Pops a toast when an
 * agent starts or ends a break, and the bell lists who is on a break now plus
 * the breaks of the last 24 hours. The unread badge counts events since the
 * dropdown was last opened (kept per admin in this browser).
 */
export default function BreakNotificationBell() {
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const username = user?.user || user?.username || "";
  const { info } = useToast();

  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => readSeen(username));
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(null);
  const knownRef = useRef(null); // null until the first poll baselines existing events

  const { data, fulfilledTimeStamp } = useGetAgentActivityQuery(24, {
    skip: !user || !isAdmin,
    pollingInterval: POLL_MS,
  });
  const onBreak = useMemo(() => data?.on_break ?? [], [data]);
  const events = useMemo(() => data?.events ?? [], [data]);

  // Server clock minus ours, so "on break for" is right even if this PC's clock is off.
  const skew = data?.now && fulfilledTimeStamp ? Date.parse(data.now) - fulfilledTimeStamp : 0;

  // Toast each new start / end once. The first load only records what is there.
  useEffect(() => {
    if (!data) return;
    const ids = new Set(events.map((e) => e.id));
    if (knownRef.current === null) {
      knownRef.current = ids;
      return;
    }
    const fresh = events.filter((e) => !knownRef.current.has(e.id));
    knownRef.current = ids;
    fresh
      .slice(0, 5)
      .reverse()
      .forEach((e) =>
        info(
          e.kind === "started"
            ? `☕ ${agentName(e)} went on ${e.label}`
            : `✅ ${agentName(e)} is back from ${e.label} (${formatSeconds(e.duration_sec)})`,
        ),
      );
  }, [data, events, info]);

  // Keep the "on break for" times moving while the list is open.
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = events.filter((e) => Date.parse(e.at) > lastSeen).length;

  const toggle = () => {
    // Opening the list marks everything in it as seen.
    if (!open && events.length) {
      const newest = Math.max(...events.map((e) => Date.parse(e.at)));
      writeSeen(username, newest);
      setLastSeen(newest);
    }
    setNow(Date.now());
    setOpen(!open);
  };

  if (!user || !isAdmin) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-700 bg-slate-800/60 text-muted-foreground hover:text-foreground transition-smooth"
        title={onBreak.length ? `${onBreak.length} agent(s) on a break` : "Agent breaks"}
        aria-label="Agent break notifications"
      >
        <Coffee className={`h-4 w-4 ${onBreak.length ? "text-amber-300" : ""}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-slate-950">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto scrollbar-thin rounded-xl border border-border bg-card shadow-2xl z-50 animate-pop-in">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-foreground">On a break now</span>
            <span className="text-[11px] text-muted-foreground">{onBreak.length} agent(s)</span>
          </div>
          {onBreak.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Nobody is on a break.</p>
          ) : (
            onBreak.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{agentName(r)}</p>
                  <p className="text-[11px] text-amber-300">{r.label}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono-nums text-xs text-foreground">
                    {formatElapsed(r.started_at, now + skew)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">since {fmtClock(r.started_at)}</p>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Last 24 hours</span>
            <span className="text-[11px] text-muted-foreground">{events.length} event(s)</span>
          </div>
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground">
              <Coffee className="h-5 w-5" />
              <p className="text-xs">No breaks yet</p>
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="border-b border-border/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-foreground">
                    <span className="font-medium">{agentName(e)}</span>{" "}
                    {e.kind === "started" ? "went on" : "back from"} {e.label}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{fmtClock(e.at)}</span>
                </div>
                {e.kind === "ended" && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Break length {formatSeconds(e.duration_sec)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
