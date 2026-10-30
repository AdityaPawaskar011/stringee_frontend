import { dashboardApi } from '../api';

// The company's own integration settings (api/routers/settings.py). Secrets are
// write-only: the API reports them as set / not set and never returns a value.
export const {
  useGetIntegrationsQuery,
  useSaveIntegrationMutation,
  useTestIntegrationMutation,
  useGetStringeeSettingsQuery,
  useSaveStringeeSettingsMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    getIntegrations: builder.query({
      query: () => '/settings/integrations',
      transformResponse: (res) => res?.integrations ?? [],
      providesTags: ['Integrations'],
    }),

    // args: { kind, enabled, values, secrets, clear }
    saveIntegration: builder.mutation({
      query: ({ kind, ...body }) => ({
        url: `/settings/integrations/${encodeURIComponent(kind)}`,
        method: 'PUT',
        body,
      }),
      // /me carries the menu's integrations and the sender address: refresh both.
      invalidatesTags: ['Integrations', 'Me'],
    }),

    // Settings → Stringee: the company's caller IDs and SMS sender, with the
    // Stringee project's numbers to pick from (numbers: null when Stringee is down).
    getStringeeSettings: builder.query({
      query: () => '/settings/stringee',
      providesTags: ['StringeeSettings'],
    }),
    // body: { caller_ids: [...], sms_from }
    saveStringeeSettings: builder.mutation({
      query: (body) => ({ url: '/settings/stringee', method: 'PUT', body }),
      // /me carries integrations.stringee_sms, which the sender switches on.
      invalidatesTags: ['StringeeSettings', 'Me'],
    }),

    // args: { kind, to? } — email without `to` only connects and logs in.
    testIntegration: builder.mutation({
      query: ({ kind, ...body }) => ({
        url: `/settings/integrations/${encodeURIComponent(kind)}/test`,
        method: 'POST',
        body,
      }),
    }),
  }),
});
