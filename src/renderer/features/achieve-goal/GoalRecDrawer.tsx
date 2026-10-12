import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export type GoalRecDetail = {
  id: string;
  title: string;
  kicker: string;
  statusLabel?: string;
  summary: string;
  overviewParts: string[];
  whyItMatters?: string;
  howSteps?: string[];
  details?: Array<{ label: string; value: string }>;
  related?: string[];
  actionLabel?: string;
  actionKind?: 'approve' | 'retry' | null;
};

type GoalRecDrawerProps = {
  item: GoalRecDetail | null;
  busy?: boolean;
  onClose: () => void;
  onAction?: (kind: 'approve' | 'retry') => void;
};

const toParagraphs = (value?: string) => {
  if (!value?.trim()) return [];
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const GoalRecDrawer = ({ item, busy = false, onClose, onAction }: GoalRecDrawerProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [item, onClose]);

  if (!item) return null;

  const overviewParts =
    item.overviewParts.length > 0 ? item.overviewParts : toParagraphs(item.summary);
  const whyParts = toParagraphs(item.whyItMatters);
  const howSteps = item.howSteps?.filter(Boolean) ?? [];
  const details = item.details?.filter((row) => row.label && row.value) ?? [];
  const related = item.related?.filter(Boolean) ?? [];

  return createPortal(
    <div className="gd-step-drawer" role="presentation">
      <button type="button" className="gd-step-drawer__backdrop" aria-label="Close recommendation" onClick={onClose} />
      <aside
        ref={panelRef}
        className="gd-step-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="gd-step-drawer__head">
          <button type="button" className="gd-step-drawer__close" aria-label="Close" onClick={onClose} disabled={busy}>
            <FiX size={16} aria-hidden="true" />
          </button>
          <div className="gd-step-drawer__head-copy">
            <div className="gd-step-drawer__eyebrow">
              <span>{item.kicker}</span>
              {item.statusLabel ? <span className="gd-step-drawer__status">{item.statusLabel}</span> : null}
            </div>
            <h2 id={titleId}>{item.title}</h2>
          </div>
        </header>

        <div className="gd-step-drawer__body">
          <section className="gd-step-drawer__block">
            <h3>Overview</h3>
            <div className="gd-step-drawer__copy">
              {overviewParts.map((paragraph, index) => (
                <p key={`overview-${index}`}>{paragraph}</p>
              ))}
            </div>

            {whyParts.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Why this matters</h4>
                <div className="gd-step-drawer__copy">
                  {whyParts.map((paragraph, index) => (
                    <p key={`why-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {howSteps.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>How to use this</h4>
                <ol className="gd-step-drawer__list">
                  {howSteps.map((step, index) => (
                    <li key={`how-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {details.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Details</h4>
                <dl className="gd-rec-drawer__facts">
                  {details.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="gd-rec-drawer__fact">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {related.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Related context</h4>
                <ul className="gd-step-drawer__list gd-step-drawer__list--bullets">
                  {related.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="gd-step-drawer__footer">
          <button type="button" className="gd-btn gd-btn--ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
          {item.actionKind && item.actionLabel ? (
            <button
              type="button"
              className="gd-btn gd-btn--primary gd-step-drawer__action"
              disabled={busy}
              onClick={() => onAction?.(item.actionKind!)}
            >
              {busy ? (
                <>
                  <span className="gd-step-drawer__spinner" aria-hidden="true" />
                  Working…
                </>
              ) : (
                item.actionLabel
              )}
            </button>
          ) : null}
        </footer>
      </aside>
    </div>,
    document.body,
  );
};
