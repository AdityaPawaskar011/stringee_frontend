import { dashboardApi } from '../api';

export const { useGetMetaLeadsQuery } = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    getMetaLeads: builder.query({
      // Meta leads of the selected dates, each with what the dialer has done with it.
      query: () => '/lead-management-system/meta-leads',
      transformResponse: (res) => res?.data ?? [],
      providesTags: ['DATE_FILTERED'],
      extraOptions: { maxRetries: 3, withDate: true },
    }),
  }),
});
