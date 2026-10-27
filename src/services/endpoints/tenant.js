import { dashboardApi } from '../api';

// The company a login belongs to and how it looks (api/routers/tenant.py). There is no
// pre-login branding call: the single login page is neutral, and /login itself returns
// the user's company branding.
export const { useGetMeQuery } = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // Signed in: company, branding and campaign scope.
    getMe: builder.query({
      query: () => '/me',
      providesTags: ['Me'],
    }),
  }),
});
