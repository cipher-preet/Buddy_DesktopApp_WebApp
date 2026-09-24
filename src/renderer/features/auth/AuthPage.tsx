import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FiArrowLeft, FiPhone, FiSmartphone } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

import { BrandLogo } from '@/components/common/BrandLogo';
import { useAppDispatch } from '@/app/hooks';
import { setAuthenticatedFromPayload } from '@/features/auth/authSlice';
import { requestGoogleIdToken } from '@/features/auth/googleIdentity';
import {
  formatMaskedIndianMobile,
  isValidOtp,
  normalizeIndianMobileInput,
} from '@/features/auth/phoneUtils';
import type { AuthPayload } from '@/features/auth/authTypes';
import {
  useCheckPhoneMutation,
  useGoogleLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '@/services/api';

type AuthStep = 'providers' | 'phone' | 'otp';

type AuthPageProps = {
  onAuthenticated: () => void;
};

const RESEND_COOLDOWN_SECONDS = 60;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const AuthPage = ({ onAuthenticated }: AuthPageProps) => {
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<AuthStep>('providers');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [username, setUsername] = useState('');
  const [isNewPhoneUser, setIsNewPhoneUser] = useState(false);
  const [activePhone, setActivePhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [checkPhone, { isLoading: isCheckingPhone }] = useCheckPhoneMutation();
  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [googleLogin, { isLoading: isGoogleApiLoading }] = useGoogleLoginMutation();

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const normalizedPhone = useMemo(() => normalizeIndianMobileInput(phoneInput), [phoneInput]);
  const canSendOtp = Boolean(normalizedPhone) && !isCheckingPhone && !isSendingOtp;
  const canVerifyOtp =
    isValidOtp(otpInput) &&
    Boolean(activePhone) &&
    !isVerifyingOtp &&
    (!isNewPhoneUser || username.trim().length >= 2);

  const resetMessages = () => {
    setErrorMessage('');
    setInfoMessage('');
  };

  const completeAuth = (payload: AuthPayload) => {
    dispatch(setAuthenticatedFromPayload(payload));
    setOtpInput('');
    setUsername('');
    onAuthenticated();
  };

  const handleGoogleContinue = async () => {
    resetMessages();

    if (!googleClientId) {
      setErrorMessage('Google Sign-In is not configured for this app.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      const idToken = await requestGoogleIdToken(googleClientId);
      const payload = await googleLogin({ idToken, platform: 'web' }).unwrap();
      completeAuth(payload);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const startPhoneStep = () => {
    resetMessages();
    setStep('phone');
  };

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!normalizedPhone) {
      setErrorMessage('Enter a valid Indian mobile number');
      return;
    }

    try {
      const phoneCheck = await checkPhone({ phone: normalizedPhone }).unwrap();
      await sendOtp({ phone: normalizedPhone }).unwrap();

      setActivePhone(normalizedPhone);
      setIsNewPhoneUser(!phoneCheck.exists);
      setUsername(phoneCheck.name?.trim() || '');
      setOtpInput('');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setInfoMessage('Verification code sent. It expires in 5 minutes.');
      setStep('otp');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to send verification code'));
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || !activePhone) {
      return;
    }

    resetMessages();
    try {
      await sendOtp({ phone: activePhone }).unwrap();
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setInfoMessage('A new verification code was sent.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to resend verification code'));
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!isValidOtp(otpInput)) {
      setErrorMessage('Enter the 4-digit verification code');
      return;
    }

    if (isNewPhoneUser && username.trim().length < 2) {
      setErrorMessage('Enter your name to continue');
      return;
    }

    try {
      const payload = await verifyOtp({
        phone: activePhone,
        otp: otpInput,
        username: isNewPhoneUser ? username.trim() : username.trim() || undefined,
        platform: 'web',
      }).unwrap();
      completeAuth(payload);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Invalid or expired verification code'));
    }
  };

  const isBusy = isGoogleLoading || isGoogleApiLoading || isCheckingPhone || isSendingOtp || isVerifyingOtp;

  return (
    <main className="auth-page" aria-label="Sign in">
      <header className="auth-topbar">
        <BrandLogo size="md" className="auth-brand" />
      </header>

      <section className="auth-layout">
        <div className="auth-panel">
          <div className="auth-card">
            {step === 'otp' ? (
              <>
                <button
                  className="auth-back-button"
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setStep('phone');
                  }}
                  disabled={isBusy}
                >
                  <FiArrowLeft aria-hidden="true" size={18} />
                  <span>Back</span>
                </button>
                <h1>Verify your number</h1>
                <p>
                  Enter the 4-digit code sent to <strong>{formatMaskedIndianMobile(activePhone)}</strong>
                </p>

                <form className="otp-auth-form" onSubmit={handleVerifyOtp} aria-label="Verify OTP">
                  {isNewPhoneUser ? (
                    <label>
                      <span>Your name</span>
                      <input
                        type="text"
                        autoComplete="name"
                        maxLength={60}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter your name"
                        disabled={isBusy}
                        required
                      />
                    </label>
                  ) : null}

                  <label>
                    <span>Verification code</span>
                    <input
                      className="otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{4}"
                      maxLength={4}
                      value={otpInput}
                      onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      disabled={isBusy}
                      required
                    />
                  </label>

                  {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}
                  {infoMessage ? <p className="auth-info">{infoMessage}</p> : null}

                  <button type="submit" disabled={!canVerifyOtp}>
                    {isVerifyingOtp ? 'Verifying…' : 'Verify and continue'}
                  </button>

                  <button
                    className="auth-text-button"
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendIn > 0 || isSendingOtp}
                  >
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : isSendingOtp ? 'Sending…' : 'Resend code'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1>Continue to sign in</h1>
                <p>
                  Sync your <strong>work calendar</strong> to start using Buddy
                </p>

                <div className="auth-actions">
                  <button type="button" onClick={handleGoogleContinue} disabled={isBusy}>
                    <FcGoogle aria-hidden="true" size={22} />
                    <span>{isGoogleLoading || isGoogleApiLoading ? 'Connecting…' : 'Continue with Google'}</span>
                  </button>
                  <button type="button" onClick={startPhoneStep} disabled={isBusy} aria-expanded={step === 'phone'}>
                    <FiSmartphone aria-hidden="true" size={22} />
                    <span>Continue with mobile number</span>
                  </button>
                </div>

                {step === 'phone' ? (
                  <form className="phone-auth-form" onSubmit={handleSendOtp} aria-label="Continue with mobile number">
                    <label>
                      <span>Mobile number</span>
                      <div>
                        <FiPhone aria-hidden="true" size={17} />
                        <span className="phone-prefix" aria-hidden="true">
                          +91
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="98765 43210"
                          value={phoneInput}
                          onChange={(event) => setPhoneInput(event.target.value.replace(/[^\d\s]/g, '').slice(0, 14))}
                          disabled={isBusy}
                          required
                        />
                      </div>
                    </label>

                    {errorMessage ? <p className="auth-error" role="alert">{errorMessage}</p> : null}

                    <button type="submit" disabled={!canSendOtp}>
                      {isCheckingPhone || isSendingOtp ? 'Sending…' : 'Send verification code'}
                    </button>
                  </form>
                ) : errorMessage ? (
                  <p className="auth-error auth-error--standalone" role="alert">
                    {errorMessage}
                  </p>
                ) : null}

                <p className="auth-terms">
                  By using Buddy you agree to the <a href="#terms">Terms of Service</a> and{' '}
                  <a href="#privacy">Privacy Policy</a>
                </p>
              </>
            )}
          </div>
        </div>

        <aside className="auth-testimonial" aria-label="Founder message">
          <div className="testimonial-card">
            <div className="testimonial-person">
              <div>
                <strong>Preet</strong>
                <span>Founder</span>
              </div>
            </div>

            <blockquote>
              &quot;Buddy helps you keep conversations, tasks, notes, and follow-ups in one calm desktop
              workspace, so your important work is always easy to find and continue.&quot;
            </blockquote>
          </div>
        </aside>
      </section>
    </main>
  );
};
