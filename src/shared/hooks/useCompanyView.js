import { useSyncExternalStore } from 'react';
import { useDispatch } from 'react-redux';

import { dashboardApi } from '@/services';
import { getCompanyView, setCompanyView } from '@/shared/lib/companyView';

// Pages that act AS one company (settings, sending, numbers). On "All companies" a
// platform admin is asked which company to manage instead (CompanyGate).
export const COMPANY_SCOPED_PATHS = [
  '/settings/integrations', '/settings/dispositions', '/whatsapp-sessions', '/whatsapp-login',
  '/whatsapp-automation', '/wa-api', '/email-templates', '/agent-mail', '/stringee-agents',
  '/leads-upload', '/gsm-status', '/settings/call-quality',
];

// The platform admin's current company view, re-rendered when it changes in this tab.
const listeners = new Set();
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function useCompanyView() {
  return useSyncExternalStore(subscribe, getCompanyView, getCompanyView);
}

/** Switch the whole app to a company ("all" = every company) and refetch everything. */
export function useSwitchCompany() {
  const dispatch = useDispatch();
  return (slug) => {
    if (slug === getCompanyView()) return;
    setCompanyView(slug);
    listeners.forEach((fn) => fn());
    // Everything cached was read for the previous company.
    dispatch(dashboardApi.util.resetApiState());
  };
}
