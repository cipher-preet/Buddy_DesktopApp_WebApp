import { getStoredAuthToken } from '@/features/auth/authStorage';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

export type DocumentStatusEvent = {
  eventType?: string;
  userId?: string;
  spaceId?: string;
  jobId?: string;
  documentId?: string;
  templateCode?: string;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  raw: unknown;
};

type SubscribeParams = {
  userId: string;
  spaceId: string;
  jobId?: string | null;
  documentId?: string | null;
  token?: string | null;
  onStatusChange: (event: DocumentStatusEvent) => void;
  onError?: (error: unknown) => void;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
const SSE_RECORD_SEPARATOR = /\r?\n\r?\n/;
const RECONNECT_MIN_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const TERMINAL = new Set(['READY', 'FAILED']);

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

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

const normalizeStatusEvent = (
  message: { event?: string; data: string },
): DocumentStatusEvent | null => {
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
  const spaceId = readString(payload.spaceId) || readString(payload.space_id);
  const documentId = readString(payload.documentId) || readString(payload._id);
  if (!spaceId || !documentId) {
    return null;
  }

  const progressRaw = payload.progress;
  const progress =
    typeof progressRaw === 'number'
      ? progressRaw
      : typeof progressRaw === 'string' && progressRaw.trim()
        ? Number(progressRaw)
        : undefined;

  return {
    eventType: readString(payload.eventType) || message.event,
    userId: readString(payload.userId) || readString(payload.user_id),
    spaceId,
    jobId: readString(payload.jobId),
    documentId,
    templateCode: readString(payload.templateCode),
    status: readString(payload.status),
    stage: readString(payload.stage),
    progress: Number.isFinite(progress) ? progress : undefined,
    message: readString(payload.message),
    error: payload.error == null ? null : readString(payload.error) || String(payload.error),
    raw: parsed,
  };
};

const buildEventsUrl = (params: {
  userId: string;
  spaceId: string;
  jobId?: string | null;
  documentId?: string | null;
}) => {
  const query = new URLSearchParams({ userId: params.userId, spaceId: params.spaceId });
  if (params.jobId) {
    query.set('jobId', params.jobId);
  }
  if (params.documentId) {
    query.set('documentId', params.documentId);
  }
  return `${apiBase}/home/document-status-events?${query.toString()}`;
};

export const subscribeToDocumentStatusEvents = ({
  userId,
  spaceId,
  jobId,
  documentId,
  token,
  onStatusChange,
  onError,
}: SubscribeParams) => {
  const controller = new AbortController();
  let buffer = '';
  let closed = false;
  let terminal = false;

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

      if (message.event === 'document.status.error') {
        onError?.(new Error(message.data || 'Status stream error'));
        continue;
      }

      const normalized = normalizeStatusEvent(message);
      if (!normalized) {
        continue;
      }

      if (normalized.spaceId !== spaceId) {
        continue;
      }
      if (jobId && normalized.jobId && normalized.jobId !== jobId) {
        continue;
      }
      if (documentId && normalized.documentId !== documentId) {
        continue;
      }

      onStatusChange(normalized);
      if (normalized.status && TERMINAL.has(normalized.status)) {
        terminal = true;
        closed = true;
        controller.abort();
      }
    }
  };

  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = RECONNECT_MIN_MS;

  const connect = async (): Promise<boolean> => {
    let received = false;
    try {
      const authToken = token || getStoredAuthToken();
      const response = await fetch(buildEventsUrl({ userId, spaceId, jobId, documentId }), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Document status stream failed (${response.status})`);
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

  const run = async () => {
    if (terminal || closed) {
      return;
    }
    const healthy = await connect();
    if (closed || terminal) {
      return;
    }
    retryDelay = healthy ? RECONNECT_MIN_MS : Math.min(retryDelay * 2, RECONNECT_MAX_MS);
    retryTimer = setTimeout(() => void run(), retryDelay);
  };

  void run();

  return () => {
    closed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
    }
    controller.abort();
  };
};
