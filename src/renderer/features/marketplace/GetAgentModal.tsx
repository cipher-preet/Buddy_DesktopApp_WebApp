import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { BrandLogo } from '@/components/common/BrandLogo';

type GetAgentModalProps = {
  agentName: string;
  onClose: () => void;
  onStartTrial: () => void;
};

const AgentsArtwork = () => (
  <svg className="get-agent-art" viewBox="0 0 520 460" role="img" aria-label="KukuNotes agents">
    <rect width="520" height="460" fill="#f4f5f7" />
    <g fill="none" stroke="#d8c9ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="10 14">
      <path d="M268 42 H338" />
      <path d="M356 42 H428" />
      <path d="M444 42 H500" />
      <path d="M392 64 H470" />
      <path d="M478 64 H512" />
      <path d="M418 86 H498" />
    </g>
    <g transform="translate(318 148)">
      <circle cx="46" cy="46" r="46" fill="#12a39a" />
      <circle cx="46" cy="46" r="46" fill="none" stroke="#0e7d76" strokeWidth="3" />
      <path
        d="M28 40 h36 a4 4 0 0 1 4 4 v24 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 V44 a4 4 0 0 1 4 -4 z"
        fill="#fff"
      />
      <path d="M34 40 v-4 a12 8 0 0 1 24 0 v4" fill="#fff" />
    </g>
    <g transform="translate(236 248)">
      <circle cx="42" cy="42" r="42" fill="#f59a3a" />
      <circle cx="42" cy="42" r="42" fill="none" stroke="#d97706" strokeWidth="3" />
      <path
        d="M24 32 h36 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 H40 l-10 10 v-10 H24 a8 8 0 0 1 -8 -8 V40 a8 8 0 0 1 8 -8 z"
        fill="#fff"
      />
      <circle cx="38" cy="49" r="3.2" fill="#f59a3a" />
      <circle cx="50" cy="49" r="3.2" fill="#f59a3a" />
    </g>
    <g transform="translate(402 286)" opacity="0.9">
      <circle cx="28" cy="28" r="28" fill="#e8eef8" />
      <circle cx="28" cy="28" r="28" fill="none" stroke="#c9d6ea" strokeWidth="2" />
      <path d="M18 22 h20 v4 H18 z M18 30 h16 v4 H18 z M18 38 h12 v4 H18 z" fill="#7b8aa3" />
    </g>
  </svg>
);

export const GetAgentModal = ({ agentName, onClose, onStartTrial }: GetAgentModalProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="get-agent-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="get-agent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="get-agent-modal__copy">
          <BrandLogo size="sm" />
          <div className="get-agent-modal__intro">
            <h2 id={titleId}>
              Introducing
              <br />
              KukuNotes Agents
            </h2>
            <p id={descriptionId}>
              Agents answer questions, route tasks, write reports, and more. See what they can do with a{' '}
              <strong>free 14-day trial of KukuNotes</strong>. Start with {agentName}.
            </p>
          </div>
          <div className="get-agent-modal__actions">
            <button type="button" className="get-agent-modal__primary" onClick={onStartTrial}>
              Try Agents free for 14 days
            </button>
            <button type="button" className="get-agent-modal__ghost" onClick={onClose}>
              Maybe later
            </button>
          </div>
        </div>
        <div className="get-agent-modal__art" aria-hidden="true">
          <AgentsArtwork />
        </div>
      </div>
    </div>,
    document.body,
  );
};
