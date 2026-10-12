import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiX } from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useActivateGoalMutation,
  useAnswerGoalMutation,
  useGetGoalSetupQuery,
  useRetryGoalJobMutation,
  useSetGoalSpacesMutation,
  type GoalStep,
} from '@/services/goalsApi';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';

const WAIT_MS = 300000;

const stageCopy = (jobType: string | undefined) => {
  if (jobType === 'baseline') return 'Reading your Space';
  if (jobType === 'plan') return 'Building your expert execution plan';
  return 'Understanding your goal';
};

type GoalStepsModalProps = {
  goalId: string;
  onClose: () => void;
  onActivated: (goalId: string) => void;
};

export const GoalStepsModal = ({ goalId, onClose, onActivated }: GoalStepsModalProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const userId = useAppSelector((state) => state.auth.user?.userId) || '';
  const [timedOut, setTimedOut] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textValue, setTextValue] = useState('');
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([]);
  const [actionError, setActionError] = useState('');
  const [pollMs, setPollMs] = useState(1500);

  const { data, isLoading, isError, error, refetch } = useGetGoalSetupQuery(goalId, {
    pollingInterval: pollMs,
  });
  const spacesQuery = useGetUserSpacesInfiniteQuery(
    { userId, limit: 24 },
    { skip: !userId || data?.goal.latestStep?.control !== 'space_picker' },
  );
  const [answerGoal, answerState] = useAnswerGoalMutation();
  const [setGoalSpaces, spacesState] = useSetGoalSpacesMutation();
  const [activateGoal, activateState] = useActivateGoalMutation();
  const [retryJob, retryState] = useRetryGoalJobMutation();

  const job = data?.job ?? null;
  const step = data?.goal.latestStep ?? null;
  const waiting = Boolean(data) && (job?.status === 'queued' || job?.status === 'running');
  const busy = isLoading || waiting || answerState.isLoading || spacesState.isLoading || activateState.isLoading || retryState.isLoading;

  useEffect(() => {
    if (isError) {
      setPollMs(0);
      return undefined;
    }
    const status = data?.job?.status;
    const active = !data || status === "queued" || status === "running";
    if (!active) {
      setPollMs(0);
      return undefined;
    }
    setPollMs(1500);
    const timer = window.setTimeout(() => setPollMs(4000), 8000);
    return () => window.clearTimeout(timer);
  }, [data, isError]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input, textarea, button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!waiting || !job?.id) {
      setTimedOut(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTimedOut(true), WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [waiting, job?.id]);

  useEffect(() => {
    setSelectedOptions([]);
    setTextValue('');
    setActionError('');
  }, [step?.stepId]);

  const spaces = useMemo(
    () => spacesQuery.data?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesQuery.data],
  );

  const progress = data?.goal.completeness ?? (isLoading ? 8 : 12);
  const failed = job?.status === 'failed' || isError || (job?.status === 'ready' && !step);
  const showWait = (isLoading || waiting) && !failed;
  const slow = Boolean(timedOut && showWait);

  const canContinue = () => {
    if (busy || failed || !step) return false;
    if (step.control === 'space_picker' || step.control === 'confirm_baseline' || step.control === 'plan_review') {
      return true;
    }
    if (step.control === 'single_select') return selectedOptions.length === 1 || textValue.trim().length > 0;
    if (step.control === 'multi_select') return selectedOptions.length > 0 || textValue.trim().length > 0;
    if (step.control === 'number') return textValue.trim().length > 0 && Number.isFinite(Number(textValue));
    return textValue.trim().length > 0;
  };

  const toggleOption = (id: string, control: string) => {
    setSelectedOptions((current) => {
      if (control === 'single_select') return current.includes(id) ? [] : [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const answerValue = (current: GoalStep) => {
    if (current.control === 'multi_select') {
      const labels = current.options.filter((option) => selectedOptions.includes(option.id)).map((option) => option.label);
      if (textValue.trim()) labels.push(textValue.trim());
      return labels;
    }
    if (current.control === 'single_select') {
      const selected = current.options.find((option) => option.id === selectedOptions[0]);
      return textValue.trim() || selected?.label || '';
    }
    if (current.control === 'confirm_baseline') return textValue.trim() || 'Looks right';
    return textValue.trim();
  };

  const handleNext = async () => {
    if (!canContinue() || !step) return;
    setActionError('');
    try {
      if (step.control === 'space_picker') {
        await setGoalSpaces({ goalId, spaceIds: selectedSpaces }).unwrap();
        return;
      }
      if (step.control === 'plan_review') {
        await activateGoal(goalId).unwrap();
        onActivated(goalId);
        return;
      }
      await answerGoal({ goalId, stepId: step.stepId, value: answerValue(step) }).unwrap();
    } catch (submitError) {
      setActionError(getApiErrorMessage(submitError, 'Unable to continue. Try again.'));
    }
  };

  const handleRetry = async () => {
    setTimedOut(false);
    setActionError('');
    if (isError || !job?.id) {
      refetch();
      return;
    }
    try {
      await retryJob({ goalId, jobId: job.id }).unwrap();
    } catch (retryError) {
      setActionError(getApiErrorMessage(retryError, 'Unable to retry this step.'));
    }
  };

  return createPortal(
    <div className="goal-steps-backdrop" role="presentation" onClick={onClose}>
      <div className="goal-steps-stack" role="presentation" onClick={(event) => event.stopPropagation()}>
        <div className="goal-steps-stack__layer goal-steps-stack__layer--back" aria-hidden="true" />
        <div className="goal-steps-stack__layer goal-steps-stack__layer--mid" aria-hidden="true" />
        <div ref={dialogRef} className="goal-steps-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="goal-steps-modal__top">
            <div className="goal-steps-modal__progress" aria-hidden="true">
              <span style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }} />
            </div>
            <button type="button" className="goal-steps-modal__close" aria-label="Close" onClick={onClose}>
              <FiX size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="goal-steps-modal__content">
            <p className="goal-steps-modal__eyebrow">{data?.goal.title || 'Your goal'}</p>
            {showWait ? (
              <div className="goal-steps-wait" aria-live="polite">
                <h2 id={titleId} className="goal-steps-modal__title">
                  {stageCopy(job?.type)}
                </h2>
                <div className="goal-steps-skeleton" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                {slow ? (
                  <p className="goal-steps-note">Still working — expert plans can take a few minutes. Stay on this screen.</p>
                ) : null}
              </div>
            ) : null}

            {!showWait && failed ? (
              <div className="goal-steps-error" role="alert">
                <h2 id={titleId} className="goal-steps-modal__title">
                  This step did not finish
                </h2>
                <p>{job?.error || getApiErrorMessage(error, 'The goal assistant took too long. You can retry.')}</p>
              </div>
            ) : null}

            {!showWait && !failed && step ? (
              <>
                <h2 id={titleId} className="goal-steps-modal__title">
                  {step.prompt}
                </h2>
                {step.control === 'text' ? (
                  <textarea
                    className="goal-steps-modal__textarea"
                    rows={4}
                    value={textValue}
                    placeholder="Your answer"
                    onChange={(event) => setTextValue(event.target.value)}
                  />
                ) : null}
                {step.control === 'number' ? (
                  <input
                    className="goal-steps-modal__input"
                    inputMode="decimal"
                    value={textValue}
                    placeholder="Hours per week"
                    onChange={(event) => setTextValue(event.target.value)}
                  />
                ) : null}
                {step.control === 'single_select' || step.control === 'multi_select' ? (
                  <div className="goal-steps-options" role="group">
                    {step.options.map((option) => {
                      const selected = selectedOptions.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`goal-steps-option${selected ? ' is-selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() => toggleOption(option.id, step.control)}
                        >
                          <span className="goal-steps-option__check" aria-hidden="true">
                            {selected ? <FiCheck size={12} strokeWidth={3} /> : null}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {step.allowFreeText && (step.control === 'single_select' || step.control === 'multi_select') ? (
                  <input
                    className="goal-steps-modal__input goal-steps-modal__other"
                    value={textValue}
                    placeholder="Something else"
                    onChange={(event) => setTextValue(event.target.value)}
                  />
                ) : null}
                {step.control === 'space_picker' ? (
                  <div className="goal-steps-options" role="group" aria-label="Spaces">
                    {spacesQuery.isLoading ? <p className="goal-steps-note">Loading your Spaces…</p> : null}
                    {spacesQuery.isError ? (
                      <p className="goal-steps-note">{getApiErrorMessage(spacesQuery.error, 'Unable to load Spaces.')}</p>
                    ) : null}
                    {!spacesQuery.isLoading && spaces.length === 0 ? (
                      <p className="goal-steps-note">
                        You don’t have a Space yet. You can continue, and the next step will recommend how to organize this goal.
                      </p>
                    ) : null}
                    {spaces.map((space) => {
                      const selected = selectedSpaces.includes(space.id);
                      return (
                        <button
                          key={space.id}
                          type="button"
                          className={`goal-steps-option${selected ? ' is-selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() =>
                            setSelectedSpaces((current) =>
                              current.includes(space.id)
                                ? current.filter((id) => id !== space.id)
                                : [...current, space.id],
                            )
                          }
                        >
                          <span className="goal-steps-option__check" aria-hidden="true">
                            {selected ? <FiCheck size={12} strokeWidth={3} /> : null}
                          </span>
                          <span>{space.name}</span>
                        </button>
                      );
                    })}
                    {spacesQuery.hasNextPage ? (
                      <button type="button" className="goal-steps-modal__back" onClick={() => spacesQuery.fetchNextPage()}>
                        More Spaces
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {step.control === 'confirm_baseline' ? (
                  <div className="goal-steps-findings">
                    {(step.findings ?? []).length > 0 ? (
                      <ul>
                        {(step.findings ?? []).map((finding) => (
                          <li key={`${finding.sourceId}-${finding.text}`}>{finding.text}</li>
                        ))}
                      </ul>
                    ) : null}
                    <textarea
                      className="goal-steps-modal__textarea"
                      rows={3}
                      value={textValue}
                      placeholder="Correct anything that is wrong, or leave this blank"
                      onChange={(event) => setTextValue(event.target.value)}
                    />
                  </div>
                ) : null}
                {step.control === 'plan_review' ? (
                  <div className="goal-steps-expert">
                    {step.mission || step.recommendation ? (
                      <div className="goal-steps-expert__brief">
                        {step.mission ? <p className="goal-steps-expert__mission">{step.mission}</p> : null}
                        {step.recommendation ? <p>{step.recommendation}</p> : null}
                      </div>
                    ) : null}
                    {(step.successDefinition?.metrics ?? []).length > 0 ? (
                      <div className="goal-steps-expert__metrics">
                        {(step.successDefinition?.metrics ?? []).slice(0, 4).map((metric) => (
                          <div key={`${metric.label}-${metric.target}`}>
                            <strong>{metric.target}</strong>
                            <span>{metric.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(step.days ?? []).length > 0 ? (
                      <div className="goal-steps-expert__days">
                        <h3>First execution days</h3>
                        <ol className="goal-steps-plan">
                          {(step.days ?? []).slice(0, 5).map((day) => (
                            <li key={`${day.dayIndex}-${day.title}`}>
                              <strong>{day.title}</strong>
                              <small>{day.dateLabel || `Day ${day.dayIndex ?? ''}`}</small>
                              <span>
                                {(day.tasks ?? [])
                                  .slice(0, 3)
                                  .map((task) => task.text)
                                  .join(' · ')}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <ol className="goal-steps-plan">
                        {(step.milestones ?? []).map((milestone) => (
                          <li key={milestone.title}>
                            <strong>{milestone.title}</strong>
                            <small>{milestone.dueLabel}</small>
                            <span>{milestone.successCriteria.join(' · ')}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {(step.strategies ?? []).length > 0 ? (
                      <div className="goal-steps-expert__strategies">
                        <h3>Strategies</h3>
                        <ul>
                          {(step.strategies ?? []).slice(0, 4).map((strategy) => (
                            <li key={strategy.id || strategy.title}>
                              <strong>{strategy.title}</strong>
                              <span>{strategy.body}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
            {actionError ? <p className="goal-steps-note goal-steps-note--error">{actionError}</p> : null}
          </div>

          <div className="goal-steps-modal__footer">
            <button type="button" className="goal-steps-modal__back" onClick={onClose}>
              Close
            </button>
            {failed ? (
              <button type="button" className="goal-steps-modal__next" onClick={handleRetry} disabled={retryState.isLoading}>
                Retry
              </button>
            ) : (
              <button type="button" className="goal-steps-modal__next" onClick={handleNext} disabled={!canContinue()}>
                {step?.control === 'plan_review' ? 'Approve' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
