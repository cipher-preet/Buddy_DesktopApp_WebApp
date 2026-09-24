const CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const CHECKOUT_SCRIPT_ID = 'buddy-razorpay-checkout';

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutRequest = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  name?: string | null;
  email?: string | null;
  phone?: string | number | null;
};

export class RazorpayCheckoutError extends Error {
  readonly code: 'dismissed' | 'failed' | 'script' | 'incomplete';

  constructor(code: RazorpayCheckoutError['code'], message: string) {
    super(message);
    this.name = 'RazorpayCheckoutError';
    this.code = code;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

const loadCheckoutScript = () => {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(CHECKOUT_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      scriptLoadPromise = null;
      reject(new RazorpayCheckoutError('script', 'Secure checkout did not start. Please try again.'));
    };

    const handleError = () => {
      scriptLoadPromise = null;
      script.remove();
      reject(
        new RazorpayCheckoutError(
          'script',
          'Unable to load secure checkout. Check your connection and try again.',
        ),
      );
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.id = CHECKOUT_SCRIPT_ID;
      script.src = CHECKOUT_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      resolve();
    }
  });

  return scriptLoadPromise;
};

const setCheckoutSession = async (active: boolean) => {
  try {
    await window.electronApi?.setCheckoutSessionActive(active);
  } catch {
    // Checkout still opens on this page when the desktop bridge is unavailable.
  }
};

const normalizeContact = (phone?: string | number | null) => {
  if (phone === undefined || phone === null) {
    return '';
  }

  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
};

export const openRazorpayCheckout = async (
  request: RazorpayCheckoutRequest,
): Promise<RazorpaySuccessPayload> => {
  if (!request.keyId || !request.orderId || !request.amount || !request.currency) {
    throw new RazorpayCheckoutError('incomplete', 'Checkout details are incomplete. Please try again.');
  }

  await loadCheckoutScript();

  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new RazorpayCheckoutError('script', 'Secure checkout is unavailable right now.');
  }

  const contact = normalizeContact(request.phone);
  const email = request.email?.trim() || '';
  const name = request.name?.trim() || '';

  await setCheckoutSession(true);

  return new Promise<RazorpaySuccessPayload>((resolve, reject) => {
    let settled = false;
    let dismissTimer: number | null = null;

    const finish = (action: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (dismissTimer !== null) {
        window.clearTimeout(dismissTimer);
        dismissTimer = null;
      }
      // Keep the checkout session alive briefly so opener callbacks can finish.
      void Promise.resolve()
        .then(action)
        .finally(() => {
          window.setTimeout(() => {
            void setCheckoutSession(false);
          }, 400);
        });
    };

    const checkout = new Razorpay({
      key: request.keyId,
      amount: request.amount,
      currency: request.currency,
      name: 'Buddy',
      description: request.description,
      order_id: request.orderId,
      prefill: {
        name: name || undefined,
        email: email || undefined,
        contact: contact || undefined,
      },
      theme: {
        color: '#1355ff',
      },
      modal: {
        confirm_close: false,
        escape: true,
        animation: true,
        backdropclose: false,
        ondismiss: () => {
          // In Electron, dismiss can race ahead of the success handler.
          // Wait briefly so a completed payment can still resolve.
          if (settled) {
            return;
          }
          dismissTimer = window.setTimeout(() => {
            finish(() => {
              reject(
                new RazorpayCheckoutError(
                  'dismissed',
                  'Checkout closed before payment was completed.',
                ),
              );
            });
          }, 1200);
        },
      },
      handler: (response) => {
        const paymentId = response.razorpay_payment_id?.trim() || '';
        const orderId = response.razorpay_order_id?.trim() || request.orderId;
        const signature = response.razorpay_signature?.trim() || '';

        if (!paymentId || !orderId || !signature) {
          finish(() => {
            reject(
              new RazorpayCheckoutError(
                'incomplete',
                'Payment response was incomplete. Checking payment status…',
              ),
            );
          });
          return;
        }

        finish(() => {
          resolve({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
          });
        });
      },
    });

    checkout.on('payment.failed', (response) => {
      const rawDescription = response.error?.description?.trim() || '';
      const isInternationalCardBlock = /international cards? are not supported/i.test(
        rawDescription,
      );
      const description = isInternationalCardBlock
        ? 'International cards are disabled on this Razorpay account. In test mode, pay with UPI using success@razorpay, or enable International Cards in the Razorpay Dashboard.'
        : rawDescription || 'Payment was not completed. No plan change was made.';
      finish(() => {
        try {
          checkout.close();
        } catch {
          // ignore
        }
        reject(new RazorpayCheckoutError('failed', description));
      });
    });

    try {
      checkout.open();
    } catch {
      finish(() => {
        reject(new RazorpayCheckoutError('script', 'Unable to open secure checkout. Please try again.'));
      });
    }
  });
};
