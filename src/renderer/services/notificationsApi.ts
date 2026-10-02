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

export type NotificationFeed = {
  items: NotificationItem[];
  unreadCount: number;
};

export type NotificationFilter = 'all' | 'unread';

const unwrap = <T,>(response: Envelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data;
};

const FEED_TAG = { type: 'Notifications' as const, id: 'FEED' };
const FILTERS: NotificationFilter[] = ['all', 'unread'];

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationFeed, NotificationFilter>({
      query: (filter) => ({
        url: 'notifications',
        params: filter === 'unread' ? { filter: 'unread' } : undefined,
      }),
      transformResponse: (response: Envelope<NotificationFeed>) =>
        unwrap(response, 'Unable to load notifications'),
      providesTags: [FEED_TAG],
    }),
    markNotificationsRead: builder.mutation<void, string[]>({
      query: (ids) => ({ url: 'notifications/read', method: 'POST', body: { ids } }),
      async onQueryStarted(ids, { dispatch, queryFulfilled }) {
        const marked = new Set(ids);
        const patches = FILTERS.map((filter) =>
          dispatch(
            notificationsApi.util.updateQueryData('getNotifications', filter, (draft) => {
              let newlyRead = 0;
              for (const item of draft.items) {
                if (!item.read && item.memberIds.some((id) => marked.has(id))) {
                  item.read = true;
                  newlyRead += 1;
                }
              }
              draft.unreadCount = Math.max(0, draft.unreadCount - newlyRead);
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: 'notifications/read-all', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patches = FILTERS.map((filter) =>
          dispatch(
            notificationsApi.util.updateQueryData('getNotifications', filter, (draft) => {
              draft.items.forEach((item) => {
                item.read = true;
              });
              draft.unreadCount = 0;
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
