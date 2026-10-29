import { dashboardApi } from '../api';

// Dialer setup for company admins (api/routers/admin.py, admin_leads.py): logins,
// campaigns, lead lists, leads and the do-not-call list. Reads cover the company
// (or every company for a platform admin on "All companies"); writes need one company.
export const {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useSetAdminUserPasswordMutation,
  useGetAdminCampaignsQuery,
  useCreateAdminCampaignMutation,
  useUpdateAdminCampaignMutation,
  useGetAdminListsQuery,
  useCreateAdminListMutation,
  useUpdateAdminListMutation,
  useGetAdminLeadsQuery,
  useUploadAdminLeadsMutation,
  useMoveAdminLeadsMutation,
  useResetAdminLeadsMutation,
  useDeleteAdminLeadsMutation,
  useGetDncQuery,
  useAddDncMutation,
  useDeleteDncMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Logins ──────────────────────────────────────────────────────────────
    getAdminUsers: builder.query({
      query: (params = {}) => ({ url: '/admin/users', params }),
      providesTags: ['AdminUsers'],
    }),
    createAdminUser: builder.mutation({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: ['AdminUsers', 'AdminCampaigns'],
    }),
    updateAdminUser: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}`, method: 'PUT', body }),
      invalidatesTags: ['AdminUsers', 'AdminCampaigns'],
    }),
    setAdminUserPassword: builder.mutation({
      query: ({ id, password }) => ({ url: `/admin/users/${id}/password`, method: 'POST', body: { password } }),
    }),

    // ── Campaigns ───────────────────────────────────────────────────────────
    getAdminCampaigns: builder.query({
      query: () => '/admin/campaigns',
      providesTags: ['AdminCampaigns'],
    }),
    createAdminCampaign: builder.mutation({
      query: (body) => ({ url: '/admin/campaigns', method: 'POST', body }),
      invalidatesTags: ['AdminCampaigns', 'AdminUsers'],
    }),
    updateAdminCampaign: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/campaigns/${id}`, method: 'PUT', body }),
      invalidatesTags: ['AdminCampaigns', 'AdminUsers', 'AdminLists'],
    }),

    // ── Lead lists ──────────────────────────────────────────────────────────
    getAdminLists: builder.query({
      query: (campaignId) => ({
        url: '/admin/lists',
        params: campaignId ? { campaign_id: campaignId } : undefined,
      }),
      providesTags: ['AdminLists'],
    }),
    createAdminList: builder.mutation({
      query: (body) => ({ url: '/admin/lists', method: 'POST', body }),
      invalidatesTags: ['AdminLists'],
    }),
    updateAdminList: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/lists/${id}`, method: 'PUT', body }),
      invalidatesTags: ['AdminLists'],
    }),

    // ── Leads ───────────────────────────────────────────────────────────────
    // params: { list_id, campaign_id, status, q, page, page_size } -> { rows, total, page, page_size }
    getAdminLeads: builder.query({
      query: (params = {}) => ({ url: '/admin/leads', params }),
      providesTags: ['AdminLeads'],
    }),
    // { listId, file } -> { inserted, duplicates, invalid, total_rows, errors: [{row, phone, reason}] }
    uploadAdminLeads: builder.mutation({
      query: ({ listId, file }) => {
        const body = new FormData();
        body.append('list_id', String(listId));
        body.append('file', file);
        return { url: '/admin/leads/upload', method: 'POST', body };
      },
      invalidatesTags: ['AdminLeads', 'AdminLists'],
    }),
    moveAdminLeads: builder.mutation({
      query: ({ ids, listId }) => ({ url: '/admin/leads/move', method: 'POST', body: { ids, list_id: listId } }),
      invalidatesTags: ['AdminLeads', 'AdminLists'],
    }),
    resetAdminLeads: builder.mutation({
      query: (ids) => ({ url: '/admin/leads/reset', method: 'POST', body: { ids } }),
      invalidatesTags: ['AdminLeads', 'AdminLists'],
    }),
    deleteAdminLeads: builder.mutation({
      query: (ids) => ({ url: '/admin/leads', method: 'DELETE', body: { ids } }),
      invalidatesTags: ['AdminLeads', 'AdminLists'],
    }),

    // ── Do-not-call ─────────────────────────────────────────────────────────
    getDnc: builder.query({
      query: (params = {}) => ({ url: '/admin/dnc', params }),
      providesTags: ['AdminDnc'],
    }),
    addDnc: builder.mutation({
      query: (body) => ({ url: '/admin/dnc', method: 'POST', body }),
      invalidatesTags: ['AdminDnc'],
    }),
    deleteDnc: builder.mutation({
      query: (id) => ({ url: `/admin/dnc/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminDnc'],
    }),
  }),
});
