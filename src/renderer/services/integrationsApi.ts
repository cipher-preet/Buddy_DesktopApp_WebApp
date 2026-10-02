import { api } from '@/services/api';

type Envelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type GoogleCalendarStatus = {
  provider: 'google';
  configured: boolean;
  connected: boolean;
  status: 'active' | 'error' | null;
  accountEmail: string;
  lastError: string;
  lastSyncedAt: string | null;
  lastSyncEventCount: number;
  calendarCount: number;
  connectedAt: string | null;
  syncing: boolean;
  connectError: string | null;
  connectErrorAt: string | null;
};

const unwrap = <T,>(response: Envelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data;
};

const STATUS_TAG = { type: 'Integrations' as const, id: 'GOOGLE_CALENDAR' };
const FEED_TAG = { type: 'CalendarFeed' as const, id: 'LIST' };

export const integrationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGoogleCalendarStatus: builder.query<GoogleCalendarStatus, void>({
      query: () => ({ url: 'integrations/google-calendar/status' }),
      transformResponse: (response: Envelope<GoogleCalendarStatus>) =>
        unwrap(response, 'Unable to load Google Calendar status'),
      providesTags: [STATUS_TAG],
    }),
    startGoogleCalendarConnect: builder.mutation<{ url: string }, void>({
      query: () => ({ url: 'integrations/google-calendar/connect', method: 'POST' }),
      transformResponse: (response: Envelope<{ url: string }>) =>
        unwrap(response, 'Unable to start Google Calendar connection'),
    }),
    syncGoogleCalendar: builder.mutation<GoogleCalendarStatus & { message?: string }, void>({
      query: () => ({ url: 'integrations/google-calendar/sync', method: 'POST' }),
      transformResponse: (response: Envelope<GoogleCalendarStatus & { message?: string }>) =>
        unwrap(response, 'Google Calendar sync failed'),
      invalidatesTags: [STATUS_TAG, FEED_TAG],
    }),
    disconnectGoogleCalendar: builder.mutation<{ message?: string; removedEvents: number }, void>({
      query: () => ({ url: 'integrations/google-calendar/disconnect', method: 'POST' }),
      transformResponse: (response: Envelope<{ message?: string; removedEvents: number }>) =>
        unwrap(response, 'Unable to disconnect Google Calendar'),
      invalidatesTags: [STATUS_TAG, FEED_TAG],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGoogleCalendarStatusQuery,
  useStartGoogleCalendarConnectMutation,
  useSyncGoogleCalendarMutation,
  useDisconnectGoogleCalendarMutation,
} = integrationsApi;
