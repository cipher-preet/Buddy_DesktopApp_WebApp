import { isPlanRestrictionError } from '@/features/settings/planRestriction';

const UNREACHABLE_HTTP_STATUSES = new Set([502, 503, 504]);

const CONNECTION_FAILURE_MARKERS = [
  'proxy error',
  'econnrefused',
  'enotfound',
  'socket hang up',
  'failed to fetch',
  'networkerror',
  'network request failed',
  'connection refused',
];

const AUTH_FAILURE_MESSAGE_PATTERN =
  /unauthorized|unauthenticated|invalid token|token expired|jwt expired|session (?:expired|invalid)|please (?:log|sign)\s?in|authentication required|not authenticated/i;

const getErrorDetailText = (error: unknown): string => {
  if (typeof error !== 'object' || !error) {
    return '';
  }

  const record = error as { data?: unknown; error?: unknown; message?: unknown };
  const chunks: string[] = [];

  const pushValue = (value: unknown) => {
    if (value == null) {
      return;
    }
    if (typeof value === 'string') {
      chunks.push(value);
      return;
    }
    if (typeof value === 'object') {
      const nested = value as { message?: unknown; error?: unknown };
      if (typeof nested.message === 'string') {
        chunks.push(nested.message);
      }
      if (typeof nested.error === 'string') {
        chunks.push(nested.error);
      }
      return;
    }
    chunks.push(String(value));
  };

  pushValue(record.data);
  pushValue(record.error);
  pushValue(record.message);

  return chunks.join(' ').toLowerCase();
};

const isConnectionFailureMessage = (error: unknown): boolean => {
  const detail = getErrorDetailText(error);
  return CONNECTION_FAILURE_MARKERS.some((marker) => detail.includes(marker));
};

export const getFetchErrorStatus = (error: unknown): number | string | null => {
  if (typeof error !== 'object' || !error || !('status' in error)) {
    return null;
  }

  return (error as { status?: number | string }).status ?? null;
};

export const isServerUnreachableError = (error: unknown): boolean => {
  const status = getFetchErrorStatus(error);

  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR' || status === 'PARSING_ERROR') {
    return true;
  }

  if (typeof status !== 'number' || status < 500) {
    return false;
  }

  if (UNREACHABLE_HTTP_STATUSES.has(status) || isConnectionFailureMessage(error)) {
    return true;
  }

  const data = (error as { data?: unknown }).data;
  // Vite dev proxy often returns HTTP 500 with an empty body when the backend is down.
  if (data == null || data === '' || (typeof data === 'string' && !data.trim())) {
    return true;
  }

  return false;
};

/**
 * Hard session invalidation only.
 * Network / 5xx / plan-limit 403 must never clear the user's session.
 */
export const isAuthRejectionError = (error: unknown): boolean => {
  if (isPlanRestrictionError(error) || isServerUnreachableError(error)) {
    return false;
  }

  const status = getFetchErrorStatus(error);
  if (status === 401) {
    return true;
  }

  if (status === 403) {
    return AUTH_FAILURE_MESSAGE_PATTERN.test(getErrorDetailText(error));
  }

  return false;
};

/** Alias used by bootstrap / session restore. */
export const isHardAuthFailure = isAuthRejectionError;

/** @deprecated Prefer isHardAuthFailure — kept for call sites that previously also logged out on offline. */
export const shouldForceLogout = (error: unknown): boolean => isHardAuthFailure(error);
