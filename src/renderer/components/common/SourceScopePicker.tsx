import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import { useGetGenerationDatesQuery } from '@/services/homeApi';

import './source-scope.css';

/** Matches the day window used by notes, tasks, and the generation backends. */
export const GENERATION_TIME_ZONE = 'Asia/Kolkata';

const MAX_SELECTED_DAYS = 62;

export type GenerationScope = {
  mode: 'space' | 'date';
  dates: string[];
};

export const generationRequestFields = (scope: GenerationScope) =>
  scope.mode === 'date' && scope.dates.length > 0
    ? { scope: 'date' as const, dates: scope.dates, timeZone: GENERATION_TIME_ZONE }
    : { scope: 'space' as const };

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (value: number) => String(value).padStart(2, '0');

export const dateKeyInGenerationZone = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: GENERATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const monthParts = (dateKey: string) => {
  const [year, month] = dateKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
};

const monthBounds = (year: number, monthIndex: number) => {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return {
    from: `${year}-${pad(monthIndex + 1)}-01`,
    to: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
  };
};

const shiftMonth = (year: number, monthIndex: number, delta: number) => {
  const next = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: next.getUTCFullYear(), monthIndex: next.getUTCMonth() };
};

const formatDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatMonth = (year: number, monthIndex: number) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  );

type SourceScopePickerProps = {
  userId?: string;
  spaceId?: string;
  value: GenerationScope;
  onChange: (value: GenerationScope) => void;
  disabled?: boolean;
  variant?: 'card' | 'plain';
};

export const SourceScopePicker = ({
  userId,
  spaceId,
  value,
  onChange,
  disabled = false,
  variant = 'plain',
}: SourceScopePickerProps) => {
  const today = dateKeyInGenerationZone();
  const initial = monthParts(value.dates[0] || today);
  const [visible, setVisible] = useState(initial);
  const bounds = monthBounds(visible.year, visible.monthIndex);
  const { data } = useGetGenerationDatesQuery(
    { userId: userId || '', spaceId: spaceId || '', from: bounds.from, to: bounds.to },
    { skip: !userId || !spaceId || value.mode !== 'date' },
  );
  const marked = useMemo(() => new Set(data?.dates ?? []), [data?.dates]);
  const selectedDays = useMemo(() => new Set(value.dates), [value.dates]);

  const daysInMonth = new Date(Date.UTC(visible.year, visible.monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = new Date(Date.UTC(visible.year, visible.monthIndex, 1)).getUTCDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const chooseMode = (mode: GenerationScope['mode']) => {
    if (disabled || mode === value.mode) {
      return;
    }
    if (mode === 'space') {
      onChange({ mode: 'space', dates: [] });
      return;
    }
    setVisible(monthParts(value.dates[0] || today));
    onChange({ mode: 'date', dates: value.dates });
  };

  return (
    <div className={`source-scope${variant === 'card' ? ' source-scope--card' : ''}`}>
      <div className="source-scope__modes" role="radiogroup" aria-label="Choose one">
        <button
          type="button"
          role="radio"
          aria-checked={value.mode === 'space'}
          className={`source-scope__mode${value.mode === 'space' ? ' is-selected' : ''}`}
          onClick={() => chooseMode('space')}
          disabled={disabled}
        >
          Whole space
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value.mode === 'date'}
          className={`source-scope__mode${value.mode === 'date' ? ' is-selected' : ''}`}
          onClick={() => chooseMode('date')}
          disabled={disabled}
        >
          Dates
        </button>
      </div>

      <p className="source-scope__hint">
        {value.mode === 'date'
          ? value.dates.length === 0
            ? 'Pick one or more days.'
            : value.dates.length === 1
              ? formatDateKey(value.dates[0])
              : `${value.dates.length} days selected`
          : 'Everything in this space.'}
      </p>

      {value.mode === 'date' ? (
        <div className="source-calendar" role="group" aria-label="Choose days">
          <div className="source-calendar__header">
            <button
              type="button"
              className="source-calendar__nav"
              aria-label="Previous month"
              onClick={() => setVisible((current) => shiftMonth(current.year, current.monthIndex, -1))}
              disabled={disabled}
            >
              <FiChevronLeft size={16} />
            </button>
            <strong>{formatMonth(visible.year, visible.monthIndex)}</strong>
            <button
              type="button"
              className="source-calendar__nav"
              aria-label="Next month"
              onClick={() => setVisible((current) => shiftMonth(current.year, current.monthIndex, 1))}
              disabled={disabled}
            >
              <FiChevronRight size={16} />
            </button>
          </div>
          <div className="source-calendar__weekdays" aria-hidden="true">
            {WEEKDAYS.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="source-calendar__grid">
            {cells.map((day, index) => {
              if (!day) {
                return <span key={`blank-${index}`} className="source-calendar__blank" />;
              }
              const dateKey = `${visible.year}-${pad(visible.monthIndex + 1)}-${pad(day)}`;
              const selected = selectedDays.has(dateKey);
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`source-calendar__day${selected ? ' is-selected' : ''}${
                    marked.has(dateKey) ? ' has-content' : ''
                  }`}
                  aria-pressed={selected}
                  aria-label={
                    dateKey === today ? `${formatDateKey(dateKey)}, today` : formatDateKey(dateKey)
                  }
                  disabled={disabled || (!selected && selectedDays.size >= MAX_SELECTED_DAYS)}
                  onClick={() => {
                    const next = selected
                      ? value.dates.filter((dayKey) => dayKey !== dateKey)
                      : [...value.dates, dateKey].sort();
                    onChange({ mode: 'date', dates: next });
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
