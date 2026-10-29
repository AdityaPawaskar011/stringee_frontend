import { useCallback, useMemo } from "react";
import { useGetDispositionsQuery } from "@/services";

// Badge classes for the company's disposition colours (Settings → Dispositions).
export const TONE = {
  green:  "bg-emerald-500/15 border-emerald-400/30 text-emerald-100",
  blue:   "bg-sky-500/12 border-sky-300/25 text-sky-100",
  amber:  "bg-amber-500/15 border-amber-400/30 text-amber-100",
  rose:   "bg-rose-500/15 border-rose-400/30 text-rose-100",
  violet: "bg-violet-500/15 border-violet-400/30 text-violet-100",
  cyan:   "bg-cyan-500/15 border-cyan-400/30 text-cyan-100",
  slate:  "bg-sky-500/12 border-sky-300/25 text-sky-100",
};

const NEUTRAL = "bg-white/5 text-slate-300 border-white/10";

/** status code -> badge classes, from the colour the company gave that disposition. */
export function useStatusTone() {
  const { data: dispositions } = useGetDispositionsQuery();
  const colorOf = useMemo(
    () => Object.fromEntries((dispositions ?? []).map((d) => [String(d.status).toUpperCase(), d.color])),
    [dispositions],
  );
  return useCallback(
    (status) => TONE[colorOf[String(status || "").toUpperCase()]] || NEUTRAL,
    [colorOf],
  );
}
