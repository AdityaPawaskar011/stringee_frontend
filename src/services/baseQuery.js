import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { showSessionPopup } from '@/features/auth/slices/sessionSlice';
import { logError, describe } from '@/shared/lib/errorLogger';
import { askCompany, getCompanyView } from '@/shared/lib/companyView';

let isSessionExpired = false;
export const getSessionExpired = () => isSessionExpired;
export const setSessionExpired = (val) => { isSessionExpired = val; };

const addParamsToUrl = (url, paramsObj) => {
  const qs = new URLSearchParams(paramsObj).toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
};

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BASE_URL,
  prepareHeaders: (headers) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const accessToken = user?.access_token;
    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
    // A platform admin's company selector (shared/lib/companyView). A request that set
    // X-Tenant itself (the "which company?" retry below) keeps its own.
    if (user?.isPlatformAdmin && !headers.has('X-Tenant')) headers.set('X-Tenant', getCompanyView());
    return headers;
  },
});

export const baseQueryWithSession = async (args, api, extraOptions) => {
  // /login and /refresh are how a session is (re)started, so they are never paused,
  // and their 401 means "wrong credentials / dead refresh token", not "session expired"
  // — otherwise one wrong password raised the Session Expired popup and paused the
  // next, correct login attempt too.
  const url = typeof args === 'string' ? args : args?.url;
  const isAuthCall = url === '/login' || url === '/refresh';
  if (getSessionExpired() && !isAuthCall) {
    return { error: { status: 401, data: 'Session paused' } };
  }

  const req = typeof args === 'string' ? { url: args } : { ...args };

  if (extraOptions?.withDate) {
    const { from, to } = api.getState().dateFilter || {};
    const params = {};
    if (from) params.sd = from;
    if (to) params.ed = to;
    if (Object.keys(params).length) req.url = addParamsToUrl(req.url, params);
  }

  if (extraOptions?.withCampaign) {
    const { campaignId } = api.getState().campaignAndUsernameFilter || {};
    if (campaignId) req.url = addParamsToUrl(req.url, { campaign_id: campaignId });
  }

  if (extraOptions?.withUsername) {
    const { username } = api.getState().campaignAndUsernameFilter || {};
    if (username) req.url = addParamsToUrl(req.url, { user_id: username });
  }

  let result = await baseQuery(req, api, extraOptions);

  // "All companies" and the action needs one company: ask which, then retry as it.
  if (result?.error?.status === 409 && result.error.data?.detail?.code === 'company_required') {
    const slug = await askCompany(result.error.data.detail.message);
    if (slug) {
      result = await baseQuery({ ...req, headers: { ...(req.headers || {}), 'X-Tenant': slug } }, api, extraOptions);
    }
  }

  if (result?.error?.status === 401) {
    if (!isAuthCall) {
      setSessionExpired(true);
      api.dispatch(showSessionPopup());
    }
  } else if (result?.error) {
    // 401 is an expired session, handled above, not a bug worth logging.
    const { status, data, error } = result.error;
    const method = (req.method || 'GET').toUpperCase();
    logError({
      type: 'api',
      message: `${method} ${req.url} failed (${status})`,
      endpoint: req.url,
      method,
      status,
      detail: describe(data?.detail ?? data ?? error),
    });
  }

  return result;
};
