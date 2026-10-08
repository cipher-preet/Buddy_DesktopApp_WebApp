import { useState } from 'react';
import {
  FiArrowUp,
  FiGrid,
  FiMic,
  FiPlus,
  FiStar,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';

import { GoalDetailPage } from './GoalDetailPage';
import { GoalStepsModal, type GoalStepsAnswers } from './GoalStepsModal';

import './achieve-goal.css';

type AgentMode = 'single' | 'multi';

type GoalCard = {
  id: string;
  title: string;
  description: string;
  isNew?: boolean;
};

const SUGGESTION_TAGS = [
  'Customer Support',
  'Receptionist',
  'Lead Generation',
  'Outbound Sales',
  'Rental Service',
  'Inbound qualification',
  'Product Recommendation',
  'Appointment booking',
] as const;

const GOALS: GoalCard[] = [
  {
    id: 'basic',
    title: 'Basic Goal',
    description: 'Start with a basic conversational AI agent and customize it for your business.',
  },
  {
    id: 'customer-service',
    title: 'Customer Service AI',
    description: 'Handle FAQs, tickets, and handoffs with a ready-made support agent flow.',
    isNew: true,
  },
  {
    id: 'lead-generation',
    title: 'Lead Generation AI',
    description: 'Qualify inbound leads, capture details, and route high-intent prospects.',
  },
  {
    id: 'appointment-booking',
    title: 'Appointment Booking',
    description: 'Schedule meetings, confirm availability, and send reminders automatically.',
  },
  {
    id: 'outbound-sales',
    title: 'Outbound Sales',
    description: 'Reach prospects, pitch offers, and book discovery calls at scale.',
    isNew: true,
  },
  {
    id: 'product-recommendation',
    title: 'Product Recommendation',
    description: 'Guide shoppers to the right products based on needs and preferences.',
  },
  {
    id: 'receptionist',
    title: 'Virtual Receptionist',
    description: 'Greet callers, answer common questions, and route requests to the right team.',
  },
  {
    id: 'rental-service',
    title: 'Rental Service',
    description: 'Help customers browse inventory, check availability, and complete rental bookings.',
  },
  {
    id: 'inbound-qualification',
    title: 'Inbound Qualification',
    description: 'Score inbound interest, collect key details, and prioritize hot leads.',
    isNew: true,
  },
];

export const AchieveGoalPage = () => {
  const userName = useAppSelector((state) => state.auth.user?.name) || 'there';
  const firstName = userName.trim().split(/\s+/)[0] || 'there';

  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<AgentMode>('single');
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const handleSuggestion = (tag: string) => {
    setPrompt((current) => (current.trim() ? `${current.trim()} ${tag}` : tag));
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    setIsStepsOpen(true);
  };

  const handleStepsComplete = (_answers: GoalStepsAnswers) => {
    setIsStepsOpen(false);
    setPrompt('');
  };

  if (selectedGoalId) {
    return <GoalDetailPage goalId={selectedGoalId} onBack={() => setSelectedGoalId(null)} />;
  }

  return (
    <section className="achieve-goal-page" aria-label="Achieve Goal">
      <header className="achieve-goal-hero">
        <h1>Hi {firstName}, what do you want to build?</h1>

        <div className="achieve-goal-composer-wrap">
          <div className="achieve-goal-composer">
            <label className="sr-only" htmlFor="achieve-goal-prompt">
              Describe your AI agent
            </label>
            <textarea
              id="achieve-goal-prompt"
              className="achieve-goal-composer__input"
              rows={3}
              placeholder="Describe what this AI Agent is supposed to do - be specific"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
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
                  aria-label="Create agent"
                  disabled={!prompt.trim()}
                  onClick={handleSubmit}
                >
                  <FiArrowUp size={18} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="achieve-goal-modes" role="tablist" aria-label="Agent mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'single'}
              className={`achieve-goal-mode${mode === 'single' ? ' is-active' : ''}`}
              onClick={() => setMode('single')}
            >
              <FiStar size={13} strokeWidth={2} aria-hidden="true" />
              Single - Prompt Assistant
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'multi'}
              className={`achieve-goal-mode${mode === 'multi' ? ' is-active' : ''}`}
              onClick={() => setMode('multi')}
            >
              <FiStar size={13} strokeWidth={2} aria-hidden="true" />
              Multi-Prompt Workflow
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

        <div className="achieve-goal-tags" aria-label="Suggested use cases">
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
          <div className="achieve-goal-goals-grid">
            {GOALS.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className="achieve-goal-goal-card"
                onClick={() => setSelectedGoalId(goal.id)}
              >
                {goal.isNew ? <span className="achieve-goal-goal-card__badge">New</span> : null}
                <span className="achieve-goal-goal-card__icon" aria-hidden="true">
                  <FiGrid size={18} strokeWidth={2} />
                </span>
                <strong>{goal.title}</strong>
                <p>{goal.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {isStepsOpen ? (
        <GoalStepsModal
          initialDescription={prompt.trim()}
          onClose={() => setIsStepsOpen(false)}
          onComplete={handleStepsComplete}
        />
      ) : null}
    </section>
  );
};
