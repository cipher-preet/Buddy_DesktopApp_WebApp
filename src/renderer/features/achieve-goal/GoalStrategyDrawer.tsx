import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export type GoalStrategyDetail = {
  id: string;
  title: string;
  kicker: string;
  statusLabel?: string;
  period: string;
  body: string;
  measurableGoal?: string;
  why?: string;
  proofPoints?: string[];
  effort?: string;
  status: 'ACTIVE' | 'DONE';
  metrics: Array<{ label: string; value: string; direction: 'up' | 'down' }>;
};

type GoalStrategyDrawerProps = {
  item: GoalStrategyDetail | null;
  onClose: () => void;
};

const toParagraphs = (value?: string) => {
  if (!value?.trim()) return [];
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const GoalStrategyDrawer = ({ item, onClose }: GoalStrategyDrawerProps) => {
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

  const overviewParts = toParagraphs(item.body);
  const whyParts = toParagraphs(item.why);
  const proofPoints = item.proofPoints?.filter(Boolean) ?? [];
  const metrics = item.metrics?.filter((row) => row.label && row.value) ?? [];

  return createPortal(
    <div className="gd-step-drawer" role="presentation">
      <button type="button" className="gd-step-drawer__backdrop" aria-label="Close strategy" onClick={onClose} />
      <aside
        ref={panelRef}
        className="gd-step-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="gd-step-drawer__head">
          <button type="button" className="gd-step-drawer__close" aria-label="Close" onClick={onClose}>
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

            {item.measurableGoal ? (
              <div className="gd-step-drawer__field">
                <h4>Measurable goal</h4>
                <p>{item.measurableGoal}</p>
              </div>
            ) : null}

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

            {proofPoints.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Proof points</h4>
                <ul className="gd-step-drawer__list gd-step-drawer__list--bullets">
                  {proofPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.effort ? (
              <div className="gd-step-drawer__field">
                <h4>Effort</h4>
                <p>{item.effort}</p>
              </div>
            ) : null}

            {metrics.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Plan signals</h4>
                <dl className="gd-rec-drawer__facts">
                  {metrics.map((row) => (
                    <div key={`${row.label}-${row.value}`} className="gd-rec-drawer__fact">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="gd-step-drawer__footer">
          <button type="button" className="gd-btn gd-btn--ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
};
