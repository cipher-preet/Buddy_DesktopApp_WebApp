import { api } from '@/services/api';
import { mapNote, mapSpace, mapTask } from '@/features/dashboard/homeMappers';
import type {
  ApiNoteDetail,
  HomeApiEnvelope,
  NestedSpacesServiceResponse,
  NotesPage,
  SpacesPage,
  TasksPage,
  WorkspaceNote,
  WorkspaceSpace,
  WorkspaceTask,
} from '@/features/dashboard/homeTypes';

export type CursorPageParam = string | null;

export type SpaceCountsMode = 'all' | 'notes' | 'tasks' | 'none';

export type UserSpacesQueryArg = {
  userId: string;
  limit?: number;
  /** Omit or `all` when badges need task/note counts; use `none` for pickers. */
  counts?: SpaceCountsMode;
};

export type SpaceItemsQueryArg = {
  userId: string;
  spaceId: string;
  limit?: number;
};

export type MappedSpacesPage = {
  spaces: WorkspaceSpace[];
  nextCursor: string | null;
};

export type MappedTasksPage = {
  tasks: WorkspaceTask[];
  nextCursor: string | null;
};

export type MappedNotesPage = {
  notes: WorkspaceNote[];
  nextCursor: string | null;
};

export type ProfileSummary = {
  notesCount: number;
  tasksCount: number;
  spacesCount: number;
};

/** Asks Node for the fields the home screen renders, leaving the mobile payload unchanged. */
const CARD_VIEW = { view: 'card' } as const;

const unwrapHomeData = <T,>(response: HomeApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

const normalizeSpacesPage = (payload: NestedSpacesServiceResponse | SpacesPage): SpacesPage => {
  if ('spaces' in payload && Array.isArray(payload.spaces)) {
    return {
      spaces: payload.spaces,
      nextCursor: payload.nextCursor ?? null,
    };
  }

  const nested = (payload as NestedSpacesServiceResponse).data;
  return {
    spaces: nested?.spaces ?? [],
    nextCursor: nested?.nextCursor ?? null,
  };
};

export const homeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserSpaces: builder.infiniteQuery<MappedSpacesPage, UserSpacesQueryArg, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'home/getuserspaces',
        params: {
          ...CARD_VIEW,
          userId: queryArg.userId,
          limit: queryArg.limit ?? 10,
          counts: queryArg.counts ?? 'all',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      transformResponse: (response: HomeApiEnvelope<NestedSpacesServiceResponse | SpacesPage>) => {
        const payload = unwrapHomeData(response, 'Unable to load spaces');
        const page = normalizeSpacesPage(payload);
        return {
          spaces: page.spaces.map(mapSpace),
          nextCursor: page.nextCursor,
        };
      },
      keepUnusedDataFor: 120,
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((page) =>
                page.spaces.map((space) => ({ type: 'Spaces' as const, id: space.id })),
              ),
              { type: 'Spaces', id: 'LIST' },
            ]
          : [{ type: 'Spaces', id: 'LIST' }],
    }),
    getSpaceTasks: builder.infiniteQuery<MappedTasksPage, SpaceItemsQueryArg, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'home/getStagedTasksBySpace',
        params: {
          ...CARD_VIEW,
          userId: queryArg.userId,
          spaceId: queryArg.spaceId,
          limit: queryArg.limit ?? 10,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      transformResponse: (response: HomeApiEnvelope<TasksPage>) => {
        const page = unwrapHomeData(response, 'Unable to load tasks');
        return {
          tasks: (page.tasks ?? []).map(mapTask),
          nextCursor: page.nextCursor ?? null,
        };
      },
      providesTags: (_result, _error, arg) => [{ type: 'SpaceTasks', id: arg.spaceId }],
    }),
    getSpaceNotes: builder.infiniteQuery<MappedNotesPage, SpaceItemsQueryArg, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'home/getStagedNotesBySpace',
        params: {
          ...CARD_VIEW,
          userId: queryArg.userId,
          spaceId: queryArg.spaceId,
          limit: queryArg.limit ?? 10,
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      transformResponse: (response: HomeApiEnvelope<NotesPage>) => {
        const page = unwrapHomeData(response, 'Unable to load notes');
        return {
          notes: (page.notes ?? []).map(mapNote),
          nextCursor: page.nextCursor ?? null,
        };
      },
      providesTags: (_result, _error, arg) => [{ type: 'SpaceNotes', id: arg.spaceId }],
    }),
    getNoteById: builder.query<ApiNoteDetail, { noteId: string; spaceId: string }>({
      query: ({ noteId }) => ({
        url: 'home/getStagedNoteById',
        params: { ...CARD_VIEW, noteId },
      }),
      transformResponse: (response: HomeApiEnvelope<ApiNoteDetail>) =>
        unwrapHomeData(response, 'Unable to load note'),
      providesTags: (_result, _error, arg) => [{ type: 'SpaceNotes', id: arg.spaceId }],
    }),
    createSpace: builder.mutation<
      { message?: string },
      { userId: string; spacename: string; description?: string }
    >({
      query: (body) => ({
        url: 'home/create-space',
        method: 'POST',
        params: CARD_VIEW,
        body: {
          userId: body.userId,
          spacename: body.spacename,
        },
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to create space'),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }, 'Profile'],
    }),
    startListening: builder.mutation<
      {
        message?: string;
        isListning?: boolean;
        listeningStartedAt?: string | null;
      },
      { spaceId: string; isListning: boolean }
    >({
      query: (body) => ({
        url: 'home/startListning',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (
        response: HomeApiEnvelope<{
          message?: string;
          isListning?: boolean;
          listeningStartedAt?: string | null;
          status?: number;
        }>,
      ) => unwrapHomeData(response, 'Unable to update listening state'),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }, 'Plans'],
    }),
    createStagedTask: builder.mutation<
      { message?: string },
      {
        spaceId: string;
        title: string;
        description: string;
        date?: string;
        priority?: 'High' | 'Medium' | 'Low';
      }
    >({
      query: (body) => ({
        url: 'home/create-staged-task',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to create task'),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceTasks', id: arg.spaceId },
        { type: 'Spaces', id: 'LIST' },
      ],
    }),
    createStagedNote: builder.mutation<
      { message?: string },
      { spaceId: string; title: string; description: string; date?: string }
    >({
      query: (body) => ({
        url: 'home/create-staged-note',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to create note'),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceNotes', id: arg.spaceId },
        { type: 'Spaces', id: 'LIST' },
      ],
    }),
    updateSpace: builder.mutation<
      { message?: string },
      { spaceId: string; spacename?: string; description?: string }
    >({
      query: (body) => ({
        url: 'home/update-space',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to update space'),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: arg.spaceId },
        { type: 'Spaces', id: 'LIST' },
        'Profile',
      ],
    }),
    updateStagedTask: builder.mutation<
      { message?: string },
      {
        taskId: string;
        spaceId: string;
        title?: string;
        description?: string;
        date?: string;
        priority?: 'High' | 'Medium' | 'Low';
      }
    >({
      query: ({ spaceId: _spaceId, ...body }) => ({
        url: 'home/update-staged-task',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to update task'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'SpaceTasks', id: arg.spaceId }],
    }),
    updateStagedNote: builder.mutation<
      { message?: string },
      {
        noteId: string;
        spaceId: string;
        title?: string;
        description?: string;
        date?: string;
      }
    >({
      query: ({ spaceId: _spaceId, ...body }) => ({
        url: 'home/update-staged-note',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to update note'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'SpaceNotes', id: arg.spaceId }],
    }),
    deleteSpace: builder.mutation<{ message?: string }, { spaceId: string }>({
      query: (body) => ({
        url: 'home/delete-space',
        method: 'POST',
        params: CARD_VIEW,
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string } | { message?: string; status?: number }>) => {
        const data = unwrapHomeData(response, 'Unable to delete space');
        if (data && typeof data === 'object' && 'message' in data) {
          return { message: (data as { message?: string }).message };
        }
        return { message: 'Space deleted successfully.' };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: 'LIST' },
        { type: 'Spaces', id: arg.spaceId },
        { type: 'SpaceTasks', id: arg.spaceId },
        { type: 'SpaceNotes', id: arg.spaceId },
        'Profile',
      ],
    }),
    deleteStagedTask: builder.mutation<
      { message?: string },
      { taskId: string; spaceId: string }
    >({
      query: ({ spaceId: _spaceId, taskId }) => ({
        url: 'home/delete-staged-task',
        method: 'POST',
        params: CARD_VIEW,
        body: { taskId },
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string } | { message?: string; status?: number }>) => {
        const data = unwrapHomeData(response, 'Unable to delete task');
        if (data && typeof data === 'object' && 'message' in data) {
          return { message: (data as { message?: string }).message };
        }
        return { message: 'Task deleted successfully.' };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceTasks', id: arg.spaceId },
        { type: 'Spaces', id: 'LIST' },
      ],
    }),
    deleteStagedNote: builder.mutation<
      { message?: string },
      { noteId: string; spaceId: string }
    >({
      query: ({ spaceId: _spaceId, noteId }) => ({
        url: 'home/delete-staged-note',
        method: 'POST',
        params: CARD_VIEW,
        body: { noteId },
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string } | { message?: string; status?: number }>) => {
        const data = unwrapHomeData(response, 'Unable to delete note');
        if (data && typeof data === 'object' && 'message' in data) {
          return { message: (data as { message?: string }).message };
        }
        return { message: 'Note deleted successfully.' };
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceNotes', id: arg.spaceId },
        { type: 'Spaces', id: 'LIST' },
      ],
    }),
    setStagedTaskStatus: builder.mutation<
      { message?: string },
      { taskId: string; spaceId: string; done: boolean }
    >({
      query: ({ spaceId: _spaceId, taskId, done }) => ({
        url: 'home/set-staged-task-status',
        method: 'POST',
        params: CARD_VIEW,
        body: { taskId, done },
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to update task status'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'SpaceTasks', id: arg.spaceId }],
    }),
    getGenerationDates: builder.query<
      { dates: string[]; from: string; to: string },
      { userId: string; spaceId: string; from: string; to: string }
    >({
      query: ({ userId, spaceId, from, to }) => ({
        url: 'home/getGenerationDatesBySpace',
        params: { userId, spaceId, from, to },
      }),
      transformResponse: (
        response: HomeApiEnvelope<{ dates?: string[]; from?: string; to?: string }>,
      ) => {
        const payload = unwrapHomeData(response, 'Unable to load dates for this space');
        return {
          dates: Array.isArray(payload.dates) ? payload.dates : [],
          from: payload.from || '',
          to: payload.to || '',
        };
      },
    }),
    getProfileSummary: builder.query<
      ProfileSummary,
      { userId: string }
    >({
      query: ({ userId }) => ({
        url: 'home/getProfileSummary',
        params: { userId },
      }),
      transformResponse: (response: HomeApiEnvelope<ProfileSummary>) =>
        unwrapHomeData(response, 'Unable to load profile summary'),
      providesTags: ['Profile'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserSpacesInfiniteQuery,
  useGetSpaceTasksInfiniteQuery,
  useGetSpaceNotesInfiniteQuery,
  useGetNoteByIdQuery,
  useCreateSpaceMutation,
  useStartListeningMutation,
  useCreateStagedTaskMutation,
  useCreateStagedNoteMutation,
  useUpdateSpaceMutation,
  useUpdateStagedTaskMutation,
  useUpdateStagedNoteMutation,
  useDeleteSpaceMutation,
  useDeleteStagedTaskMutation,
  useDeleteStagedNoteMutation,
  useSetStagedTaskStatusMutation,
  useGetGenerationDatesQuery,
  useGetProfileSummaryQuery,
} = homeApi;
