import { getStoredAuthToken } from '@/features/auth/authStorage';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

export type ConversationStatusEvent = {
  userId?: string;
  spaceId?: string;
  conversationId?: string;
  status?: string;
  extractionRunStatus?: string;
  eventType?: string;
  raw: unknown;
};

type SubscribeParams = {
  userId: string;
  spaceId?: string | null;
  token?: string | null;
  onStatusChange: (event: ConversationStatusEvent) => void;
  onError?: (error: unknown) => void;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
const SSE_RECORD_SEPARATOR = /\r?\n\r?\n/;
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const readNestedString = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const directValue = readString(source[key]);
    if (directValue) {
      return directValue;
    }
  }
  return undefined;
};

const normalizeStatusEvent = (
  message: { event?: string; data: string },
): ConversationStatusEvent | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(message.data);
  } catch {
    parsed = message.data;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const payload = parsed as Record<string, unknown>;
  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : payload;
  const extractionRun =
    data.extractionRun && typeof data.extractionRun === 'object'
      ? (data.extractionRun as Record<string, unknown>)
      : undefined;

  const spaceId = readNestedString(data, ['spaceId', 'space_id']);
  if (!spaceId) {
    return null;
  }

  return {
    userId: readNestedString(data, ['userId', 'user_id']),
    spaceId,
    conversationId: readNestedString(data, ['conversationId', 'conversation_id']),
    status: readString(data.status),
    extractionRunStatus:
      readString(data.extractionRunStatus) || readString(extractionRun?.status),
    eventType: readString(payload.eventType) || readString(data.eventType) || message.event,
    raw: parsed,
  };
};

const parseSseMessage = (record: string) => {
  const lines = record.split(/\r?\n/);
  const dataLines: string[] = [];
  let event: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event,
    data: dataLines.join('\n'),
  };
};

const buildEventsUrl = (userId: string, spaceId?: string | null) => {
  const params = new URLSearchParams({ userId });
  if (spaceId) {
    params.set('spaceId', spaceId);
  }
  return `${apiBase}/home/conversation-status-events?${params.toString()}`;
};

export const subscribeToConversationStatusEvents = ({
  userId,
  spaceId,
  token,
  onStatusChange,
  onError,
}: SubscribeParams) => {
  const controller = new AbortController();
  let buffer = '';
  let closed = false;

  const processBuffer = () => {
    const parts = buffer.split(SSE_RECORD_SEPARATOR);
    buffer = parts.pop() ?? '';

    for (const record of parts) {
      const trimmed = record.trim();
      if (!trimmed || trimmed.startsWith(':')) {
        continue;
      }

      const message = parseSseMessage(trimmed);
      if (!message) {
        continue;
      }

      if (message.event === 'conversation.status.error') {
        onError?.(new Error(message.data || 'Status stream error'));
        continue;
      }

      const normalized = normalizeStatusEvent(message);
      if (!normalized) {
        continue;
      }

      if (spaceId && normalized.spaceId !== spaceId) {
        continue;
      }

      onStatusChange(normalized);
    }
  };

  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = RECONNECT_MIN_MS;

  const connect = async (): Promise<boolean> => {
    let received = false;
    try {
      const authToken = token || getStoredAuthToken();
      const response = await fetch(buildEventsUrl(userId, spaceId), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Status stream failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      buffer = '';

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        received = true;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
      }
    } catch (error) {
      if (!closed && !(error instanceof DOMException && error.name === 'AbortError')) {
        onError?.(error);
      }
    }
    return received;
  };

  // Hosting proxies (e.g. Vercel rewrites) end long-lived streams, so keep reconnecting.
  const run = async () => {
    const healthy = await connect();
    if (closed) {
      return;
    }
    retryDelay = healthy ? RECONNECT_MIN_MS : Math.min(retryDelay * 2, RECONNECT_MAX_MS);
    retryTimer = setTimeout(() => void run(), retryDelay);
  };

  void run();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    controller.abort();
  };
};
