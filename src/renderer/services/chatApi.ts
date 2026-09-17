import { api } from '@/services/api';
import { mapChatMessage, mapChatSession } from '@/features/ai-chat/chatUtils';
import type {
  AskChatDto,
  ChatApiEnvelope,
  ChatSession,
  ChatSessionDetailDto,
  ChatSessionDto,
  ChatSessionsPageDto,
  ChatThreadMessage,
} from '@/features/ai-chat/chatTypes';

export type CursorPageParam = string | null;

export type ChatSessionsQueryArg = {
  userId: string;
  spaceId?: string | null;
  limit?: number;
};

export type MappedChatSessionsPage = {
  chats: ChatSession[];
  nextCursor: string | null;
};

export type MappedChatSessionDetail = {
  chat: ChatSession;
  messages: ChatThreadMessage[];
};

const unwrapChatData = <T,>(response: ChatApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || response?.detail || fallbackMessage);
  }

  return response.data;
};

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getChatSessions: builder.infiniteQuery<MappedChatSessionsPage, ChatSessionsQueryArg, CursorPageParam>({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'chat/sessions',
        params: {
          userId: queryArg.userId,
          limit: queryArg.limit ?? 20,
          ...(queryArg.spaceId ? { spaceId: queryArg.spaceId } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      }),
      transformResponse: (response: ChatApiEnvelope<ChatSessionsPageDto>) => {
        const page = unwrapChatData(response, 'Unable to load chat history');
        return {
          chats: (page.chats ?? []).map(mapChatSession),
          nextCursor: page.nextCursor ?? null,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.pages.flatMap((page) =>
                page.chats.map((chat) => ({ type: 'ChatSessions' as const, id: chat.id })),
              ),
              { type: 'ChatSessions', id: 'LIST' },
            ]
          : [{ type: 'ChatSessions', id: 'LIST' }],
    }),
    getChatSessionById: builder.query<MappedChatSessionDetail, { userId: string; sessionId: string }>({
      query: ({ userId, sessionId }) => ({
        url: `chat/sessions/${sessionId}`,
        params: { userId },
      }),
      transformResponse: (response: ChatApiEnvelope<ChatSessionDetailDto>) => {
        const payload = unwrapChatData(response, 'Unable to load chat');
        return {
          chat: mapChatSession(payload.chat),
          messages: (payload.messages ?? []).map(mapChatMessage),
        };
      },
      providesTags: (_result, _error, arg) => [{ type: 'ChatMessages', id: arg.sessionId }],
    }),
    createChatSession: builder.mutation<ChatSession, { userId: string; spaceId?: string | null }>({
      query: ({ userId, spaceId }) => ({
        url: 'chat/sessions',
        method: 'POST',
        body: {
          userId,
          ...(spaceId ? { spaceId } : {}),
        },
      }),
      transformResponse: (response: ChatApiEnvelope<ChatSessionDto>) =>
        mapChatSession(unwrapChatData(response, 'Unable to start a new chat')),
      invalidatesTags: [{ type: 'ChatSessions', id: 'LIST' }],
    }),
    askBuddy: builder.mutation<
      AskChatDto,
      { userId: string; question: string; chatId?: string | null; spaceId?: string | null }
    >({
      query: ({ userId, question, chatId, spaceId }) => ({
        url: 'chat/ask',
        method: 'POST',
        body: {
          userId,
          question,
          ...(chatId ? { chatId } : {}),
          ...(spaceId ? { spaceId } : {}),
        },
      }),
      transformResponse: (response: ChatApiEnvelope<AskChatDto>) =>
        unwrapChatData(response, 'Buddy could not answer that question'),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'ChatSessions', id: 'LIST' },
        ...(arg.chatId ? [{ type: 'ChatMessages' as const, id: arg.chatId }] : []),
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetChatSessionsInfiniteQuery,
  useLazyGetChatSessionByIdQuery,
  useCreateChatSessionMutation,
  useAskBuddyMutation,
} = chatApi;
