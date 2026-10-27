import { dashboardApi } from '../api';

// The company's call dispositions (api/routers/dispositions.py). Agents read the list
// for their campaign; company admins edit it on Settings → Dispositions.
export const {
  useGetDispositionsQuery,
  useGetDispositionSettingsQuery,
  useGetVicidialCodesQuery,
  useGetSuggestedCodeQuery,
  useCreateDispositionMutation,
  useUpdateDispositionMutation,
  useDeleteDispositionMutation,
  useReorderDispositionsMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // What the call popup offers (hidden ones excluded).
    getDispositions: builder.query({
      query: () => '/dispositions',
      transformResponse: (res) => res?.dispositions ?? [],
      providesTags: ['Dispositions'],
    }),

    // Admin: every row, the company's campaigns and the colour choices.
    getDispositionSettings: builder.query({
      query: () => '/settings/dispositions',
      providesTags: ['Dispositions'],
    }),

    // Admin: status codes VICIdial already has for the company's campaigns.
    getVicidialCodes: builder.query({
      query: () => '/settings/dispositions/vicidial-codes',
      transformResponse: (res) => res?.codes ?? [],
      providesTags: ['Dispositions'],
    }),

    // Admin: the new code a blank Code field would get for this label (preview only).
    getSuggestedCode: builder.query({
      query: (label) => ({ url: '/settings/dispositions/suggest-code', params: { label } }),
      transformResponse: (res) => res?.status ?? '',
      providesTags: ['Dispositions'],
    }),

    createDisposition: builder.mutation({
      query: (body) => ({ url: '/settings/dispositions', method: 'POST', body }),
      invalidatesTags: ['Dispositions'],
    }),

    updateDisposition: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/settings/dispositions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Dispositions'],
    }),

    deleteDisposition: builder.mutation({
      query: (id) => ({ url: `/settings/dispositions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Dispositions'],
    }),

    reorderDispositions: builder.mutation({
      query: (ids) => ({ url: '/settings/dispositions/reorder', method: 'POST', body: { ids } }),
      invalidatesTags: ['Dispositions'],
    }),
  }),
});
