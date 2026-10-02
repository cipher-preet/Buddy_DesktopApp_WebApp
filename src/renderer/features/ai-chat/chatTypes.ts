export type ChatApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  detail?: string;
};

export type ChatSessionDto = {
  id: string;
  userId: string;
  spaceId: string | null;
  meetingId?: string | null;
  title: string | null;
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageDto = {
  role: 'user' | 'assistant' | string;
  content: string;
};

export type ChatSessionsPageDto = {
  chats: ChatSessionDto[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type ChatSessionDetailDto = {
  chat: ChatSessionDto;
  messages: ChatMessageDto[];
};

export type ChatCreatedItemDto = {
  kind: 'task' | 'note';
  id: string | null;
  title: string;
  dueDate: string | null;
  priority: string | null;
  spaceId: string;
  spaceName: string;
};

export type AskChatDto = {
  chatId: string;
  createdNewChat: boolean;
  answer: string;
  meetingId?: string;
  createdItems?: ChatCreatedItemDto[];
};

export type ChatSession = {
  id: string;
  title: string;
  spaceId: string | null;
  messageCount: number;
  /** ISO timestamp — keep serializable for Redux. */
  updatedAt: string;
};

export type ChatThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
};

export type ChatHistoryGroup = {
  label: string;
  sessions: ChatSession[];
};
