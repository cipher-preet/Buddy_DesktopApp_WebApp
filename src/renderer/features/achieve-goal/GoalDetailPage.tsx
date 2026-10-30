import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiArrowUpRight,
  FiAward,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiCircle,
  FiClock,
  FiFlag,
  FiLayers,
  FiList,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiShare2,
  FiTarget,
  FiTrendingUp,
  FiX,
  FiZap,
} from 'react-icons/fi';

import { useToast } from '@/app/ToastProvider';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useCheckInGoalMutation,
  useGetGoalDashboardQuery,
  useGoalWorkspaceActionMutation,
  usePauseGoalMutation,
  useToggleGoalPlanItemMutation,
  type GoalDashboard,
  type GoalWorkspace,
  type GoalWorkspaceStep,
} from '@/services/goalsApi';

import './goal-workspace.css';

type GoalDetailPageProps = {
  goalId: string;
  onBack: () => void;
};

type Dialog =
  | { kind: 'step'; id: string; celebrate?: boolean }
  | { kind: 'reschedule'; id: string }
  | { kind: 'strategy'; id: string }
  | { kind: 'recommendation'; id: string }
  | { kind: 'log' }
  | { kind: 'shortcuts' }
  | { kind: 'recovery' }
  | { kind: 'command' }
  | null;

const fillChecklist = (step: GoalWorkspaceStep, data: GoalDashboard): GoalWorkspaceStep => {
  if (step.checklist.length > 0) return step;
  const day = (data.days ?? []).find((item) => item.id === step.id || item.dayIndex === step.dayIndex || item.title === step.title);
  const tasks = day?.tasks ?? [];
  if (!tasks.length) return step;
  const checklist = tasks.map((task, index) => ({
    id: task.id || `${step.id}-t-${index + 1}`,
    text: task.text,
    done: Boolean(task.done),
    why: task.why,
    definitionOfDone: task.definitionOfDone,
  }));
  return {
    ...step,
    checklist,
    checklistDone: checklist.filter((item) => item.done).length,
    checklistTotal: checklist.length,
    why: explainLine(step.title, step.why || day?.focus || '', day?.definitionOfDone || checklist.find((item) => item.definitionOfDone)?.definitionOfDone || ''),
    outcome: step.outcome || day?.definitionOfDone || checklist.find((item) => item.definitionOfDone)?.definitionOfDone || '',
    doneWhen: step.doneWhen || day?.definitionOfDone || checklist.map((item) => item.definitionOfDone).filter(Boolean).join(' '),
  };
};

const hydrateWorkspace = (workspace: GoalWorkspace, data: GoalDashboard): GoalWorkspace => ({
  ...workspace,
  todayStep: workspace.todayStep ? fillChecklist(workspace.todayStep, data) : null,
  attention: workspace.attention.map((step) => fillChecklist(step, data)),
  weeks: workspace.weeks.map((week) => ({
    ...week,
    steps: week.steps.map((step) => fillChecklist(step, data)),
  })),
  strategies: workspace.strategies.map((strategy) => ({
    ...strategy,
    overview: explainLine(strategy.title, strategy.overview || '', strategy.body || ''),
  })),
});

const explainLine = (heading: string, current: string, detail: string) => {
  const options = [current, detail].map((item) => item.trim()).filter(Boolean);
  if (options.length) return options.sort((left, right) => right.length - left.length)[0];
  return heading.trim();
};

const modLabel = () => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl');

const deriveWorkspace = (data: GoalDashboard): GoalWorkspace => {
  if (data.workspace) return data.workspace;
  const today = new Date().toISOString().slice(0, 10);
  const days = data.days ?? [];
  const steps: GoalWorkspaceStep[] = days.map((day, index) => {
    const tasks = day.tasks ?? [];
    const done = day.status === 'done' || (tasks.length > 0 && tasks.every((task) => task.done) && day.status !== 'reopened');
    const skipped = day.status === 'skipped';
    return {
      id: day.id || `day-${day.dayIndex || index + 1}`,
      dayIndex: day.dayIndex || index + 1,
      date: day.scheduledDate || today,
      dateLabel: day.dateLabel || `Day ${day.dayIndex || index + 1}`,
      title: day.title,
      category: day.category || day.focus || 'Step',
      minutes: day.minutes || (day.hours ? Math.round(day.hours * 60) : 45),
      status: skipped ? 'skipped' : done ? 'done' : 'open',
      checklist: tasks.map((task, taskIndex) => ({
        id: task.id,
        text: task.text,
        done: Boolean(task.done),
        why: task.why,
        definitionOfDone: task.definitionOfDone,
      })),
      checklistDone: tasks.filter((task) => task.done).length,
      checklistTotal: tasks.length,
      why: explainLine(day.title, day.focus || '', day.definitionOfDone || ''),
      outcome: day.definitionOfDone || '',
      doneWhen: day.definitionOfDone || '',
      notes: day.notes || '',
      partOf: day.category || 'Plan',
      overdueDays: 0,
      example: false,
    };
  });
  const doneCount = steps.filter((step) => step.status === 'done').length;
  return {
    title: data.title,
    status: data.status,
    startedOn: today,
    startedLabel: 'TODAY',
    endsOn: today,
    endsLabel: data.deadlineLabel || data.timeframe || '',
    dayNumber: 1,
    horizonDays: Math.max(steps.length, 1),
    stepsDone: doneCount,
    stepsTotal: steps.length,
    daysLeft: Math.max(steps.length - doneCount, 0),
    progressPercent: steps.length ? Math.round((doneCount / steps.length) * 100) : 0,
    pace: data.healthStatus === 'AT_RISK' ? 'at_risk' : data.status === 'COMPLETED' ? 'achieved' : 'on_track',
    paceLabel: data.status === 'COMPLETED' ? 'Goal achieved' : 'On track to finish',
    achieved: data.status === 'COMPLETED',
    finishedEarlyDays: null,
    today,
    metric: {
      label: 'Progress',
      current: data.outcomeProgress,
      target: 100,
      todayTarget: null,
      lastLogged: data.outcomeProgress,
      lastLoggedOn: null,
      lastLoggedLabel: '',
      streak: 0,
    },
    chart: (data.chart.points ?? []).map((point, index) => ({
      day: index + 1,
      label: point.label,
      date: point.label,
      real: point.actual,
      target: point.target,
    })),
    coach: {
      status: 'ready',
      text: data.immediateNextStep || data.recommendation || 'Your coach note will show here.',
      evidence: (data.evidence ?? []).slice(0, 3).map((item) => ({
        id: item.id,
        label: item.text,
        kind: item.sourceType || 'Evidence',
        dateLabel: '',
      })),
    },
    todayStep: steps.find((step) => step.status !== 'done' && step.status !== 'skipped') ?? null,
    attention: [],
    weeks: steps.length
      ? [{ id: 'week-1', label: 'Week 1', rangeLabel: data.timeframe || 'This plan', flag: '', done: doneCount, total: steps.length, expanded: true, steps }]
      : [],
    strategies: (data.strategies ?? []).map((strategy, index) => ({
      id: strategy.id || `strategy-${index + 1}`,
      title: strategy.title,
      body: strategy.body,
      overview: explainLine(strategy.title, strategy.why || '', strategy.body || ''),
      done: 0,
      total: strategy.proofPoints?.length || 0,
      percent: 0,
      active: true,
      windowLabel: strategy.effort || data.timeframe || '',
      linkedSteps: [],
    })),
    recommendations: (data.recommendations ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      windowLabel: item.measurableGoal || '',
      howSteps: item.howSteps ?? [],
      category: item.milestoneTitle || 'Plan',
      added: false,
      related: [],
    })),
    checkIn: null,
    recovery: null,
  };
};

const Ring = ({ value, tone }: { value: number; tone: 'blue' | 'green' }) => {
  const radius = 28;
  const length = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * length;
  const color = tone === 'green' ? '#16a34a' : '#2f6bff';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#eceef3" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${length - dash}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1c1f26">
        {Math.round(value)}%
      </text>
    </svg>
  );
};

const PaceChart = ({ points }: { points: GoalWorkspace['chart'] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const usable = points.filter((point) => point.target != null || point.real != null);
  const shown = usable.length ? usable : points;
  const max = Math.max(1, ...shown.map((point) => Math.max(point.target ?? 0, point.real ?? 0)));
  const width = 300;
  const height = 140;
  const pad = { l: 8, r: 8, t: 16, b: 22 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const xOf = (index: number) => pad.l + (shown.length <= 1 ? plotW / 2 : (index / (shown.length - 1)) * plotW);
  const yOf = (value: number) => pad.t + plotH - (value / max) * plotH;
  const line = (key: 'real' | 'target') =>
    shown
      .map((point, index) => (point[key] == null ? null : `${index === 0 ? 'M' : 'L'} ${xOf(index)} ${yOf(point[key] as number)}`))
      .filter(Boolean)
      .join(' ');
  const targetLine = line('target');
  const realPoints = shown.map((point, index) => (point.real == null ? null : { x: xOf(index), y: yOf(point.real) })).filter((point): point is { x: number; y: number } => point != null);
  const realLine = realPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = realPoints.length
    ? `${realLine} L ${realPoints[realPoints.length - 1].x} ${pad.t + plotH} L ${realPoints[0].x} ${pad.t + plotH} Z`
    : '';
  const active = hover != null ? shown[hover] : shown.filter((point) => point.real != null).at(-1);
  const activeIndex = active ? shown.indexOf(active) : -1;
  return (
    <div className="gw-chart">
      <div className="gw-legend">
        <span><i className="is-real" /> Real</span>
        <span><i className="is-target" /> Target</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          const index = Math.round(((x - pad.l) / plotW) * Math.max(shown.length - 1, 1));
          setHover(Math.max(0, Math.min(shown.length - 1, index)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} fill="#dbe7ff" opacity="0.7" />
        <path d={targetLine} fill="none" stroke="#b7c0d0" strokeDasharray="4 4" strokeWidth="1.5" />
        <path d={realLine} fill="none" stroke="#2f6bff" strokeWidth="2" />
        {activeIndex >= 0 && shown[activeIndex].real != null ? (
          <circle cx={xOf(activeIndex)} cy={yOf(shown[activeIndex].real as number)} r="4" fill="#2f6bff" />
        ) : null}
      </svg>
      {active ? (
        <div className="gw-tip" style={{ left: `${shown.length <= 1 ? 50 : (activeIndex / Math.max(shown.length - 1, 1)) * 100}%` }}>
          {active.label} · {active.real ?? '—'} real{active.target != null ? ` · ${active.target} target` : ''}
        </div>
      ) : null}
      <div className="gw-chart-foot" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{shown[0]?.label || 'Day 1'}</span>
        <span>{shown[Math.floor(shown.length / 2)]?.label || ''}</span>
        <span>{shown[shown.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
};

export const GoalDetailPage = ({ goalId, onBack }: GoalDetailPageProps) => {
  const { showToast } = useToast();
  const dashboard = useGetGoalDashboardQuery(goalId);
  const [act, actState] = useGoalWorkspaceActionMutation();
  const [toggleItem] = useToggleGoalPlanItemMutation();
  const [checkIn] = useCheckInGoalMutation();
  const [pauseGoal, pauseState] = usePauseGoalMutation();
  const workspace = useMemo(
    () => (dashboard.data ? hydrateWorkspace(deriveWorkspace(dashboard.data), dashboard.data) : null),
    [dashboard.data],
  );
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [closedWeeks, setClosedWeeks] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<Dialog>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gearOpen, setGearOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [logValue, setLogValue] = useState(0);
  const [rescheduleMode, setRescheduleMode] = useState<'move' | 'skip' | 'split'>('move');
  const [noteDraft, setNoteDraft] = useState('');
  const [reflection, setReflection] = useState('');
  const [pickedAdjustments, setPickedAdjustments] = useState<string[]>([]);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ message: string; value: number } | null>(null);
  const mod = modLabel();

  const steps = useMemo(() => workspace?.weeks.flatMap((week) => week.steps) ?? [], [workspace]);
  const visibleSteps = steps.filter((step) => {
    if (filter === 'done') return step.status === 'done';
    if (filter === 'open') return step.status !== 'done' && step.status !== 'skipped';
    return true;
  });

  useEffect(() => {
    if (!workspace) return;
    setLogValue(workspace.metric.current ?? workspace.metric.lastLogged ?? 0);
    setReflection(workspace.checkIn?.reflection || '');
    setPickedAdjustments((workspace.checkIn?.adjustments ?? []).filter((item) => item.selected).map((item) => item.id));
  }, [workspace]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (event.key === 'Escape') {
        setDialog(null);
        setCheckInOpen(false);
        return;
      }
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        setDialog({ kind: 'shortcuts' });
        return;
      }
      if (!visibleSteps.length) return;
      const index = Math.max(0, visibleSteps.findIndex((step) => step.id === selectedId));
      if (event.key.toLowerCase() === 'a') setFilter('all');
      else if (event.key.toLowerCase() === 'o') setFilter('open');
      else if (event.key.toLowerCase() === 'd') setFilter('done');
      else if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedId(visibleSteps[Math.min(visibleSteps.length - 1, index + 1)].id);
      } else if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedId(visibleSteps[Math.max(0, index - 1)].id);
      } else if (event.key === 'Enter' && selectedId) {
        setDialog({ kind: 'step', id: selectedId });
      } else if (event.key.toLowerCase() === 'x' && selectedId) {
        void run({ action: 'complete', stepId: selectedId });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, visibleSteps]);

  const run = async (body: {
    action: 'complete' | 'reopen' | 'note' | 'reschedule' | 'apply_recommendation' | 'apply_checkin';
    stepId?: string;
    date?: string;
    note?: string;
    mode?: string;
    recommendationId?: string;
    adjustmentIds?: string[];
    reflection?: string;
  }) => {
    try {
      await act({ goalId, ...body }).unwrap();
      return true;
    } catch (error) {
      showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to update this goal.') });
      return false;
    }
  };

  if (dashboard.isLoading && !workspace) {
    return <section className="gw-page" aria-busy="true"><p style={{ padding: 28 }}>Loading this goal…</p></section>;
  }
  if (dashboard.isError && !workspace) {
    return (
      <section className="gw-page">
        <p style={{ padding: 28 }}>{getApiErrorMessage(dashboard.error, 'Unable to load this goal.')}</p>
        <button type="button" className="gw-btn" onClick={() => void dashboard.refetch()}>Retry</button>
      </section>
    );
  }
  if (!workspace) return null;

  const stepById = (id: string | undefined) => steps.find((step) => step.id === id) ?? null;
  const openStep = workspace.todayStep;
  const achieved = workspace.achieved || workspace.pace === 'achieved';

  const saveLog = async () => {
    const previous = workspace.metric.current ?? workspace.metric.lastLogged ?? 0;
    try {
      await checkIn({ goalId, value: logValue }).unwrap();
      setDialog(null);
      setUndo({ message: `${workspace.metric.label} updated to ${logValue}`, value: previous });
    } catch (error) {
      showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to log that number.') });
    }
  };

  return (
    <section className="gw-page" aria-label={`${workspace.title} goal`}>
      <header className="gw-top">
        <nav className="gw-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>Goals</button>
          <FiChevronRight size={14} aria-hidden="true" />
          <strong>{checkInOpen ? 'Weekly check-in' : workspace.title}</strong>
        </nav>
        {checkInOpen ? (
          <div className="gw-top-actions">
            <button type="button" className="gw-btn" onClick={() => setCheckInOpen(false)}>Back to goal</button>
            <button
              type="button"
              className="gw-btn gw-btn--primary"
              disabled={actState.isLoading}
              onClick={() => {
                void run({ action: 'apply_checkin', adjustmentIds: pickedAdjustments, reflection }).then((ok) => {
                  if (ok) {
                    showToast({ type: 'success', message: `Applied ${pickedAdjustments.length} change${pickedAdjustments.length === 1 ? '' : 's'}.` });
                    setCheckInOpen(false);
                  }
                });
              }}
            >
              Apply {pickedAdjustments.length} change{pickedAdjustments.length === 1 ? '' : 's'}
            </button>
          </div>
        ) : (
          <div className="gw-top-actions">
              <div className="gw-gear">
                <button type="button" className="gw-btn gw-icon-btn" aria-label="Goal settings" onClick={() => setGearOpen((open) => !open)}>
                  <FiSettings size={16} />
                </button>
                {gearOpen ? (
                  <div className="gw-menu">
                    <button
                      type="button"
                      disabled={pauseState.isLoading}
                      onClick={() => {
                        setGearOpen(false);
                        void pauseGoal(goalId).unwrap().then(() => showToast({ type: 'success', message: workspace.status === 'PAUSED' ? 'Goal resumed.' : 'Goal paused.' })).catch((error) => {
                          showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to update this goal.') });
                        });
                      }}
                    >
                      {workspace.status === 'PAUSED' ? 'Resume goal' : 'Pause goal'}
                    </button>
                  </div>
                ) : null}
              </div>
          </div>
        )}
      </header>

      <div className="gw-scroll">
        {checkInOpen ? (
          <CheckInView
            workspace={workspace}
            reflection={reflection}
            onReflection={setReflection}
            picked={pickedAdjustments}
            onToggle={(id) => setPickedAdjustments((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}
          />
        ) : (
          <div className="gw-layout">
            <div>
              <p className="gw-kicker">GOAL · STARTED {workspace.startedLabel} · {workspace.stepsDone} OF {workspace.stepsTotal} STEPS</p>
              <h1 className="gw-title">{workspace.title}</h1>

              {achieved ? (
                <div className="gw-achieved">
                  <div className="gw-confetti" aria-hidden="true">
                    {['#2f6bff', '#16a34a', '#e25b2a', '#8b5cf6', '#f5b942'].map((color, index) => (
                      <i key={color} style={{ left: `${12 + index * 16}%`, background: color, transform: `rotate(${index * 18}deg)` }} />
                    ))}
                  </div>
                  <div className="gw-trophy" aria-hidden="true"><FiAward size={26} strokeWidth={1.75} /></div>
                  <h2>Goal achieved</h2>
                  <p>{workspace.stepsDone} of {workspace.stepsTotal} steps done{workspace.finishedEarlyDays ? ` · finished ${workspace.finishedEarlyDays} days early` : ''}.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="gw-btn"
                      onClick={() => {
                        void navigator.clipboard?.writeText(`${workspace.title}\n${workspace.stepsDone}/${workspace.stepsTotal} steps · ${workspace.metric.current ?? '—'}/${workspace.metric.target ?? '—'} ${workspace.metric.label}`);
                        showToast({ type: 'success', message: 'Recap copied.' });
                      }}
                    >
                      <FiShare2 size={15} aria-hidden="true" /> Share recap
                    </button>
                    <button type="button" className="gw-btn gw-btn--primary" onClick={onBack}>
                      Set your next goal <FiArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                  {workspace.coach.text ? <p className="gw-coach" style={{ justifyContent: 'center' }}>{workspace.coach.text}</p> : null}
                </div>
              ) : openStep ? (
                <article className="gw-today">
                  <div className="gw-today__row">
                    <div className="gw-daybadge">{openStep.dayIndex}</div>
                    <div className="gw-today__main">
                      <p className="gw-today__label">TODAY’S STEP</p>
                      <h2>
                        {openStep.title}
                        {openStep.example ? <span className="gw-chip">example</span> : null}
                      </h2>
                      <div className="gw-meta">
                        <span><FiClock size={13} aria-hidden="true" />~{openStep.minutes} min</span>
                        <span><FiList size={13} aria-hidden="true" />{openStep.checklistDone}/{openStep.checklistTotal || 0}</span>
                      </div>
                    </div>
                    <div className="gw-today__actions">
                      <button type="button" className="gw-btn gw-btn--primary" onClick={() => { setNoteDraft(openStep.notes || ''); setDialog({ kind: 'step', id: openStep.id }); }}>
                        Open step <FiArrowUpRight size={14} aria-hidden="true" />
                      </button>
                      <button type="button" className="gw-btn" disabled={actState.isLoading} onClick={() => void run({ action: 'complete', stepId: openStep.id })}>
                        <FiCheck size={14} aria-hidden="true" /> Mark done
                      </button>
                    </div>
                  </div>
                  {workspace.coach.status === 'thinking' ? (
                    <div className="gw-coach" aria-live="polite">
                      <div style={{ flex: 1 }}>
                        <p>Coach is reading the latest meetings…</p>
                        <div className="gw-skeleton" />
                        <div className="gw-skeleton" />
                      </div>
                    </div>
                  ) : (
                    <div className="gw-coach"><FiZap size={15} aria-hidden="true" /><p>{workspace.coach.text}</p></div>
                  )}
                </article>
              ) : (
                <article className="gw-empty">
                  <h3>{workspace.stepsTotal === 0 ? 'No steps yet' : 'No open step'}</h3>
                  <p>
                    {workspace.stepsTotal === 0
                      ? 'This plan does not have any steps yet. Go back and generate the plan again.'
                      : 'Every planned step is done or skipped.'}
                  </p>
                </article>
              )}

              <div className="gw-timeline-head">
                <h2>Timeline <span>{workspace.stepsDone}/{workspace.stepsTotal}</span></h2>
                <div className="gw-filters" role="tablist" aria-label="Filter steps">
                  {(['all', 'open', 'done'] as const).map((item) => (
                    <button key={item} type="button" className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>
                      {item[0].toUpperCase() + item.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {filter === 'done' && visibleSteps.length === 0 ? (
                <div className="gw-empty">
                  <div className="gw-empty__icon" aria-hidden="true"><FiTarget size={18} /></div>
                  <h3>No finished steps yet</h3>
                  <p>Your completed steps will stack up here, week by week.{openStep ? ` Day ${openStep.dayIndex} takes about ${openStep.minutes} minutes.` : ''}</p>
                  {openStep ? <button type="button" className="gw-btn gw-btn--primary" onClick={() => setDialog({ kind: 'step', id: openStep.id })}>Start Day {openStep.dayIndex}</button> : null}
                </div>
              ) : (
                <>
                  {workspace.attention.length && filter !== 'done' ? (
                    <section className="gw-attention">
                      <div className="gw-attention__head">
                        <span><FiAlertCircle size={15} aria-hidden="true" /> Needs attention</span>
                        <button type="button" className="gw-btn" onClick={() => setDialog({ kind: 'recovery' })}>
                          <FiRefreshCw size={14} aria-hidden="true" /> Reschedule with AI
                        </button>
                      </div>
                      {workspace.attention.map((step) => (
                        <div key={step.id} className="gw-attention__row">
                          <button type="button" className="gw-step-open" onClick={() => setDialog({ kind: 'step', id: step.id })}>
                            <span className="gw-mark is-overdue" />
                            <span>
                              <strong>{step.dayIndex}. {step.title}</strong>
                              <small style={{ display: 'block', color: '#8b919e' }}>{step.checklistDone}/{step.checklistTotal}</small>
                            </span>
                          </button>
                          <button type="button" className="gw-overdue gw-linkish" onClick={() => { setRescheduleMode('move'); setDialog({ kind: 'reschedule', id: step.id }); }}>
                            Overdue {step.overdueDays}d
                          </button>
                        </div>
                      ))}
                    </section>
                  ) : null}
                  {workspace.weeks.map((week) => {
                    const weekSteps = week.steps.filter((step) => visibleSteps.some((item) => item.id === step.id));
                    if (!weekSteps.length) return null;
                    const collapsed = closedWeeks[week.id] ?? !week.expanded;
                    return (
                      <section key={week.id} className="gw-week">
                        <button type="button" className="gw-week__head" onClick={() => setClosedWeeks((current) => ({ ...current, [week.id]: !collapsed }))}>
                          {collapsed ? <FiChevronRight size={16} aria-hidden="true" /> : <FiChevronDown size={16} aria-hidden="true" />}
                          <strong>{week.label}</strong>
                          <span>{week.rangeLabel}</span>
                          {week.flag ? <span className={`gw-flag${week.flag === 'This week' ? ' is-week' : ''}${week.flag === 'Complete' ? ' is-done' : ''}`}>{week.flag}</span> : null}
                          <span className="gw-week__count">{week.done}/{week.total}</span>
                        </button>
                        {collapsed ? null : weekSteps.map((step) => (
                          <div key={step.id} className={`gw-step${step.id === openStep?.id ? ' is-today' : ''}${step.id === selectedId ? ' is-selected' : ''}`} onMouseLeave={() => setEditingDateId(null)}>
                            <button type="button" className="gw-step__hit" onClick={() => { setSelectedId(step.id); setNoteDraft(step.notes || ''); setDialog({ kind: 'step', id: step.id }); }}>
                              <span className={`gw-mark${step.status === 'done' ? ' is-done' : ''}${step.id === openStep?.id ? ' is-today' : ''}${step.status === 'overdue' ? ' is-overdue' : ''}`}>
                                {step.status === 'done' ? <FiCheck size={11} strokeWidth={3} aria-hidden="true" /> : null}
                              </span>
                              <span className="gw-step-copy">
                                <strong>
                                  <span>{step.dayIndex}</span>
                                  {step.title}
                                  {step.example ? <span className="gw-chip">example</span> : null}
                                </strong>
                                <small>{step.checklistTotal ? `${step.checklistDone}/${step.checklistTotal}` : step.dateLabel}</small>
                              </span>
                            </button>
                            {editingDateId === step.id ? (
                              <form className="gw-date-edit" onSubmit={(event) => {
                                event.preventDefault();
                                const date = new FormData(event.currentTarget).get('date');
                                if (typeof date === 'string') void run({ action: 'reschedule', stepId: step.id, mode: 'move', date });
                                setEditingDateId(null);
                              }}>
                                <input name="date" type="date" defaultValue={step.date} aria-label={`Move ${step.title}`} />
                                <button type="submit" className="gw-btn" style={{ height: 28 }}>Save</button>
                              </form>
                            ) : (
                              <button type="button" className={`gw-when${step.date === workspace.today ? ' is-today' : ''}`} onClick={() => setEditingDateId(step.id)}>
                                <FiCalendar size={13} aria-hidden="true" />
                                {step.date === workspace.today ? 'Today' : step.dateLabel}
                              </button>
                            )}
                          </div>
                        ))}
                      </section>
                    );
                  })}
                </>
              )}
            </div>

            <aside className="gw-side">
                <section className="gw-card">
                  <div className="gw-progress">
                    <Ring value={workspace.progressPercent} tone={achieved ? 'green' : 'blue'} />
                    <div>
                      <strong>{achieved ? 'Goal achieved' : `${workspace.daysLeft} days left`}</strong>
                      <small>{achieved ? `Ends ${workspace.endsLabel}` : `Ends ${workspace.endsLabel} · ${workspace.paceLabel.toLowerCase()}`}</small>
                    </div>
                  </div>
                  <div className="gw-stats">
                    <div className="gw-stat"><b>{workspace.stepsDone}/{workspace.stepsTotal}</b><small>Steps</small></div>
                    <div className="gw-stat"><b>{workspace.metric.current ?? 0}/{workspace.metric.target ?? '—'}</b><small>{workspace.metric.label}</small></div>
                    <div className="gw-stat"><b>{workspace.metric.streak}</b><small>Day streak</small></div>
                  </div>
                </section>
                <section className="gw-card">
                  <p className="gw-side-label"><FiTrendingUp size={13} aria-hidden="true" /> REAL VS TARGETED</p>
                  <PaceChart points={workspace.chart} />
                  <button type="button" className="gw-log" onClick={() => { setLogValue(workspace.metric.current ?? 0); setDialog({ kind: 'log' }); }}>
                    <FiPlus size={14} aria-hidden="true" /> Log {workspace.metric.label.toLowerCase()} today
                  </button>
                </section>
                <section className="gw-card">
                  <p className="gw-side-label"><FiLayers size={13} aria-hidden="true" /> STRATEGIES · {workspace.strategies.length}</p>
                  {workspace.strategies.map((strategy) => (
                    <button key={strategy.id} type="button" className="gw-strategy" onClick={() => setDialog({ kind: 'strategy', id: strategy.id })}>
                      <span style={{ flex: 1 }}>
                        <strong>{strategy.title}</strong>
                        <div className="gw-bar"><span style={{ width: `${strategy.percent}%` }} /></div>
                      </span>
                      <small>{strategy.done}/{strategy.total}</small>
                    </button>
                  ))}
                </section>
                <section className="gw-card">
                  <p className="gw-side-label"><FiFlag size={13} aria-hidden="true" /> RECOMMENDATIONS · {workspace.recommendations.length}</p>
                  {workspace.recommendations.map((item) => (
                    <button key={item.id} type="button" className="gw-rec" onClick={() => setDialog({ kind: 'recommendation', id: item.id })}>
                      <span style={{ flex: 1 }}><strong>{item.title}</strong></span>
                    </button>
                  ))}
                </section>
              </aside>
          </div>
        )}
      </div>

      {dialog?.kind === 'shortcuts' ? (
        <Modal title="Keyboard shortcuts" onClose={() => setDialog(null)}>
          <div className="gw-shortcuts">
            {[
              ['Move down / up the timeline', 'J K'],
              ['Open selected step', '↵'],
              ['Quick-complete selected', 'X'],
              ['Next / previous step in modal', 'J K'],
              ['Tick checklist item', '1–9'],
              ['Mark step done', `${mod} ↵`],
              ['Filter All / Open / Done', 'A O D'],
              ['Close anything', 'Esc'],
              ['Show this sheet', '?'],
            ].map(([label, keys]) => (
              <div key={label}><span>{label}</span><span className="gw-kbd">{keys}</span></div>
            ))}
          </div>
        </Modal>
      ) : null}

      {dialog?.kind === 'log' ? (
        <Modal
          title="Log progress"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="gw-btn" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="gw-btn gw-btn--primary" onClick={() => void saveLog()}>Save</button>
            </>
          }
        >
          <h2>How many {workspace.metric.label.toLowerCase()} today?</h2>
          <p className="gw-lead">Last logged: {workspace.metric.lastLogged ?? '—'}{workspace.metric.lastLoggedLabel ? ` on ${workspace.metric.lastLoggedLabel}` : ''}. Target today: {workspace.metric.todayTarget ?? '—'}.</p>
          <div className="gw-stepper">
            <button type="button" onClick={() => setLogValue((value) => Math.max(0, value - 1))} aria-label="Decrease"><FiMinus size={16} /></button>
            <strong>{logValue}</strong>
            <button type="button" onClick={() => setLogValue((value) => value + 1)} aria-label="Increase"><FiPlus size={16} /></button>
            <span>of {workspace.metric.target ?? '—'} {workspace.metric.label.toLowerCase()}</span>
          </div>
          <p className="gw-lead">Updates the real-vs-target chart.</p>
        </Modal>
      ) : null}

      {dialog?.kind === 'step' ? (
        <StepDialog
          workspace={workspace}
          step={stepById(dialog.id)}
          celebrate={Boolean(dialog.celebrate) || (stepById(dialog.id)?.status === 'done' && stepById(dialog.id)?.checklistTotal === stepById(dialog.id)?.checklistDone && (stepById(dialog.id)?.checklistTotal ?? 0) > 0)}
          note={noteDraft || stepById(dialog.id)?.notes || ''}
          onNote={setNoteDraft}
          busy={actState.isLoading}
          onClose={() => setDialog(null)}
          onTick={(itemId, done) => {
            void toggleItem({ goalId, kind: 'day_task', itemId, done }).unwrap().catch((error) => {
              showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to update that task.') });
            });
          }}
          onDone={() => {
            const step = stepById(dialog.id);
            void run({ action: 'complete', stepId: dialog.id }).then((ok) => {
              if (ok && step) setDialog({ kind: 'step', id: step.id, celebrate: true });
            });
          }}
          onReopen={() => void run({ action: 'reopen', stepId: dialog.id })}
          onReschedule={stepById(dialog.id)?.status === 'overdue' ? () => { setRescheduleMode('split'); setDialog({ kind: 'reschedule', id: dialog.id }); } : undefined}
          onSaveNote={() => {
            const step = stepById(dialog.id);
            if (!step) return;
            void run({ action: 'note', stepId: step.id, note: noteDraft || step.notes });
          }}
          onNext={() => {
            const index = steps.findIndex((step) => step.id === dialog.id);
            const next = steps[index + 1];
            if (next) setDialog({ kind: 'step', id: next.id });
          }}
        />
      ) : null}

      {dialog?.kind === 'reschedule' ? (
        <Modal
          kicker={`Reschedule · Day ${stepById(dialog.id)?.dayIndex ?? ''}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="gw-btn" onClick={() => setDialog(null)}>Cancel</button>
              <button
                type="button"
                className="gw-btn gw-btn--primary"
                disabled={actState.isLoading}
                onClick={() => {
                  void run({ action: 'reschedule', stepId: dialog.id, mode: rescheduleMode, date: rescheduleMode === 'move' ? undefined : undefined }).then((ok) => {
                    if (ok) setDialog(null);
                  });
                }}
              >
                {rescheduleMode === 'skip' ? 'Skip it' : rescheduleMode === 'split' ? 'Split step' : 'Move to tomorrow'}
              </button>
            </>
          }
        >
          <p className="gw-lead" style={{ color: '#e25b2a' }}>Overdue · was due {stepById(dialog.id)?.dateLabel}</p>
          <h2>{stepById(dialog.id)?.title}</h2>
          <p className="gw-lead">Pick what to do with this step. The rest of the plan adjusts.</p>
          {([
            ['move', 'Move to tomorrow', 'Your calendar shifts this step to the next day.'],
            ['skip', 'Skip it', 'Mark as skipped; the plan stays as is.'],
            ['split', 'Split into 2 steps', 'AI suggests a draft today and the rest two days later.'],
          ] as const).map(([id, title, detail]) => (
            <button key={id} type="button" className={`gw-choice${rescheduleMode === id ? ' is-on' : ''}`} onClick={() => setRescheduleMode(id)}>
              <span><strong>{title}</strong><small>{detail}</small></span>
            </button>
          ))}
        </Modal>
      ) : null}

      {dialog?.kind === 'recovery' && workspace.recovery ? (
        <Modal
          kicker="Recovery plan"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="gw-btn" onClick={() => setDialog(null)}>Not now</button>
              <button
                type="button"
                className="gw-btn gw-btn--primary"
                disabled={actState.isLoading}
                onClick={() => {
                  void run({ action: 'apply_checkin', adjustmentIds: workspace.recovery?.actions.map((item) => item.id) ?? [] }).then((ok) => {
                    if (ok) {
                      showToast({ type: 'success', message: 'Recovery plan applied.' });
                      setDialog(null);
                    }
                  });
                }}
              >
                Apply recovery plan
              </button>
            </>
          }
        >
          <p className="gw-lead" style={{ color: '#e25b2a' }}>{workspace.recovery.riskLabel}</p>
          <h2>{workspace.recovery.title}</h2>
          <p className="gw-lead">{workspace.recovery.summary}</p>
          {workspace.recovery.actions.map((action) => (
            <div key={action.id} className="gw-choice">
              <span><strong>{action.title}</strong>{action.example ? <span className="gw-chip">example</span> : null}<small>{action.detail}</small></span>
            </div>
          ))}
          <p className="gw-lead">{workspace.recovery.projection}</p>
        </Modal>
      ) : null}

      {dialog?.kind === 'strategy' ? (
        <StrategyDialog
          item={workspace.strategies.find((item) => item.id === dialog.id) ?? null}
          onClose={() => setDialog(null)}
          onOpenStep={(id) => setDialog({ kind: 'step', id })}
        />
      ) : null}

      {dialog?.kind === 'recommendation' ? (
        <Modal
          kicker="Recommendations"
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="gw-btn" onClick={() => setDialog(null)}>Not for me</button>
              <button
                type="button"
                className="gw-btn gw-btn--primary"
                disabled={actState.isLoading || workspace.recommendations.find((item) => item.id === dialog.id)?.added}
                onClick={() => {
                  const item = workspace.recommendations.find((entry) => entry.id === dialog.id);
                  void run({ action: 'apply_recommendation', recommendationId: dialog.id }).then((ok) => {
                    if (ok) {
                      showToast({ type: 'success', message: `Added to your plan · ${Math.max(item?.howSteps.length || 1, 1)} steps` });
                      setDialog(null);
                    }
                  });
                }}
              >
                Add to my plan
              </button>
            </>
          }
        >
          {(() => {
            const item = workspace.recommendations.find((entry) => entry.id === dialog.id);
            if (!item) return null;
            return (
              <>
                <h2>{item.title}</h2>
                {item.reason ? <p className="gw-lead">{item.reason}</p> : null}
                {item.howSteps.length ? (
                  <>
                    <div className="gw-section-label"><span>HOW TO USE THIS</span></div>
                    <ol className="gw-steps-detail">
                      {item.howSteps.map((step, index) => <li key={step}><span>{index + 1}.</span> {step}</li>)}
                    </ol>
                  </>
                ) : null}
                {item.related.length ? (
                  <>
                    <div className="gw-section-label"><span>RELATED STEPS</span></div>
                    {item.related.map((step) => (
                      <button key={step.id} type="button" className="gw-choice" onClick={() => setDialog({ kind: 'step', id: step.id })}>
                        <span><strong>{step.done ? <FiCheck size={14} aria-hidden="true" /> : <FiCircle size={14} aria-hidden="true" />} {step.label}</strong></span>
                      </button>
                    ))}
                  </>
                ) : null}
              </>
            );
          })()}
        </Modal>
      ) : null}

      {dialog?.kind === 'command' ? (
        <div className="gw-modal-back" onMouseDown={() => setDialog(null)}>
          <div className="gw-command" onMouseDown={(event) => event.stopPropagation()}>
            <input autoFocus placeholder="Jump to a step, strategy, or recommendation" value={query} onChange={(event) => setQuery(event.target.value)} />
            <CommandResults
              workspace={workspace}
              query={query}
              onPick={(kind, id) => setDialog(kind === 'step' ? { kind: 'step', id } : kind === 'strategy' ? { kind: 'strategy', id } : { kind: 'recommendation', id })}
            />
          </div>
        </div>
      ) : null}

      {undo ? (
        <div className="gw-toast" role="status">
          <FiCheck aria-hidden="true" />
          <span>{undo.message}</span>
          <button
            type="button"
            onClick={() => {
              void checkIn({ goalId, value: undo.value }).unwrap().then(() => setUndo(null)).catch((error) => {
                showToast({ type: 'error', message: getApiErrorMessage(error, 'Unable to undo that update.') });
              });
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
    </section>
  );
};

const usefulLine = (value: string, title: string) => {
  const text = value.trim();
  if (!text || text.toLowerCase() === title.trim().toLowerCase()) return '';
  return text;
};

const Modal = ({
  title,
  kicker,
  onClose,
  footer,
  children,
}: {
  title?: string;
  kicker?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) => (
  <div className="gw-modal-back" onMouseDown={onClose}>
    <div className="gw-modal" role="dialog" aria-modal="true" aria-label={title || kicker || 'Dialog'} onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <span>{kicker || title}</span>
        <button type="button" className="gw-close" onClick={onClose} aria-label="Close"><FiX size={18} /></button>
      </header>
      <div className="gw-body">{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </div>
  </div>
);

const StepDialog = ({
  workspace,
  step,
  celebrate,
  note,
  onNote,
  busy,
  onClose,
  onTick,
  onDone,
  onReopen,
  onReschedule,
  onSaveNote,
  onNext,
}: {
  workspace: GoalWorkspace;
  step: GoalWorkspaceStep | null;
  celebrate: boolean;
  note: string;
  onNote: (value: string) => void;
  busy: boolean;
  onClose: () => void;
  onTick: (itemId: string, done: boolean) => void;
  onDone: () => void;
  onReopen: () => void;
  onReschedule?: () => void;
  onSaveNote: () => void;
  onNext: () => void;
}) => {
  if (!step) return null;
  const outcome = usefulLine(step.outcome || step.doneWhen || '', step.title);
  const when = step.date === workspace.today ? `Today · ${step.dateLabel}` : step.dateLabel;
  return (
    <Modal
      kicker={`Step ${step.dayIndex} of ${workspace.stepsTotal}`}
      onClose={onClose}
      footer={
        celebrate ? (
          <>
            <button type="button" className="gw-btn" onClick={onReopen}>Reopen</button>
            <button type="button" className="gw-btn gw-btn--primary" onClick={onNext}>Up next</button>
          </>
        ) : (
          <>
            <button type="button" className="gw-btn" onClick={onClose}>Close</button>
            <button type="button" className="gw-btn gw-btn--primary" disabled={busy} onClick={onDone}><FiCheck size={14} aria-hidden="true" /> Mark done</button>
          </>
        )
      }
    >
      {celebrate ? (
        <div className="gw-done-banner">
          <div className="gw-trophy" aria-hidden="true"><FiCheckCircle size={28} strokeWidth={1.75} /></div>
          <h2>Day {step.dayIndex} done.</h2>
          <p className="gw-lead">{step.title}</p>
        </div>
      ) : (
        <>
          <div className="gw-step-date">
            <p>{when}</p>
            {onReschedule ? (
              <button type="button" className="gw-linkish" onClick={onReschedule}>
                <FiCalendar size={14} aria-hidden="true" /> Reschedule
              </button>
            ) : null}
          </div>
          <h2>{step.title}</h2>
          {outcome ? <p className="gw-lead">{outcome}</p> : null}
        </>
      )}
      {step.checklist.length ? (
        <div className="gw-check-block">
          <div className="gw-check-head">
            <span>Checklist</span>
            <span>{step.checklistDone} of {step.checklistTotal}</span>
          </div>
          {step.checklist.map((item) => (
            <label key={item.id} className={`gw-check${item.done ? ' is-on' : ''}`}>
              <input type="checkbox" checked={item.done} onChange={(event) => onTick(item.id, event.target.checked)} />
              <span className="gw-check__copy">
                <span>{item.text}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <label className="gw-notes-label" htmlFor={`step-note-${step.id}`}>Notes</label>
      <textarea id={`step-note-${step.id}`} className="gw-notes" value={note} placeholder="Add a note" onChange={(event) => onNote(event.target.value)} onBlur={onSaveNote} />
    </Modal>
  );
};

const StrategyDialog = ({
  item,
  onClose,
  onOpenStep,
}: {
  item: GoalWorkspace['strategies'][number] | null;
  onClose: () => void;
  onOpenStep: (id: string) => void;
}) => {
  if (!item) return null;
  return (
    <Modal kicker="Strategy" onClose={onClose} footer={<button type="button" className="gw-btn" onClick={onClose}>Close</button>}>
      <h2>{item.title}</h2>
      {usefulLine(item.overview || '', item.title) ? <p className="gw-lead">{usefulLine(item.overview || '', item.title)}</p> : null}
      {item.linkedSteps.length ? (
        <>
          <div className="gw-section-label"><span>Linked steps</span></div>
          {item.linkedSteps.map((step) => (
            <button key={step.id} type="button" className="gw-choice" onClick={() => onOpenStep(step.id)}>
              <span><strong>{step.done ? <FiCheck size={14} aria-hidden="true" /> : <FiCircle size={14} aria-hidden="true" />} {step.title}</strong><small>{step.dayLabel}</small></span>
            </button>
          ))}
        </>
      ) : null}
    </Modal>
  );
};

const CheckInView = ({
  workspace,
  reflection,
  onReflection,
  picked,
  onToggle,
}: {
  workspace: GoalWorkspace;
  reflection: string;
  onReflection: (value: string) => void;
  picked: string[];
  onToggle: (id: string) => void;
}) => {
  const checkIn = workspace.checkIn;
  return (
    <div className="gw-checkin">
      <div>
        <p className="gw-kicker">{checkIn?.weekLabel || 'THIS WEEK'} · CHECK-IN</p>
        <h1 className="gw-title">{checkIn?.headline || 'Weekly check-in'}</h1>
        <div className="gw-metrics">
          <article><small>Steps</small><strong>{checkIn?.stepsDone ?? workspace.stepsDone}/{checkIn?.stepsTotal ?? workspace.stepsTotal}</strong></article>
          <article><small>{workspace.metric.label} vs target</small><strong>{checkIn?.usersCurrent ?? workspace.metric.current ?? 0}/{checkIn?.usersTarget ?? workspace.metric.todayTarget ?? '—'}</strong></article>
          <article><small>Pace</small><strong className={(checkIn?.pacePercent ?? 100) < 80 ? 'is-bad' : ''}>{checkIn?.pacePercent ?? '—'}%</strong></article>
          <article><small>Notes added</small><strong>{checkIn?.notesAdded ?? 0}</strong></article>
        </div>
        <section className="gw-card">
          <h2>What got done</h2>
          <ul className="gw-done-list">
            {(checkIn?.completed ?? []).map((item) => (
              <li key={item.id}>
                <span>{item.done ? <FiCheckCircle size={15} aria-hidden="true" /> : <FiCircle size={15} aria-hidden="true" />} {item.title}</span>
                <span>{item.overdue ? 'Overdue' : item.doneOn ? `Done ${item.doneOn}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="gw-card" style={{ marginTop: 12 }}>
          <h2>Suggested adjustments</h2>
          {(checkIn?.adjustments ?? []).map((item) => (
            <label key={item.id} className="gw-adjust">
              <input type="checkbox" checked={picked.includes(item.id)} onChange={() => onToggle(item.id)} />
              <span><strong>{item.title}</strong><small style={{ display: 'block', color: '#8b919e' }}>{item.reason}</small></span>
            </label>
          ))}
        </section>
      </div>
      <aside>
        <section className="gw-card">
          <h2>Real vs targeted</h2>
          <PaceChart points={workspace.chart} />
        </section>
        <section className="gw-card">
          <h2>Reflection</h2>
          <textarea className="gw-notes" style={{ width: '100%', margin: '8px 0 0' }} value={reflection} placeholder="What helped this week? What got in the way?" onChange={(event) => onReflection(event.target.value)} />
          <p className="gw-chart-foot">Saved on the goal when you apply changes.</p>
        </section>
      </aside>
    </div>
  );
};

const CommandResults = ({
  workspace,
  query,
  onPick,
}: {
  workspace: GoalWorkspace;
  query: string;
  onPick: (kind: 'step' | 'strategy' | 'recommendation', id: string) => void;
}) => {
  const needle = query.trim().toLowerCase();
  const match = (value: string) => !needle || value.toLowerCase().includes(needle);
  const steps = workspace.weeks.flatMap((week) => week.steps).filter((step) => match(step.title));
  const strategies = workspace.strategies.filter((item) => match(item.title));
  const recommendations = workspace.recommendations.filter((item) => match(item.title));
  return (
    <div>
      {steps.length ? <h3>STEPS</h3> : null}
      {steps.slice(0, 6).map((step) => (
        <button key={step.id} type="button" onClick={() => onPick('step', step.id)}>
          <span>{step.title}</span><small>Day {step.dayIndex}</small>
        </button>
      ))}
      {strategies.length ? <h3>STRATEGIES</h3> : null}
      {strategies.slice(0, 4).map((item) => (
        <button key={item.id} type="button" onClick={() => onPick('strategy', item.id)}><span>{item.title}</span></button>
      ))}
      {recommendations.length ? <h3>RECOMMENDATIONS</h3> : null}
      {recommendations.slice(0, 4).map((item) => (
        <button key={item.id} type="button" onClick={() => onPick('recommendation', item.id)}><span>{item.title}</span></button>
      ))}
    </div>
  );
};
