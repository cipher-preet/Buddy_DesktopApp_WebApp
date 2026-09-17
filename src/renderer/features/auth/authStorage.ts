import type { AuthPayload, AuthSession, AuthUser, CheckAuthData } from './authTypes';

const AUTH_STORAGE_KEY = 'buddy.auth.session.v1';

const isBrowserStorageAvailable = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const toAuthUser = (payload: AuthPayload | CheckAuthData): AuthUser => ({
  userId: payload.userId,
  name: payload.name ?? null,
  email: payload.email ?? null,
  phone: payload.phone ?? null,
  avatar: payload.avatar ?? null,
  isNewUser: payload.isNewUser,
  hasCompletedOnboarding:
    'hasCompletedOnboarding' in payload
      ? payload.hasCompletedOnboarding
      : payload.isNewUser === undefined
        ? undefined
        : !payload.isNewUser,
});

export const readAuthSession = (): AuthSession | null => {
  if (!isBrowserStorageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.user?.userId) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeAuthSession = (payload: AuthPayload): AuthSession => {
  const session: AuthSession = {
    token: payload.token,
    user: toAuthUser(payload),
    authenticatedAt: new Date().toISOString(),
  };

  if (isBrowserStorageAvailable()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
};

export const writeAuthSessionFromCheck = (token: string, data: CheckAuthData): AuthSession => {
  const session: AuthSession = {
    token,
    user: toAuthUser(data),
    authenticatedAt: new Date().toISOString(),
  };

  if (isBrowserStorageAvailable()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
};

export const clearAuthSession = () => {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getStoredAuthToken = () => readAuthSession()?.token ?? null;
