import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
const speechBase = (import.meta.env.VITE_SPEECH_API_BASE_URL ?? `${apiBase}/speech`).replace(/\/$/, '');

export const MAX_RECORDING_SEGMENT_MS = 20_000;
export const MAX_UPLOAD_SEGMENT_MS = 25_000;
export const VOICE_UPLOAD_TIMEOUT_MS = 60_000;
export const VOICE_UPLOAD_RETRY_DELAY_MS = 30_000;
export const VOICE_UPLOAD_MAX_ATTEMPTS = 3;

export type ListeningSessionData = {
  user_id?: string;
  space_id?: string;
  conversation_id?: string;
  status?: string;
  started_at?: string;
  stopped_at?: string;
  last_sequence_number?: string | number;
  had_active_session?: boolean;
  message?: string;
};

type SpeechEnvelope<T> = {
  success?: boolean;
  message?: string;
  detail?: string;
  data?: T;
};

export type VoiceChunk = {
  blob: Blob;
  durationMs: number;
  mimeType: string;
  fileName: string;
};

export type UploadVoiceResult = {
  total_files?: number;
  jobs?: Array<{
    job_id?: string;
    sequence_number?: number;
    status?: string;
    filename?: string;
  }>;
};

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = (await response.json()) as SpeechEnvelope<unknown> & {
      message?: string;
      detail?: string;
    };
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload?.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
};

const unwrapSpeech = <T,>(payload: SpeechEnvelope<T>, fallback: string): T => {
  if (!payload?.success || payload.data === undefined) {
    throw new Error(payload?.message || payload?.detail || fallback);
  }
  return payload.data;
};

const shouldRetryUpload = (error: unknown, status?: number) => {
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status >= 500;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /network|failed to fetch|timeout|aborted|temporarily/i.test(error.message);
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const startSpeechListeningSession = async ({
  userId,
  spaceId,
}: {
  userId: string;
  spaceId: string;
}): Promise<ListeningSessionData> => {
  const response = await fetch(`${speechBase}/listening/start`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, spaceId }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to start listening session'));
  }

  const payload = (await response.json()) as SpeechEnvelope<ListeningSessionData>;
  return unwrapSpeech(payload, 'Unable to start listening session');
};

export const endSpeechListeningSession = async ({
  userId,
  spaceId,
}: {
  userId: string;
  spaceId: string;
}): Promise<ListeningSessionData> => {
  const response = await fetch(`${speechBase}/listening/end`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, spaceId }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Unable to end listening session'));
  }

  const payload = (await response.json()) as SpeechEnvelope<ListeningSessionData>;
  return unwrapSpeech(payload, 'Unable to end listening session');
};

export const uploadVoiceChunk = async ({
  userId,
  spaceId,
  chunk,
}: {
  userId: string;
  spaceId: string;
  chunk: VoiceChunk;
}): Promise<UploadVoiceResult> => {
  if (chunk.durationMs > MAX_UPLOAD_SEGMENT_MS) {
    throw new Error(
      `Voice chunk is too long (${Math.round(chunk.durationMs / 1000)}s). Keep chunks under ${Math.round(
        MAX_UPLOAD_SEGMENT_MS / 1000,
      )}s.`,
    );
  }

  if (!chunk.blob.size) {
    throw new Error('Voice chunk is empty.');
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= VOICE_UPLOAD_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VOICE_UPLOAD_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('space_id', spaceId);
      formData.append('file', chunk.blob, chunk.fileName);

      const response = await fetch(`${speechBase}/transcripting`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'Voice upload failed');
        if (shouldRetryUpload(null, response.status) && attempt < VOICE_UPLOAD_MAX_ATTEMPTS) {
          await sleep(VOICE_UPLOAD_RETRY_DELAY_MS);
          continue;
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as SpeechEnvelope<UploadVoiceResult>;
      return unwrapSpeech(payload, 'Voice upload failed');
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < VOICE_UPLOAD_MAX_ATTEMPTS &&
        shouldRetryUpload(error, error instanceof Response ? error.status : undefined);

      if (!canRetry) {
        break;
      }

      await sleep(VOICE_UPLOAD_RETRY_DELAY_MS);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Voice upload failed. Please try again.');
};
