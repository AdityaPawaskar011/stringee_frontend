import { dashboardApi } from '../api';

export const {
  useDialNextMutation,
  useCallHangupMutation,
  useGetLogDataQuery,
  useSubmitStatusMutation,
  usePingQuery,
  useUserTimelineQuery,
  useSendMessageMutation,
  useCallStatusQuery,
  useLazyCallStatusQuery,
  useStringeeClientEventMutation,
  useStringeeClientTokenMutation,
  useGetAgentStateQuery,
  useSetAgentStateMutation,
} = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // The signed-in agent's state on the server: available | paused | in_call | wrap_up.
    // /call, /hangup and /submit_status move it too, so they invalidate it.
    getAgentState: builder.query({
      query: () => '/agent/state',
      providesTags: ['AgentState'],
    }),
    setAgentState: builder.mutation({
      query: (body) => ({ url: '/agent/state', method: 'PUT', body }),
      invalidatesTags: ['AgentState'],
    }),
    dialNext: builder.mutation({
      query: (params = {}) => ({
        url: '/call',
        method: 'POST',
        params: Object.keys(params).length ? params : undefined,
      }),
      invalidatesTags: ['AgentState'],
    }),
    // params is { call_id } or { ref_id } (selectCallRouteParams).
    callHangup: builder.mutation({
      query: (params = {}) => ({
        url: '/hangup',
        method: 'POST',
        params: Object.keys(params).length ? params : undefined,
      }),
      invalidatesTags: ['AgentState'],
    }),
    // The call's live state. Poll by call_id, or by ref_id in the window
    // before the carrier has told us the call_id.
    callStatus: builder.query({
      query: (params = {}) => ({ url: '/call_status', params }),
    }),
    // Web SDK login for the agent's own StringeeX user (browser dial mode).
    // A mutation, not a query: a token must never be served from cache.
    stringeeClientToken: builder.mutation({
      query: () => ({ url: '/stringee/client_token', method: 'GET' }),
    }),
    // The browser reporting its own call's signalingstate.
    stringeeClientEvent: builder.mutation({
      query: (body) => ({ url: '/stringee/client_event', method: 'POST', body }),
    }),
    getLogData: builder.query({
      query: (user) => ({ url: '/logdata', method: 'POST', params: { user } }),
    }),
    // A disposition changes the lead queue, the dial/disposition counts and the
    // hot-lead report, so every view of those refetches straight away.
    submitStatus: builder.mutation({
      query: (params = {}) => ({
        url: '/submit_status',
        method: 'POST',
        params: Object.keys(params).length ? params : undefined,
      }),
      invalidatesTags: ['Leads', 'Dashboard', 'ManagerView', 'AgentState', { type: 'HotMetaLeads', id: 'LIST' }],
    }),
    ping: builder.query({
      query: () => '/ping',
    }),
    userTimeline: builder.query({
      query: () => '/usertimeline',
    }),
    sendMessage: builder.mutation({
      query: (phone) => ({
        url: '/send-sms',
        method: 'POST',
        body: { phone_number: phone },
      }),
      invalidatesTags: ['Leads'],
    }),
  }),
});
