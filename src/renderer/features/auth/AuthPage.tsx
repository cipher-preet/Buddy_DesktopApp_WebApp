import { useState } from 'react';
import { FiPhone, FiSmartphone } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

import { BrandLogo } from '@/components/common/BrandLogo';

type AuthPageProps = {
  onContinue: () => void;
};

export const AuthPage = ({ onContinue }: AuthPageProps) => {
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  return (
    <main className="auth-page" aria-label="Sign in">
      <header className="auth-topbar">
        <BrandLogo size="md" className="auth-brand" />
      </header>

      <section className="auth-layout">
        <div className="auth-panel">
          <div className="auth-card">
            <h1>Continue to sign in</h1>
            <p>
              Sync your <strong>work calendar</strong> to start using Buddy
            </p>

            <div className="auth-actions">
              <button type="button" onClick={onContinue}>
                <FcGoogle aria-hidden="true" size={22} />
                <span>Continue with Google</span>
              </button>
              <button type="button" onClick={onContinue}>
                <span className="microsoft-mark" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span>Continue with Microsoft</span>
              </button>
              <button type="button" onClick={() => setShowPhoneInput((isVisible) => !isVisible)}>
                <FiSmartphone aria-hidden="true" size={22} />
                <span>Continue with mobile number</span>
              </button>
            </div>

            {showPhoneInput ? (
              <form className="phone-auth-form" aria-label="Continue with mobile number">
                <label>
                  <span>Mobile number</span>
                  <div>
                    <FiPhone aria-hidden="true" size={17} />
                    <input type="tel" placeholder="+1 555 000 0000" />
                  </div>
                </label>
                <button type="button" onClick={onContinue}>
                  Send verification code
                </button>
              </form>
            ) : null}

            <p className="auth-terms">
              By using Buddy you agree to the <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>
            </p>
          </div>
        </div>

        <aside className="auth-testimonial" aria-label="Founder message">
          <div className="testimonial-card">
            <div className="testimonial-person">
              <div>
                <strong>Preet</strong>
                <span>CEO &amp; Founder</span>
              </div>
            </div>

            <blockquote>
              "Buddy helps you keep conversations, tasks, notes, and follow-ups in one calm desktop
              workspace, so your important work is always easy to find and continue."
            </blockquote>
          </div>
        </aside>
      </section>
    </main>
  );
};
