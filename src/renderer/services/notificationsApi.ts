import { api } from '@/services/api';

type Envelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type NotificationType = 'task' | 'note' | 'meeting';

export type NotificationItem = {
  id: string;
  memberIds: string[];
  count: number;
  type: NotificationType;
  entityId: string;
  title: string;
  message: string;
  preview: string | null;
  spaceId: string | null;
  spaceName: string | null;
  meetingId: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationPage = {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type NotificationFilter = 'all' | 'unread';

type CursorPageParam = string | null;

const PAGE_SIZE = 15;
const FEED_TAG = { type: 'Notifications' as const, id: 'FEED' };
const UNREAD_TAG = { type: 'Notifications' as const, id: 'UNREAD_COUNT' };

const unwrap = <T,>(response: Envelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data;
};

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadNotificationCount: builder.query<{ unreadCount: number }, void>({
      query: () => ({ url: 'notifications/unread-count' }),
      transformResponse: (response: Envelope<{ unreadCount: number }>) =>
        unwrap(response, 'Unable to load notification count'),
      // Align with the 30s badge poll so focus/remount does not double-hit.
      keepUnusedDataFor: 30,
      providesTags: [UNREAD_TAG],
    }),

    getNotifications: builder.infiniteQuery<NotificationPage, NotificationFilter, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) =>
          lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
      },
      query: ({ queryArg: filter, pageParam }) => ({
        url: 'notifications',
        params: {
          limit: PAGE_SIZE,
          ...(filter === 'unread' ? { filter: 'unread' } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      transformResponse: (response: Envelope<Partial<NotificationPage>>) => {
        const page = unwrap(response, 'Unable to load notifications');
        return {
          items: page.items ?? [],
          unreadCount: page.unreadCount ?? 0,
          nextCursor: page.nextCursor ?? null,
          hasMore: Boolean(page.hasMore && page.nextCursor),
        };
      },
      providesTags: [FEED_TAG],
    }),

    markNotificationsRead: builder.mutation<void, string[]>({
      query: (ids) => ({ url: 'notifications/read', method: 'POST', body: { ids } }),
      async onQueryStarted(ids, { dispatch, queryFulfilled, getState }) {
        const marked = new Set(ids);
        const cachedArgs = notificationsApi.util.selectCachedArgsForQuery(getState(), 'getNotifications');
        let groupsMarked = 0;

        const feedPatches = cachedArgs.map((filter) =>
          dispatch(
            notificationsApi.util.updateQueryData('getNotifications', filter, (draft) => {
              let newlyRead = 0;
              for (const page of draft.pages) {
                for (const item of page.items) {
                  if (!item.read && item.memberIds.some((id) => marked.has(id))) {
                    item.read = true;
                    newlyRead += 1;
                  }
                }
              }
              if (draft.pages[0] && newlyRead > 0) {
                draft.pages[0].unreadCount = Math.max(0, draft.pages[0].unreadCount - newlyRead);
              }
              // Prefer the inbox cache count; otherwise keep the first positive match.
              if (newlyRead > 0 && (filter === 'all' || groupsMarked === 0)) {
                groupsMarked = newlyRead;
              }
            }),
          ),
        );

        const unreadPatch = dispatch(
          notificationsApi.util.updateQueryData('getUnreadNotificationCount', undefined, (draft) => {
            draft.unreadCount = Math.max(0, draft.unreadCount - (groupsMarked || 1));
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          feedPatches.forEach((patch) => patch.undo());
          unreadPatch.undo();
        }
      },
      invalidatesTags: [UNREAD_TAG],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/read-all', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        const cachedArgs = notificationsApi.util.selectCachedArgsForQuery(getState(), 'getNotifications');
        const feedPatches = cachedArgs.map((filter) =>
          dispatch(
            notificationsApi.util.updateQueryData('getNotifications', filter, (draft) => {
              for (const page of draft.pages) {
                page.items.forEach((item) => {
                  item.read = true;
                });
                page.unreadCount = 0;
              }
            }),
          ),
        );
        const unreadPatch = dispatch(
          notificationsApi.util.updateQueryData('getUnreadNotificationCount', undefined, (draft) => {
            draft.unreadCount = 0;
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          feedPatches.forEach((patch) => patch.undo());
          unreadPatch.undo();
        }
      },
      invalidatesTags: [UNREAD_TAG, FEED_TAG],
    }),
  }),
  overrideExisting: false,
});

export const NOTIFICATIONS_PAGE_SIZE = PAGE_SIZE;

export const {
  useGetUnreadNotificationCountQuery,
  useGetNotificationsInfiniteQuery,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
