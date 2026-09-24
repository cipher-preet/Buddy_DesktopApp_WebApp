import type { CheckAuthData } from '@/features/auth/authTypes';
import { isHardAuthFailure } from '@/services/apiErrors';

const BOOTSTRAP_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_MS = 450;

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

export type SessionBootstrapResult =
  | { kind: 'authenticated'; data: CheckAuthData }
  | { kind: 'offline'; keepLocalSession: true }
  | { kind: 'invalid' }
  | { kind: 'missing' };

type CheckAuthRunner = () => Promise<CheckAuthData>;

/**
 * Restores session via auth/checkauth with retries.
 * Transient network / proxy failures keep the local session so refresh stays stable.
 * Only a definitive auth rejection clears the user out.
 */
export const bootstrapAuthSession = async (
  hasLocalSession: boolean,
  checkAuth: CheckAuthRunner,
): Promise<SessionBootstrapResult> => {
  if (!hasLocalSession) {
    return { kind: 'missing' };
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < BOOTSTRAP_ATTEMPTS; attempt += 1) {
    try {
      const data = await checkAuth();

      if (!data?.authenticated || !data.userId) {
        return { kind: 'invalid' };
      }

      return { kind: 'authenticated', data };
    } catch (error) {
      lastError = error;

      if (isHardAuthFailure(error)) {
        return { kind: 'invalid' };
      }

      const shouldRetry = attempt < BOOTSTRAP_ATTEMPTS - 1;

      if (shouldRetry) {
        await wait(BOOTSTRAP_RETRY_MS * (attempt + 1));
      }
    }
  }

  // Soft failure: keep local credentials so a flaky refresh does not log the user out.
  if (lastError && !isHardAuthFailure(lastError)) {
    return { kind: 'offline', keepLocalSession: true };
  }

  return { kind: 'invalid' };
};
