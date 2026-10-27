import { dashboardApi } from '../api';

// Platform admin (api/routers/platform.py): companies and which company each VICIdial
// login belongs to.
export const {
  useGetPlatformCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useGetPlatformAgentsQuery,
  useSetAgentCompanyMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlatformCompanies: builder.query({
      query: () => '/platform/companies',
      transformResponse: (res) => res?.companies ?? [],
      providesTags: ['Platform'],
    }),

    // { name, slug?, primary_color?, accent_color? }
    createCompany: builder.mutation({
      query: (body) => ({ url: '/platform/companies', method: 'POST', body }),
      invalidatesTags: ['Platform', 'Me'],
    }),

    // { slug, name?, status? }
    updateCompany: builder.mutation({
      query: ({ slug, ...body }) => ({ url: `/platform/companies/${encodeURIComponent(slug)}`, method: 'PUT', body }),
      invalidatesTags: ['Platform', 'Me'],
    }),

    getPlatformAgents: builder.query({
      query: () => '/platform/agents',
      transformResponse: (res) => res?.agents ?? [],
      providesTags: ['Platform'],
    }),

    // { user, company }
    setAgentCompany: builder.mutation({
      query: ({ user, company }) => ({
        url: `/platform/agents/${encodeURIComponent(user)}`, method: 'PUT', body: { company },
      }),
      invalidatesTags: ['Platform'],
    }),
  }),
});
