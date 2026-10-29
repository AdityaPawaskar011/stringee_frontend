import { dashboardApi } from '../api';

// Settings → Call Quality (api/routers/call_quality_settings.py): what the AI scores
// this company's calls on. The call-quality service builds its prompt from these.
export const {
  useGetCallQualitySettingsQuery,
  useSaveCallQualitySettingsMutation,
  useAddCriterionMutation,
  useUpdateCriterionMutation,
  useDeleteCriterionMutation,
  useReorderCriteriaMutation,
  useGetCallQualityPreviewQuery,
  useRescoreCallsMutation,
  useGenerateCallQualityDraftMutation,
  usePreviewCallQualityDraftMutation,
  useGetCallQualitySampleCallsQuery,
  useTestCallQualityDraftMutation,
  useApplyCallQualityDraftMutation,
  useRestoreCallQualityMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // { settings, criteria, overall_modes, scale_max }
    getCallQualitySettings: builder.query({
      query: () => '/settings/call-quality',
      providesTags: ['CallQuality'],
    }),
    // { overall_mode?, outcomes?, company_context?, agent_role?, prompt_override? }
    saveCallQualitySettings: builder.mutation({
      query: (body) => ({ url: '/settings/call-quality', method: 'PUT', body }),
      invalidatesTags: ['CallQuality'],
    }),
    // { label, description?, weight? }
    addCriterion: builder.mutation({
      query: (body) => ({ url: '/settings/call-quality/criteria', method: 'POST', body }),
      invalidatesTags: ['CallQuality'],
    }),
    // { id, label?, description?, weight?, is_active? }
    updateCriterion: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/settings/call-quality/criteria/${id}`, method: 'PUT', body }),
      invalidatesTags: ['CallQuality'],
    }),
    deleteCriterion: builder.mutation({
      query: (id) => ({ url: `/settings/call-quality/criteria/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CallQuality'],
    }),
    reorderCriteria: builder.mutation({
      query: (ids) => ({ url: '/settings/call-quality/criteria/reorder', method: 'POST', body: { ids } }),
      invalidatesTags: ['CallQuality'],
    }),
    // { system_prompt, label_prompt, uses_custom_prompt }
    getCallQualityPreview: builder.query({
      query: () => '/settings/call-quality/preview',
      providesTags: ['CallQuality'],
    }),
    // { sd, ed, confirm } -> { count, cap, queued }
    rescoreCalls: builder.mutation({
      query: (body) => ({ url: '/settings/call-quality/rescore', method: 'POST', body }),
    }),

    // ── Build with AI: nothing changes until applyCallQualityDraft ──
    // { file, instruction } -> { draft, explanation, system_prompt }
    generateCallQualityDraft: builder.mutation({
      query: ({ file, instruction }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('instruction', instruction);
        return { url: '/settings/call-quality/ai-draft', method: 'POST', body };
      },
    }),
    // draft -> { system_prompt }
    previewCallQualityDraft: builder.mutation({
      query: (draft) => ({ url: '/settings/call-quality/ai-draft/preview', method: 'POST', body: { draft } }),
    }),
    // { calls: [...], uploads: [...] }
    getCallQualitySampleCalls: builder.query({
      query: () => '/settings/call-quality/sample-calls',
    }),
    // { draft, source: 'call' | 'manual', id } -> { draft_result, current_result }
    testCallQualityDraft: builder.mutation({
      query: (body) => ({ url: '/settings/call-quality/ai-draft/test', method: 'POST', body }),
    }),
    applyCallQualityDraft: builder.mutation({
      query: (draft) => ({ url: '/settings/call-quality/ai-draft/apply', method: 'POST', body: { draft } }),
      invalidatesTags: ['CallQuality'],
    }),
    restoreCallQuality: builder.mutation({
      query: () => ({ url: '/settings/call-quality/restore', method: 'POST' }),
      invalidatesTags: ['CallQuality'],
    }),
  }),
});
