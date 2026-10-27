// Reports page errors to the backend (POST /client-log -> api/routers/client_logs.py),
// which appends them to logs/frontend_errors.log on the API server.
//
// Callers: ErrorBoundary (render crashes), installGlobalErrorHandlers (uncaught
// errors / promise rejections) and baseQueryWithSession (failed API calls).
// Reporting must never throw or loop, so it uses plain fetch rather than RTK
// Query and swallows its own failures.

const ENDPOINT = `${import.meta.env.VITE_BASE_URL}/client-log`;
const DEDUPE_MS = 30_000;        // same error again within this window is dropped
const MAX_PER_PAGE_LOAD = 50;    // a render loop can't flood the log
const MAX_FIELD_CHARS = 4000;    // keepalive bodies are capped at 64 KB

const lastSent = new Map();
let sentCount = 0;

const clip = (v) => {
  if (v == null || typeof v === 'number') return v;
  const s = String(v);
  return s.length > MAX_FIELD_CHARS ? `${s.slice(0, MAX_FIELD_CHARS)}...[truncated]` : s;
};

const accessToken = () => {
  try {
    return JSON.parse(localStorage.getItem('user'))?.access_token;
  } catch {
    return undefined;
  }
};

// Promise rejections carry anything: Errors, RTK `{status, data}` objects, strings.
export const describe = (reason) => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

export function logError(entry) {
  try {
    const message = entry.message || 'Unknown error';
    const key = `${entry.type}|${entry.method || ''}|${entry.endpoint || ''}|${entry.status ?? ''}|${message}`;
    const now = Date.now();
    if (now - (lastSent.get(key) || 0) < DEDUPE_MS) return;
    lastSent.set(key, now);
    if (++sentCount > MAX_PER_PAGE_LOAD) return;

    const body = {
      page: window.location.pathname + window.location.search,
      user_agent: navigator.userAgent,
      occurred_at: new Date().toISOString(),
      ...entry,
      message,
    };
    for (const k of Object.keys(body)) body[k] = clip(body[k]);

    const token = accessToken();
    fetch(ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // never let reporting break the page
  }
}

export function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    logError({
      type: 'runtime',
      message: e.message || describe(e.error) || 'Script error',
      stack: e.error?.stack,
      detail: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    logError({
      type: 'promise',
      message: describe(e.reason),
      stack: e.reason?.stack,
    });
  });
}
