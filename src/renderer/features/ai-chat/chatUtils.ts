import type { ChatHistoryGroup, ChatMessageDto, ChatSession, ChatSessionDto, ChatThreadMessage } from './chatTypes';

const toIsoTimestamp = (value: string | Date | undefined) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value;
  }

  return new Date().toISOString();
};

const asDate = (value: string | Date) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const mapChatSession = (session: ChatSessionDto): ChatSession => ({
  id: session.id,
  title: session.title?.trim() || 'New chat',
  spaceId: session.spaceId ?? null,
  messageCount: session.messageCount ?? 0,
  updatedAt: toIsoTimestamp(session.updatedAt),
});

export const mapChatMessage = (message: ChatMessageDto, index: number): ChatThreadMessage => ({
  id: `${message.role}-${index}`,
  role: message.role === 'user' ? 'user' : 'assistant',
  content: message.content ?? '',
});

export const titleFromQuestion = (question: string) => {
  const trimmed = question.trim();
  if (trimmed.length <= 42) {
    return trimmed || 'New chat';
  }

  return `${trimmed.slice(0, 42)}...`;
};

export const formatHistoryMeta = (value: string | Date) => {
  const date = asDate(value);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffDays === 0 && diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const groupChatSessions = (sessions: ChatSession[]): ChatHistoryGroup[] => {
  const groups: Record<'today' | 'yesterday' | 'week' | 'older', ChatSession[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  sessions.forEach((session) => {
    const date = asDate(session.updatedAt);
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

    if (diffDays <= 0) {
      groups.today.push(session);
    } else if (diffDays === 1) {
      groups.yesterday.push(session);
    } else if (diffDays < 7) {
      groups.week.push(session);
    } else {
      groups.older.push(session);
    }
  });

  return [
    { label: 'Today', sessions: groups.today },
    { label: 'Yesterday', sessions: groups.yesterday },
    { label: 'Past week', sessions: groups.week },
    { label: 'Older', sessions: groups.older },
  ].filter((group) => group.sessions.length > 0);
};

export const getChatErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number | string }).status;
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
      return 'Could not reach the chat server. Make sure AI Orchestration is running.';
    }
  }

  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: unknown }).data;

    if (typeof data === 'string' && data.trim()) {
      return data.slice(0, 220);
    }

    if (typeof data === 'object' && data) {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }

      if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
        return String((detail[0] as { msg?: unknown }).msg || fallback);
      }

      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
