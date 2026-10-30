import { dashboardApi } from '../api';

export const { useGetAgentActivityQuery } = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admins: agents on a break now, and breaks started/ended in the last `hours`.
    // { on_break: [...], events: [{ id, kind: started|ended, at, ... }], now }
    getAgentActivity: builder.query({
      query: (hours = 24) => ({ url: '/admin/agent-activity', params: { hours } }),
    }),
  }),
});
