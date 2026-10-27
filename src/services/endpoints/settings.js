import { dashboardApi } from '../api';

// The company's own integration settings (api/routers/settings.py). Secrets are
// write-only: the API reports them as set / not set and never returns a value.
export const {
  useGetIntegrationsQuery,
  useSaveIntegrationMutation,
  useTestIntegrationMutation,
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
