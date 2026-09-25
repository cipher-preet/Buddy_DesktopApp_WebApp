import { api } from '@/services/api';

import {
  dedupeMeetingNotes,
  dedupeMeetingTasks,
  mapMeetingDetailShell,
  mapMeetingListItem,
  mapMeetingPlayback,
  mapMeetingSummary,
  mapMeetingTask,
  mapTranscriptSegments,
} from '@/features/meetings/meetingsMappers';
import type {
  ApiMeetingDetail,
  ApiMeetingNotes,
  ApiMeetingPlayback,
  ApiMeetingsPage,
  ApiMeetingSummary,
  ApiMeetingTasks,
  ApiMeetingTranscript,
  MeetingApiEnvelope,
  MeetingDetailShell,
  MeetingListItem,
  MeetingNoteView,
  MeetingPlaybackView,
  MeetingSummaryView,
  MeetingTaskView,
  MeetingTranscriptLineView,
} from '@/features/meetings/meetingsApiTypes';

export type CursorPageParam = string | null;

export type MeetingsQueryArg = {
  limit?: number;
  spaceId?: string | null;
};

export type MappedMeetingsPage = {
  meetings: MeetingListItem[];
  nextCursor: string | null;
};

export type MappedMeetingTranscript = {
  meetingSessionId: string;
  durationMs: number | null;
  segments: MeetingTranscriptLineView[];
};

export type MappedMeetingTasks = {
  meetingSessionId: string;
  items: MeetingTaskView[];
};

export type MappedMeetingNotes = {
  meetingSessionId: string;
  items: MeetingNoteView[];
};

export type AssignMeetingSpaceResult = {
  meetingSessionId: string;
  spaceId: string | null;
  spaceName: string | null;
  unchanged: boolean;
};

export type ApiAssignMeetingSpace = {
  meetingSessionId: string;
  spaceId: string | null;
  spaceName: string | null;
  unchanged?: boolean;
  updated?: {
    conversation?: boolean;
    notes?: number;
    tasks?: number;
  };
};

const DEFAULT_MEETINGS_LIMIT = 24;

const unwrapMeetingData = <T,>(response: MeetingApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

const normalizeMeetingsPage = (payload: ApiMeetingsPage | null | undefined): ApiMeetingsPage => ({
  items: Array.isArray(payload?.items) ? payload.items : [],
  nextCursor: payload?.nextCursor ?? null,
});

export const meetingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMeetings: builder.infiniteQuery<MappedMeetingsPage, MeetingsQueryArg, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'meeting-recordings',
        params: {
          limit: queryArg.limit ?? DEFAULT_MEETINGS_LIMIT,
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(queryArg.spaceId ? { spaceId: queryArg.spaceId } : {}),
        },
      }),
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingsPage>) => {
        const page = normalizeMeetingsPage(unwrapMeetingData(response, 'Unable to load meetings'));
        return {
          meetings: page.items
            .map(mapMeetingListItem)
            .filter((meeting) => Boolean(meeting.id)),
          nextCursor: page.nextCursor,
        };
      },
      keepUnusedDataFor: 30,
      providesTags: (result, _error, arg) => {
        const listId = arg.spaceId ? `LIST:${arg.spaceId}` : 'LIST';
        return result
          ? [
              ...result.pages.flatMap((page) =>
                page.meetings.map((meeting) => ({ type: 'Meetings' as const, id: meeting.id })),
              ),
              { type: 'Meetings', id: listId },
              { type: 'Meetings', id: 'LIST' },
            ]
          : [
              { type: 'Meetings', id: listId },
              { type: 'Meetings', id: 'LIST' },
            ];
      },
    }),

    getMeeting: builder.query<MeetingDetailShell, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingDetail>) =>
        mapMeetingDetailShell(unwrapMeetingData(response, 'Unable to load meeting')),
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: sessionId }],
    }),

    getMeetingTranscript: builder.query<MappedMeetingTranscript, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}/transcript`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingTranscript>) => {
        const payload = unwrapMeetingData(response, 'Unable to load transcript');
        return {
          meetingSessionId: String(payload.meetingSessionId || ''),
          durationMs: payload.durationMs ?? null,
          segments: mapTranscriptSegments(payload.segments),
        };
      },
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: `${sessionId}:transcript` }],
    }),

    getMeetingSummary: builder.query<MeetingSummaryView, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}/summary`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingSummary>) =>
        mapMeetingSummary(unwrapMeetingData(response, 'Unable to load summary')),
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: `${sessionId}:summary` }],
    }),

    getMeetingTasks: builder.query<MappedMeetingTasks, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}/tasks`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingTasks>) => {
        const payload = unwrapMeetingData(response, 'Unable to load tasks');
        return {
          meetingSessionId: String(payload.meetingSessionId || ''),
          items: dedupeMeetingTasks((payload.items ?? []).map(mapMeetingTask)),
        };
      },
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: `${sessionId}:tasks` }],
    }),

    getMeetingNotes: builder.query<MappedMeetingNotes, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}/notes`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingNotes>) => {
        const payload = unwrapMeetingData(response, 'Unable to load notes');
        return {
          meetingSessionId: String(payload.meetingSessionId || ''),
          items: dedupeMeetingNotes(payload.items ?? []),
        };
      },
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: `${sessionId}:notes` }],
    }),

    getMeetingPlayback: builder.query<MeetingPlaybackView, string>({
      query: (sessionId) => `meeting-recordings/${encodeURIComponent(sessionId)}/playback`,
      transformResponse: (response: MeetingApiEnvelope<ApiMeetingPlayback>) =>
        mapMeetingPlayback(unwrapMeetingData(response, 'Unable to load playback')),
      providesTags: (_result, _error, sessionId) => [{ type: 'Meetings', id: `${sessionId}:playback` }],
    }),

    assignMeetingSpace: builder.mutation<
      AssignMeetingSpaceResult,
      { sessionId: string; spaceId: string | null; previousSpaceId?: string | null }
    >({
      query: ({ sessionId, spaceId }) => ({
        url: `meeting-recordings/${encodeURIComponent(sessionId)}/space`,
        method: 'PATCH',
        body: { spaceId },
      }),
      transformResponse: (response: MeetingApiEnvelope<ApiAssignMeetingSpace>) => {
        const payload = unwrapMeetingData(response, 'Unable to update meeting space');
        return {
          meetingSessionId: String(payload.meetingSessionId || ''),
          spaceId: payload.spaceId ? String(payload.spaceId) : null,
          spaceName: payload.spaceName ? String(payload.spaceName) : null,
          unchanged: Boolean(payload.unchanged),
        };
      },
      async onQueryStarted({ sessionId, spaceId, previousSpaceId }, { dispatch, queryFulfilled, getState }) {
        const cachedArgs = meetingsApi.util.selectCachedArgsForQuery(getState(), 'getMeetings');
        const patches = cachedArgs.map((queryArg) =>
          dispatch(
            meetingsApi.util.updateQueryData('getMeetings', queryArg, (draft) => {
              for (const page of draft.pages) {
                const index = page.meetings.findIndex((meeting) => meeting.id === sessionId);
                if (index < 0) {
                  continue;
                }

                const filterSpaceId = queryArg.spaceId || null;
                if (filterSpaceId && spaceId !== filterSpaceId) {
                  page.meetings.splice(index, 1);
                  continue;
                }

                page.meetings[index].spaceId = spaceId;
              }
            }),
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          for (const patch of patches) {
            patch.undo();
          }
        }
      },
      invalidatesTags: (_result, _error, arg) => {
        const tags: Array<{ type: 'Meetings' | 'SpaceNotes' | 'SpaceTasks'; id: string }> = [
          { type: 'Meetings', id: 'LIST' },
          { type: 'Meetings', id: arg.sessionId },
        ];
        if (arg.spaceId) {
          tags.push({ type: 'Meetings', id: `LIST:${arg.spaceId}` });
          tags.push({ type: 'SpaceNotes', id: arg.spaceId });
          tags.push({ type: 'SpaceTasks', id: arg.spaceId });
        }
        if (arg.previousSpaceId && arg.previousSpaceId !== arg.spaceId) {
          tags.push({ type: 'Meetings', id: `LIST:${arg.previousSpaceId}` });
          tags.push({ type: 'SpaceNotes', id: arg.previousSpaceId });
          tags.push({ type: 'SpaceTasks', id: arg.previousSpaceId });
        }
        return tags;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMeetingsInfiniteQuery,
  useGetMeetingQuery,
  useGetMeetingTranscriptQuery,
  useGetMeetingSummaryQuery,
  useGetMeetingTasksQuery,
  useGetMeetingNotesQuery,
  useGetMeetingPlaybackQuery,
  useAssignMeetingSpaceMutation,
} = meetingsApi;
