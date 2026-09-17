type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdConfig = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  ux_mode?: 'popup' | 'redirect';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
};

type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
};

type GoogleAccountsId = {
  initialize: (config: GoogleIdConfig) => void;
  prompt: (notification?: (notification: GooglePromptNotification) => void) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GSI_SCRIPT_ID = 'buddy-google-gsi-client';

let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Sign-In')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google Sign-In'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

const waitForButton = (container: HTMLElement, timeoutMs = 4000) =>
  new Promise<HTMLElement>((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      const button = container.querySelector<HTMLElement>('div[role="button"], button');
      if (button) {
        resolve(button);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Google Sign-In button failed to render'));
        return;
      }

      window.setTimeout(poll, 50);
    };

    poll();
  });

export const requestGoogleIdToken = async (clientId: string) => {
  if (!clientId) {
    throw new Error('Google Sign-In is not configured');
  }

  await loadGoogleIdentityScript();

  const googleId = window.google?.accounts?.id;
  if (!googleId) {
    throw new Error('Google Sign-In is unavailable in this environment');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let host: HTMLDivElement | null = null;

    const cleanup = () => {
      googleId.cancel();
      if (host?.parentNode) {
        host.parentNode.removeChild(host);
      }
      host = null;
    };

    const finish = (error?: Error, token?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      resolve(token as string);
    };

    googleId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      use_fedcm_for_prompt: false,
      callback: (response) => {
        if (!response.credential) {
          finish(new Error('Google did not return an ID token'));
          return;
        }
        finish(undefined, response.credential);
      },
    });

    const openFallbackButton = async () => {
      try {
        host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.position = 'fixed';
        host.style.left = '-10000px';
        host.style.top = '0';
        host.style.width = '1px';
        host.style.height = '1px';
        host.style.overflow = 'hidden';
        document.body.appendChild(host);

        googleId.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });

        const button = await waitForButton(host);
        button.click();
      } catch (error) {
        finish(
          error instanceof Error
            ? error
            : new Error(
                'Google Sign-In could not open. Add http://127.0.0.1:5173 as an Authorized JavaScript origin for this Google client ID.',
              ),
        );
      }
    };

    googleId.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        void openFallbackButton();
        return;
      }

      if (notification.isDismissedMoment()) {
        finish(new Error('Google sign-in was cancelled'));
      }
    });
  });
};
