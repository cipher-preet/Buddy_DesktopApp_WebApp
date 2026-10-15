import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiRotateCcw, FiX } from 'react-icons/fi';

import { getApiErrorMessage } from '@/services/apiErrors';
import { useToggleGoalPlanItemMutation } from '@/services/goalsApi';

export type GoalStepDetail = {
  id: string;
  taskId: string;
  kicker: string;
  label: string;
  done: boolean;
  note?: string;
  dayTitle?: string;
  hours?: number | null;
  overviewParts?: string[];
  overview?: string;
  whyItMatters?: string;
  howSteps?: string[];
  howToApproach?: string;
  definitionOfDone?: string;
  doneChecks?: string[];
  relatedTasks?: string[];
  dayFocus?: string;
};

type GoalStepDrawerProps = {
  goalId: string;
  step: GoalStepDetail | null;
  onClose: () => void;
  onUpdated?: () => void;
};

const toParagraphs = (value?: string | string[]) => {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (!value?.trim()) return [];
  return value
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const GoalStepDrawer = ({ goalId, step, onClose, onUpdated }: GoalStepDrawerProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');
  const [togglePlanItem, toggleState] = useToggleGoalPlanItemMutation();

  useEffect(() => {
    setNote(step?.note || '');
    setLocalError('');
  }, [step?.id, step?.note]);

  useEffect(() => {
    if (!step) return undefined;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button, textarea')?.focus();
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
  }, [step, onClose]);

  if (!step) return null;

  const busy = toggleState.isLoading;
  const canSaveNote = Boolean(step.taskId) && note.trim() !== (step.note || '').trim();
  const savingNote = busy && canSaveNote;

  const overviewParts = (() => {
    const parts = step.overviewParts?.length ? step.overviewParts : toParagraphs(step.overview);
    if (parts.length > 0) return parts;
    return [`Part of ${step.dayTitle || step.kicker}.`];
  })();

  const howSteps = (() => {
    if (step.howSteps?.length) return step.howSteps;
    const fromText = toParagraphs(step.howToApproach);
    if (fromText.length > 0) return fromText;
    return [`Do: ${step.label}`];
  })();

  const whyParts = toParagraphs(step.whyItMatters);
  const definitionOfDone = step.definitionOfDone || `Done when “${step.label}” is finished and checkable.`;
  const doneChecks =
    step.doneChecks && step.doneChecks.length > 0 ? step.doneChecks : [definitionOfDone];

  const runUpdate = async (payload: { done?: boolean; note?: string }, failureMessage: string) => {
    if (!step.taskId) {
      setLocalError('This step cannot be updated yet.');
      return;
    }
    setLocalError('');
    try {
      await togglePlanItem({
        goalId,
        kind: 'day_task',
        itemId: step.taskId,
        ...payload,
      }).unwrap();
      onUpdated?.();
    } catch (error) {
      setLocalError(getApiErrorMessage(error, failureMessage));
    }
  };

  return createPortal(
    <div className="gd-step-drawer" role="presentation">
      <button type="button" className="gd-step-drawer__backdrop" aria-label="Close step details" onClick={onClose} />
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
              <span>{step.kicker}</span>
              <span className={`gd-step-drawer__status${step.done ? ' is-done' : ''}`}>
                {step.done ? 'Done' : 'Open'}
              </span>
            </div>
            <h2 id={titleId}>{step.label}</h2>
            {step.dayTitle ? <p className="gd-step-drawer__phase">{step.dayTitle}</p> : null}
          </div>
        </header>

        <div className="gd-step-drawer__body">
          <section className="gd-step-drawer__block">
            <h3>About this step</h3>
            <div className="gd-step-drawer__copy">
              {overviewParts.map((paragraph, index) => (
                <p key={`overview-${index}`}>{paragraph}</p>
              ))}
            </div>

            {whyParts.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Why</h4>
                <div className="gd-step-drawer__copy">
                  {whyParts.map((paragraph, index) => (
                    <p key={`why-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ) : null}

            {howSteps.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Do this</h4>
                <ol className="gd-step-drawer__list">
                  {howSteps.map((item, index) => (
                    <li key={`how-${index}`}>{item}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {step.relatedTasks && step.relatedTasks.length > 0 ? (
              <div className="gd-step-drawer__field">
                <h4>Also today</h4>
                <ul className="gd-step-drawer__list gd-step-drawer__list--bullets">
                  {step.relatedTasks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step.hours != null ? (
              <p className="gd-step-drawer__effort">
                About {step.hours} hour{step.hours === 1 ? '' : 's'} for this day.
              </p>
            ) : null}
          </section>

          <section className="gd-step-drawer__block">
            <h3>Done when</h3>
            <p className="gd-step-drawer__done">{definitionOfDone}</p>
            {doneChecks.length > 1 ? (
              <ul className="gd-step-drawer__list gd-step-drawer__list--bullets">
                {doneChecks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="gd-step-drawer__block">
            <div className="gd-step-drawer__notes-head">
              <h3>Notes</h3>
              <span>{note.trim().length}/2000</span>
            </div>
            <textarea
              className="gd-step-drawer__note"
              rows={4}
              maxLength={2000}
              value={note}
              placeholder="Blockers, decisions, evidence, or next steps…"
              disabled={busy || !step.taskId}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="gd-step-drawer__note-actions">
              <button
                type="button"
                className="gd-btn gd-btn--ghost"
                disabled={busy || !canSaveNote}
                onClick={() => void runUpdate({ note }, 'Unable to save that note.')}
              >
                {savingNote ? (
                  <>
                    <span className="gd-step-drawer__spinner is-dark" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  'Save note'
                )}
              </button>
            </div>
          </section>

          {localError ? (
            <p className="gd-step-drawer__error" role="alert">
              {localError}
            </p>
          ) : null}
        </div>

        <footer className="gd-step-drawer__footer">
          <button type="button" className="gd-btn gd-btn--ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
          {step.done ? (
            <button
              type="button"
              className="gd-btn gd-btn--ghost gd-step-drawer__action"
              disabled={busy || !step.taskId}
              onClick={() => void runUpdate({ done: false }, 'Unable to reopen that step.')}
            >
              {busy && !canSaveNote ? (
                <span className="gd-step-drawer__spinner is-dark" aria-hidden="true" />
              ) : (
                <FiRotateCcw size={13} aria-hidden="true" />
              )}
              {busy && !canSaveNote ? 'Updating…' : 'Reopen'}
            </button>
          ) : (
            <button
              type="button"
              className="gd-btn gd-btn--primary gd-step-drawer__action"
              disabled={busy || !step.taskId}
              onClick={() => void runUpdate({ done: true }, 'Unable to mark that step done.')}
            >
              {busy && !canSaveNote ? (
                <span className="gd-step-drawer__spinner" aria-hidden="true" />
              ) : (
                <FiCheck size={13} aria-hidden="true" />
              )}
              {busy && !canSaveNote ? 'Updating…' : 'Mark done'}
            </button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
};
