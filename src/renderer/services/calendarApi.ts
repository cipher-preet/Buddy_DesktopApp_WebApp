import { api } from '@/services/api';
import {
  formatDateLabel,
  mapCalendarFeed,
} from '@/features/calendar/calendarMappers';
import type {
  CalendarApiEnvelope,
  CalendarEventCardDto,
  CalendarEventWritePayload,
  CalendarFeedDto,
} from '@/features/calendar/calendarApiTypes';
import type { CalendarDayItem, CalendarEvent, DaySummary } from '@/features/calendar/calendarTypes';

export type MappedCalendarFeed = {
  events: CalendarEvent[];
  dayItems: CalendarDayItem[];
  summaryByDate: Record<string, DaySummary>;
  spaces: Array<{ id: string; name: string }>;
  counts: DaySummary;
  windows: Record<string, { startHour: number; endHour: number }>;
  from: string;
  to: string;
};

const unwrapCalendarData = <T,>(response: CalendarApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

export const calendarApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarFeed: builder.query<
      MappedCalendarFeed,
      { userId: string; from: string; to: string }
    >({
      query: ({ from, to }) => ({
        url: 'home/getCalendarFeed',
        params: { from, to },
      }),
      transformResponse: (response: CalendarApiEnvelope<CalendarFeedDto>) => {
        const feed = unwrapCalendarData(response, 'Unable to load calendar');
        const mapped = mapCalendarFeed(feed);
        return {
          ...mapped,
          from: feed.from,
          to: feed.to,
        };
      },
      providesTags: (result, _error, arg) =>
        result
          ? [
              {
                type: 'CalendarFeed' as const,
                id: `${arg.userId}:${result.from}:${result.to}`,
              },
              { type: 'CalendarFeed' as const, id: `USER_${arg.userId}` },
              { type: 'CalendarFeed' as const, id: 'LIST' },
            ]
          : [
              { type: 'CalendarFeed' as const, id: `USER_${arg.userId}` },
              { type: 'CalendarFeed' as const, id: 'LIST' },
            ],
    }),
    createCalendarEvent: builder.mutation<
      { message?: string; event: CalendarEventCardDto },
      CalendarEventWritePayload
    >({
      query: (body) => ({
        url: 'home/create-calendar-event',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: CalendarApiEnvelope<{ message?: string; event: CalendarEventCardDto }>,
      ) => unwrapCalendarData(response, 'Unable to create event'),
      invalidatesTags: [{ type: 'CalendarFeed', id: 'LIST' }],
    }),
    updateCalendarEvent: builder.mutation<
      { message?: string; event: CalendarEventCardDto },
      CalendarEventWritePayload & { eventId: string }
    >({
      query: (body) => ({
        url: 'home/update-calendar-event',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: CalendarApiEnvelope<{ message?: string; event: CalendarEventCardDto }>,
      ) => unwrapCalendarData(response, 'Unable to update event'),
      invalidatesTags: [{ type: 'CalendarFeed', id: 'LIST' }],
    }),
    deleteCalendarEvent: builder.mutation<{ message?: string; deletedEventId?: string }, { eventId: string }>(
      {
        query: (body) => ({
          url: 'home/delete-calendar-event',
          method: 'POST',
          body,
        }),
        transformResponse: (
          response: CalendarApiEnvelope<{ message?: string; deletedEventId?: string }>,
        ) => unwrapCalendarData(response, 'Unable to delete event'),
        invalidatesTags: [{ type: 'CalendarFeed', id: 'LIST' }],
      },
    ),
  }),
  overrideExisting: false,
});

export const {
  useGetCalendarFeedQuery,
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
  useDeleteCalendarEventMutation,
} = calendarApi;

export { formatDateLabel };
