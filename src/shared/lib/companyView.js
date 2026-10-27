// The company a PLATFORM ADMIN is looking at (top-bar selector): a company slug, or
// ALL_COMPANIES to see every company at once. Sent as X-Tenant on every request
// (services/baseQuery.js); the API scopes reads to it (api/core/scope.py) and answers
// 409 company_required when an action needs one company — askCompany() then asks
// which, through the dialog mounted in Layout (CompanyPromptHost).

export const ALL_COMPANIES = 'all';
const KEY = 'company_view';

export function getCompanyView() {
  try {
    return localStorage.getItem(KEY) || ALL_COMPANIES;
  } catch {
    return ALL_COMPANIES;
  }
}

export function setCompanyView(slug) {
  try {
    localStorage.setItem(KEY, slug || ALL_COMPANIES);
  } catch {
    /* private mode — the choice lasts for this page only */
  }
}

// ── "Which company?" dialog plumbing ────────────────────────────────
let pending = null;            // { resolve, message }
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(pending ? { message: pending.message } : null));

/** Ask which company to act as. Resolves to a slug, or null when cancelled. */
export function askCompany(message) {
  if (pending) return pending.promise;           // one dialog at a time
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  pending = { resolve, message, promise };
  notify();
  return promise;
}

export function answerCompany(slug) {
  const p = pending;
  pending = null;
  notify();
  p?.resolve(slug || null);
}

export function subscribeCompanyPrompt(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
