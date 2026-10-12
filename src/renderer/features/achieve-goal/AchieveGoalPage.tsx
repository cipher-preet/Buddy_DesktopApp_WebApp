import { useEffect, useRef, useState } from 'react';
import { FiArrowUp, FiGrid, FiMic, FiMoreHorizontal, FiPlus, FiStar } from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useGetGoalQuery,
  useGetGoalsQuery,
  type GoalSummary,
} from '@/services/goalsApi';

import { GoalDetailPage } from './GoalDetailPage';
import { GoalStepsModal } from './GoalStepsModal';

import './achieve-goal.css';

const SUGGESTION_TAGS = [
  'Launch a product',
  'Learn a skill',
  'Ship a project',
  'Grow customers',
  'Build a habit',
  'Finish a course',
] as const;

const WORKSPACE_STATUSES = new Set(['ACTIVE', 'PAUSED', 'COMPLETED']);

const GoalCard = ({
  goal,
  onOpen,
  onDeleted,
}: {
  goal: GoalSummary;
  onOpen: (goalId: string, status: string) => void;
  onDeleted: (goalId: string) => void;
}) => {
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteGoal, deleteState] = useDeleteGoalMutation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleDelete = async () => {
    try {
      await deleteGoal(goal.id).unwrap();
      showToast({ type: 'success', message: 'Goal deleted.' });
      onDeleted(goal.id);
    } catch (error) {
      showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to delete this goal.') });
    }
  };

  return (
    <article className="achieve-goal-goal-card">
      <div className="achieve-goal-goal-card__menu" ref={menuRef}>
        <button
          type="button"
          className="achieve-goal-goal-card__dots"
          aria-label={`Actions for ${goal.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <FiMoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="achieve-goal-goal-card__popover" role="menu">
            <button
              type="button"
              role="menuitem"
              className="achieve-goal-goal-card__delete"
              disabled={deleteState.isLoading}
              onClick={(event) => {
                event.stopPropagation();
                void handleDelete();
              }}
            >
              {deleteState.isLoading ? 'Deleting…' : 'Delete goal'}
            </button>
          </div>
        ) : null}
      </div>
      <button type="button" className="achieve-goal-goal-card__body" onClick={() => onOpen(goal.id, goal.status)}>
        {goal.status !== 'ACTIVE' ? (
          <span className="achieve-goal-goal-card__badge">{goal.status === 'COMPLETED' ? 'Done' : 'In progress'}</span>
        ) : null}
        <span className="achieve-goal-goal-card__icon" aria-hidden="true">
          <FiGrid size={18} strokeWidth={2} />
        </span>
        <strong>{goal.title}</strong>
        <p>{goal.description}</p>
      </button>
    </article>
  );
};

const readGoalId = () => {
  if (typeof window === 'undefined') return null;
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('goal');
};

const writeGoalId = (goalId: string | null) => {
  if (typeof window === 'undefined') return;
  const next = goalId ? `#/achieve-goal?goal=${encodeURIComponent(goalId)}` : '#/achieve-goal';
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
};

export const AchieveGoalPage = () => {
  const userName = useAppSelector((state) => state.auth.user?.name) || 'there';
  const firstName = userName.trim().split(/\s+/)[0] || 'there';
  const [prompt, setPrompt] = useState('');
  const [setupGoalId, setSetupGoalId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [composerError, setComposerError] = useState('');
  const appliedRouteGoal = useRef(false);
  const routeGoalId = useRef(readGoalId());

  const goalsQuery = useGetGoalsQuery();
  const routeGoal = useGetGoalQuery(routeGoalId.current ?? '', { skip: !routeGoalId.current });
  const [createGoal, createState] = useCreateGoalMutation();

  useEffect(() => {
    if (!routeGoal.data || appliedRouteGoal.current) return;
    appliedRouteGoal.current = true;
    if (WORKSPACE_STATUSES.has(routeGoal.data.status)) {
      setSelectedGoalId(routeGoal.data.id);
      return;
    }
    setSetupGoalId(routeGoal.data.id);
  }, [routeGoal.data]);

  const openGoal = (goalId: string, status: string) => {
    writeGoalId(goalId);
    if (WORKSPACE_STATUSES.has(status)) {
      setSelectedGoalId(goalId);
      setSetupGoalId(null);
      return;
    }
    setSetupGoalId(goalId);
    setSelectedGoalId(null);
  };

  const handleSuggestion = (tag: string) => {
    setPrompt((current) => (current.trim() ? `${current.trim()} ${tag}` : tag));
  };

  const handleSubmit = async () => {
    const statement = prompt.trim();
    if (statement.length < 3 || createState.isLoading) return;
    setComposerError('');
    try {
      const result = await createGoal({ statement }).unwrap();
      setPrompt('');
      openGoal(result.goal.id, result.goal.status);
    } catch (error) {
      setComposerError(getApiErrorMessage(error, 'Unable to start this goal.'));
    }
  };

  if (selectedGoalId) {
    return (
      <GoalDetailPage
        goalId={selectedGoalId}
        onBack={() => {
          setSelectedGoalId(null);
          writeGoalId(null);
        }}
      />
    );
  }

  const goals = goalsQuery.data ?? [];

  return (
    <section className="achieve-goal-page" aria-label="Achieve Goal">
      <header className="achieve-goal-hero">
        <h1>Hi {firstName}, what do you want to achieve?</h1>

        <div className="achieve-goal-composer-wrap">
          <div className="achieve-goal-composer">
            <label className="sr-only" htmlFor="achieve-goal-prompt">
              Describe your goal
            </label>
            <textarea
              id="achieve-goal-prompt"
              className="achieve-goal-composer__input"
              rows={3}
              placeholder="Example: I want to become a full-stack developer within 6 months"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />

            <div className="achieve-goal-composer__toolbar">
              <button type="button" className="achieve-goal-icon-btn" aria-label="Add attachment">
                <FiPlus size={18} strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="achieve-goal-composer__toolbar-right">
                <button type="button" className="achieve-goal-icon-btn" aria-label="Voice input">
                  <FiMic size={17} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="achieve-goal-submit"
                  aria-label="Start goal"
                  disabled={prompt.trim().length < 3 || createState.isLoading}
                  onClick={() => void handleSubmit()}
                >
                  <FiArrowUp size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          {composerError ? <p className="achieve-goal-form-error">{composerError}</p> : null}
          {createState.isLoading ? <p className="achieve-goal-form-note">Starting your goal…</p> : null}

          <div className="achieve-goal-modes" role="tablist" aria-label="Goal mode">
            <button type="button" role="tab" aria-selected="true" className="achieve-goal-mode is-active">
              <FiStar size={13} strokeWidth={2} aria-hidden="true" />
              Goal assistant
            </button>
          </div>
        </div>

        <p className="achieve-goal-disclaimer">
          KukuNotes can make mistakes. Please check for accuracy.{' '}
          <button type="button" className="achieve-goal-link">
            See terms
          </button>{' '}
          <button type="button" className="achieve-goal-link">
            Give feedback
          </button>
        </p>

        <div className="achieve-goal-tags" aria-label="Suggested goals">
          {SUGGESTION_TAGS.map((tag) => (
            <button key={tag} type="button" className="achieve-goal-tag" onClick={() => handleSuggestion(tag)}>
              {tag}
            </button>
          ))}
        </div>
      </header>

      <div className="achieve-goal-panel">
        <section className="achieve-goal-section" aria-labelledby="achieve-goal-goals-heading">
          <h2 id="achieve-goal-goals-heading">Goals</h2>
          {goalsQuery.isLoading ? <p className="achieve-goal-form-note">Loading your goals…</p> : null}
          {goalsQuery.isError ? (
            <p className="achieve-goal-form-error">
              {getApiErrorMessage(goalsQuery.error, 'Unable to load goals.')}{' '}
              <button type="button" className="achieve-goal-link" onClick={() => goalsQuery.refetch()}>
                Retry
              </button>
            </p>
          ) : null}
          {!goalsQuery.isLoading && goals.length === 0 ? (
            <p className="achieve-goal-form-note">Goals you start will show up here.</p>
          ) : null}
          <div className="achieve-goal-goals-grid">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onOpen={openGoal}
                onDeleted={(goalId) => {
                  if (setupGoalId === goalId) setSetupGoalId(null);
                }}
              />
            ))}
          </div>
        </section>
      </div>

      {setupGoalId ? (
        <GoalStepsModal
          goalId={setupGoalId}
          onClose={() => setSetupGoalId(null)}
          onActivated={(goalId) => {
            setSetupGoalId(null);
            setSelectedGoalId(goalId);
            writeGoalId(goalId);
          }}
        />
      ) : null}
    </section>
  );
};
