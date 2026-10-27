import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Building2, Layers } from 'lucide-react';

import { selectCompanies, selectIsPlatformAdmin } from '@/features/auth/slices/authSlice';
import { COMPANY_SCOPED_PATHS, useCompanyView, useSwitchCompany } from '@/shared/hooks/useCompanyView';
import { ALL_COMPANIES, answerCompany, subscribeCompanyPrompt } from '@/shared/lib/companyView';

// Platform admin only (AdminR): which company the whole app is looking at.
// See shared/lib/companyView.js and api/core/scope.py (X-Tenant).

const selectClass =
  'h-9 rounded-lg border border-border bg-secondary/40 pl-8 pr-7 text-sm text-foreground outline-none ' +
  'focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-smooth cursor-pointer';

/** Top-bar selector: "All companies" or one company. Renders nothing for anyone else. */
export function CompanySelector() {
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);
  const companies = useSelector(selectCompanies);
  const view = useCompanyView();
  const switchTo = useSwitchCompany();
  if (!isPlatformAdmin) return null;
  return (
    <label className="relative hidden sm:flex items-center" title="Company you are viewing">
      <Building2 className="pointer-events-none absolute left-2.5 w-4 h-4 text-muted-foreground" />
      <select className={selectClass} value={view} onChange={(e) => switchTo(e.target.value)}
        aria-label="Company">
        <option value={ALL_COMPANIES}>All companies</option>
        {companies.map((c) => (
          <option key={c.slug} value={c.slug}>{c.name}{c.status !== 'active' ? ' (suspended)' : ''}</option>
        ))}
      </select>
    </label>
  );
}

function CompanyButtons({ onPick }) {
  const companies = useSelector(selectCompanies).filter((c) => c.status === 'active');
  return (
    <div className="flex flex-wrap gap-2">
      {companies.map((c) => (
        <button key={c.slug} type="button" onClick={() => onPick(c.slug)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2
            text-sm font-semibold text-foreground transition-smooth hover:border-primary/40 hover:bg-primary/10
            active:scale-[0.97]">
          <Building2 className="w-4 h-4 text-primary" /> {c.name}
        </button>
      ))}
    </div>
  );
}

/** On a company-only page while viewing "All companies": pick the company first. */
export function CompanyGate({ children }) {
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);
  const view = useCompanyView();
  const switchTo = useSwitchCompany();
  const { pathname } = useLocation();
  if (!isPlatformAdmin || view !== ALL_COMPANIES || !COMPANY_SCOPED_PATHS.includes(pathname)) {
    return children;
  }
  return (
    <div className="mx-auto max-w-[720px] mt-10 rounded-2xl border border-border bg-card/60 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl border border-primary/20 bg-primary/10 grid place-items-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Choose a company</h2>
          <p className="text-xs text-muted-foreground">
            This page works on one company at a time. Pick the company to manage; you can go back to
            "All companies" from the selector at the top.
          </p>
        </div>
      </div>
      <CompanyButtons onPick={switchTo} />
    </div>
  );
}

/** "Which company?" when an action needs one company (API 409 company_required). */
export function CompanyPromptHost() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => subscribeCompanyPrompt(setPrompt), []);
  if (!prompt) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl animate-pop-in">
        <div>
          <h3 className="text-base font-semibold text-foreground">Which company?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {prompt.message || 'Choose the company to do this as.'} You are viewing all companies.
          </p>
        </div>
        <CompanyButtons onPick={answerCompany} />
        <div className="flex justify-end">
          <button type="button" onClick={() => answerCompany(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary/60">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
