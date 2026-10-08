import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';

const TOTAL_STEPS = 5;

const SERVICE_OPTIONS = ['Web Design', 'Mobile App', 'UI-Kit', 'UX Consulting', 'Other'] as const;

const DURATION_OPTIONS = [
  { label: '1', weeks: 1 },
  { label: '2', weeks: 2 },
  { label: '4', weeks: 4 },
  { label: '6', weeks: 6 },
  { label: '8+', weeks: 8 },
] as const;

const BUDGET_OPTIONS = [
  { label: '$500', value: 500 },
  { label: '$1K', value: 1000 },
  { label: '$2,5K', value: 2500 },
  { label: '$5K', value: 5000 },
  { label: '$10K+', value: 10000 },
] as const;

export type GoalStepsAnswers = {
  projectName: string;
  description: string;
  services: string[];
  durationWeeks: number;
  budget: number;
  email: string;
  phone: string;
};

type GoalStepsModalProps = {
  initialDescription?: string;
  onClose: () => void;
  onComplete: (answers: GoalStepsAnswers) => void;
};

const formatDuration = (weeks: number) => (weeks >= 8 ? '8+ Week' : `${weeks} Week`);

const formatBudget = (value: number) => {
  if (value >= 10000) return '$ 10000+';
  if (value >= 1000) return `$ ${value}`;
  return `$ ${value}`;
};

export const GoalStepsModal = ({ initialDescription = '', onClose, onComplete }: GoalStepsModalProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState(initialDescription);
  const [services, setServices] = useState<string[]>([]);
  const [durationIndex, setDurationIndex] = useState(3);
  const [budgetIndex, setBudgetIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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

  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const durationWeeks = DURATION_OPTIONS[durationIndex].weeks;
  const budget = BUDGET_OPTIONS[budgetIndex].value;

  const canContinue = () => {
    if (step === 0) return projectName.trim().length > 0;
    if (step === 1) return description.trim().length > 0;
    if (step === 2) return services.length > 0;
    if (step === 3) return true;
    if (step === 4) return email.trim().length > 0;
    return false;
  };

  const handleNext = () => {
    if (!canContinue()) return;
    if (step === TOTAL_STEPS - 1) {
      onComplete({
        projectName: projectName.trim(),
        description: description.trim(),
        services,
        durationWeeks,
        budget,
        email: email.trim(),
        phone: phone.trim(),
      });
      return;
    }
    setDirection('forward');
    setStep((current) => current + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    setDirection('back');
    setStep((current) => current - 1);
  };

  const toggleService = (option: string) => {
    setServices((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  };

  const contentClassName = `goal-steps-modal__content is-entering-${direction}`;

  return createPortal(
    <div className="goal-steps-backdrop" role="presentation" onClick={onClose}>
      <div className="goal-steps-stack" role="presentation" onClick={(event) => event.stopPropagation()}>
        <div className="goal-steps-stack__layer goal-steps-stack__layer--back" aria-hidden="true" />
        <div className="goal-steps-stack__layer goal-steps-stack__layer--mid" aria-hidden="true" />

        <div
          ref={dialogRef}
          className="goal-steps-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="goal-steps-modal__top">
            <div className="goal-steps-modal__progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <button type="button" className="goal-steps-modal__close" aria-label="Close" onClick={onClose}>
              <FiX size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div key={step} className={contentClassName}>
            <p className="goal-steps-modal__eyebrow">QUESTION {step + 1}</p>
            <h2 id={titleId} className="goal-steps-modal__title">
              {step === 0 && "What's the name of your project?"}
              {step === 1 && "Can you briefly describe what it's about?"}
              {step === 2 && 'What kind of services are you looking for?'}
              {step === 3 && "How long do you think this will take, and what's your budget?"}
              {step === 4 && 'Where can we reach you?'}
            </h2>

            {step === 0 ? (
              <input
                className="goal-steps-modal__input"
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleNext();
                  }
                }}
              />
            ) : null}

            {step === 1 ? (
              <textarea
                className="goal-steps-modal__textarea"
                rows={5}
                placeholder="Describe your project"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            ) : null}

            {step === 2 ? (
              <div className="goal-steps-options" role="group" aria-label="Services">
                {SERVICE_OPTIONS.map((option) => {
                  const selected = services.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`goal-steps-option${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleService(option)}
                    >
                      <span className="goal-steps-option__check" aria-hidden="true">
                        {selected ? <FiCheck size={12} strokeWidth={3} /> : null}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="goal-steps-sliders">
                <div className="goal-steps-slider">
                  <div className="goal-steps-slider__label">
                    Duration: <strong>{formatDuration(durationWeeks)}</strong>
                  </div>
                  <input
                    className="goal-steps-slider__range"
                    type="range"
                    min={0}
                    max={DURATION_OPTIONS.length - 1}
                    step={1}
                    value={durationIndex}
                    style={
                      {
                        '--progress': `${(durationIndex / (DURATION_OPTIONS.length - 1)) * 100}`,
                      } as CSSProperties
                    }
                    onChange={(event) => setDurationIndex(Number(event.target.value))}
                    aria-label="Duration"
                  />
                  <div className="goal-steps-slider__ticks" aria-hidden="true">
                    {DURATION_OPTIONS.map((option) => (
                      <span key={option.label}>{option.label}</span>
                    ))}
                  </div>
                </div>

                <div className="goal-steps-slider">
                  <div className="goal-steps-slider__label">
                    Budget: <strong>{formatBudget(budget)}</strong>
                  </div>
                  <input
                    className="goal-steps-slider__range"
                    type="range"
                    min={0}
                    max={BUDGET_OPTIONS.length - 1}
                    step={1}
                    value={budgetIndex}
                    style={
                      {
                        '--progress': `${(budgetIndex / (BUDGET_OPTIONS.length - 1)) * 100}`,
                      } as CSSProperties
                    }
                    onChange={(event) => setBudgetIndex(Number(event.target.value))}
                    aria-label="Budget"
                  />
                  <div className="goal-steps-slider__ticks" aria-hidden="true">
                    {BUDGET_OPTIONS.map((option) => (
                      <span key={option.label}>{option.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="goal-steps-contact">
                <label className="goal-steps-contact__field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    placeholder="john.doe@gmail.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label className="goal-steps-contact__field">
                  <span>Phone</span>
                  <div className="goal-steps-phone">
                    <button type="button" className="goal-steps-phone__code" aria-label="Country code">
                      <span aria-hidden="true">🇺🇸</span>
                      <FiChevronDown size={14} aria-hidden="true" />
                    </button>
                    <input
                      type="tel"
                      placeholder="(+1"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </label>
              </div>
            ) : null}
          </div>

          <div className="goal-steps-modal__footer">
            <button
              type="button"
              className="goal-steps-modal__back"
              onClick={handleBack}
              disabled={step === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="goal-steps-modal__next"
              onClick={handleNext}
              disabled={!canContinue()}
            >
              {step === TOTAL_STEPS - 1 ? 'Send' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
