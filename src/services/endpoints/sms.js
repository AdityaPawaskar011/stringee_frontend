import { dashboardApi } from '../api';

export const { useSendStringeeSmsMutation } = dashboardApi.injectEndpoints({
  endpoints: (builder) => ({
    // SMS to a client through Stringee; any role. body: { phone_number, message }.
    sendStringeeSms: builder.mutation({
      query: (body) => ({ url: '/stringee/send-sms', method: 'POST', body }),
    }),
  }),
});
