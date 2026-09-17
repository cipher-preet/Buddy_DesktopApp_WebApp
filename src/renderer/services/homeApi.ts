import { api } from '@/services/api';
import { mapNote, mapSpace, mapTask } from '@/features/dashboard/homeMappers';
import type {
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

export type UserSpacesQueryArg = {
  userId: string;
  limit?: number;
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
          userId: queryArg.userId,
          limit: queryArg.limit ?? 10,
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
    createSpace: builder.mutation<
      { message?: string },
      { userId: string; spacename: string; description?: string }
    >({
      query: (body) => ({
        url: 'home/create-space',
        method: 'POST',
        body: {
          userId: body.userId,
          spacename: body.spacename,
        },
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to create space'),
      invalidatesTags: [{ type: 'Spaces', id: 'LIST' }],
    }),
    createStagedTask: builder.mutation<
      { message?: string },
      { spaceId: string; title: string; description: string; date?: string }
    >({
      query: (body) => ({
        url: 'home/create-staged-task',
        method: 'POST',
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
        body,
      }),
      transformResponse: (response: HomeApiEnvelope<{ message?: string }>) =>
        unwrapHomeData(response, 'Unable to create note'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'SpaceNotes', id: arg.spaceId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserSpacesInfiniteQuery,
  useGetSpaceTasksInfiniteQuery,
  useGetSpaceNotesInfiniteQuery,
  useCreateSpaceMutation,
  useCreateStagedTaskMutation,
  useCreateStagedNoteMutation,
} = homeApi;
