import { dashboardApi } from '../api';

// Reports → Manual Analysis (api/routers/manual_analysis.py): recordings an admin
// uploads and has scored by the same AI as dialer calls.
export const {
  useGetManualAnalysesQuery,
  useGetManualAnalysisQuery,
  useUploadManualRecordingsMutation,
  useAnalyseManualRecordingsMutation,
  useDeleteManualRecordingMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // { data: [...rows], max_mb, extensions }
    getManualAnalyses: builder.query({
      query: () => '/manual-analysis',
      providesTags: ['ManualAnalysis'],
    }),
    // one row + transcript, rating_parts, strengths, improvements
    getManualAnalysis: builder.query({
      query: (id) => `/manual-analysis/${id}`,
      providesTags: (r, e, id) => [{ type: 'ManualAnalysis', id }],
    }),
    // { files: File[], agentName, clientName, notes } -> { created: [...], rejected: [{name, reason}] }
    uploadManualRecordings: builder.mutation({
      query: ({ files, agentName = '', clientName = '', notes = '' }) => {
        const body = new FormData();
        files.forEach((f) => body.append('files', f));
        body.append('agent_name', agentName);
        body.append('client_name', clientName);
        body.append('notes', notes);
        return { url: '/manual-analysis/upload', method: 'POST', body };
      },
      invalidatesTags: ['ManualAnalysis'],
    }),
    // ids -> { queued }
    analyseManualRecordings: builder.mutation({
      query: (ids) => ({ url: '/manual-analysis/analyse', method: 'POST', body: { ids } }),
      invalidatesTags: ['ManualAnalysis'],
    }),
    deleteManualRecording: builder.mutation({
      query: (id) => ({ url: `/manual-analysis/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ManualAnalysis'],
    }),
  }),
});
