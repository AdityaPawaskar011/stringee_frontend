import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithSession } from './baseQuery';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithSession,
  // Freshness for every page, on top of the per-page pollingInterval:
  //  - coming back to the tab, or the network coming back, refetches what is on screen
  //    (needs setupListeners in app/store.js);
  //  - returning to a page renders its cached data at once and refetches it in the
  //    background when that data is older than 30 s.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  tagTypes: [
    'Dashboard',
    'Leads',
    'DATE_FILTERED',
    'CAMPAIGN_FILTERED',
    'USERNAME_FILTERED',
    'EmailTemplates',
    'EmailAttachments',
    'CampaignLeads',
    'HotMetaLeads',
    'CustomColumns',
    'ManagerView',
    'WhatsappMessages',
    'WaConversationSession',
    'WaTemplates',
    'WaHolidays',
    'WaAutomation',
    'DoubleTick',
    'Gsm',
    'StringeeAgents',
    'Integrations',
    'Dispositions',
    'Platform',
    'CallQuality',
    'Me',
  ],
  endpoints: () => ({}),
});
