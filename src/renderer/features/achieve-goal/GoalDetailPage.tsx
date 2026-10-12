import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FiArrowRight,
  FiAtSign,
  FiBox,
  FiChevronRight,
  FiFileText,
  FiLink2,
  FiPlus,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { IoDiamondOutline } from 'react-icons/io5';

import { useToast } from '@/app/ToastProvider';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useApproveGoalRevisionMutation,
  useGetGoalDashboardQuery,
  type GoalDashboard,
} from '@/services/goalsApi';

import { GoalRecDrawer, type GoalRecDetail } from './GoalRecDrawer';
import { GoalStepDrawer, type GoalStepDetail } from './GoalStepDrawer';
import { GoalStrategyDrawer, type GoalStrategyDetail } from './GoalStrategyDrawer';
import './goal-detail.css';

const STEPS_PER_PAGE = 6;

const shortLabel = (value: string | undefined, max = 42) => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
};

type GoalDetailPageProps = {
  goalId: string;
  onBack: () => void;
};

type GoalRecListItem = GoalRecDetail & {
  before: string;
  after: string;
  linkLabel: string;
  icon: IconType;
};

type Point = { x: number; y: number };

type GoalChartPoint = {
  id: string;
  label: string;
  year: string;
  quarter: string;
  real: number | null;
  targeted: number;
};

const REC_ICONS = [FiAtSign, FiBox, FiLink2, IoDiamondOutline] as IconType[];

const formatPercent = (value: number) => `${Math.round(value)}%`;

const smoothPath = (points: Point[]) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (after.x - current.x) / 6;
    const cp2y = next.y - (after.y - current.y) / 6;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
};

const ReductionChart = ({ points, years }: { points: GoalChartPoint[]; years: string[] }) => {
  const gradientId = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 760, height: 380 });

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;

    const update = () => {
      const width = Math.max(240, node.clientWidth);
      const legend = node.querySelector('.gd-chart__legend');
      const legendHeight = legend instanceof HTMLElement ? legend.offsetHeight + 12 : 36;
      // Fill the stage on tall screens so Strategies can sit on the remaining space (no dead gap).
      const available = Math.max(220, node.clientHeight - legendHeight);
      const byWidth = Math.round(Math.max(220, width * 0.46));
      const height = Math.round(Math.min(560, Math.max(byWidth, available)));
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = size.width;
  const height = size.height;
  const pad = { top: 18, right: 16, bottom: 34, left: 36 };
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = Math.max(height - pad.top - pad.bottom, 1);
  const maxY = 100;
  const span = Math.max(points.length - 1, 1);

  const toPoint = (value: number, index: number): Point => ({
    x: pad.left + (index / span) * plotW,
    y: pad.top + plotH - (value / maxY) * plotH,
  });

  const targetPoints = points.map((point, index) => toPoint(point.targeted, index));
  const realPoints = points
    .map((point, index) => (point.real == null ? null : toPoint(point.real, index)))
    .filter((point): point is Point => point != null);
  const targetPath = smoothPath(targetPoints);
  const realPath = smoothPath(realPoints);
  const baseline = pad.top + plotH;
  const areaPath =
    targetPoints.length > 0
      ? `${targetPath} L ${targetPoints[targetPoints.length - 1].x.toFixed(2)} ${baseline} L ${targetPoints[0].x.toFixed(2)} ${baseline} Z`
      : '';
  const lastReal = realPoints[realPoints.length - 1];
  const hover = hoverIndex != null ? points[hoverIndex] : null;
  const hoverX = hoverIndex != null ? pad.left + (hoverIndex / span) * plotW : lastReal?.x ?? 0;
  const yTicks = [0, 25, 50, 75, 100];

  const readIndex = (clientX: number, currentTarget: Element) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * width;
    return Math.max(0, Math.min(points.length - 1, Math.round(((x - pad.left) / plotW) * span)));
  };

  return (
    <div className="gd-chart" ref={wrapRef}>
      <div className="gd-chart__legend">
        <span>
          <i className="gd-chart__key gd-chart__key--real" />
          Real
        </span>
        <span>
          <i className="gd-chart__key gd-chart__key--target" />
          Targeted
        </span>
        <small className="gd-chart__live">Live</small>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Real reduction versus targeted reduction"
        onMouseMove={(event) => setHoverIndex(readIndex(event.clientX, event.currentTarget))}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9ebcf2" stopOpacity="0.55" />
            <stop offset="58%" stopColor="#d7e6fb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = pad.top + plotH - (tick / maxY) * plotH;
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} className="gd-chart__grid gd-chart__grid--h" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="gd-chart__axis gd-chart__axis--y">
                {tick}
              </text>
            </g>
          );
        })}

        {years.map((year) => {
          const index = points.findIndex((point) => point.year === year && point.quarter === 'Q1');
          const x = pad.left + (Math.max(index, 0) / span) * plotW;
          return (
            <g key={year}>
              <line x1={x} y1={pad.top} x2={x} y2={baseline} className="gd-chart__grid" />
              <text x={x} y={height - 8} textAnchor={year === years[0] ? 'start' : 'middle'} className="gd-chart__axis">
                {year}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={targetPath} className="gd-chart__line gd-chart__line--target" pathLength={1} />
        <path d={realPath} className="gd-chart__line gd-chart__line--real" pathLength={1} />

        {hover && hover.real != null ? (
          <circle cx={toPoint(hover.real, hoverIndex ?? 0).x} cy={toPoint(hover.real, hoverIndex ?? 0).y} r="4.5" className="gd-chart__dot" />
        ) : null}
        {hover ? (
          <circle
            cx={toPoint(hover.targeted, hoverIndex ?? 0).x}
            cy={toPoint(hover.targeted, hoverIndex ?? 0).y}
            r="4.5"
            className="gd-chart__dot gd-chart__dot--target"
          />
        ) : null}

        {lastReal ? (
          <g>
            <line x1={lastReal.x} y1={lastReal.y + 8} x2={lastReal.x} y2={baseline} className="gd-chart__guide" />
            <circle cx={lastReal.x} cy={lastReal.y} r="8" className="gd-chart__halo" />
            <circle cx={lastReal.x} cy={lastReal.y} r="4.2" className="gd-chart__dot gd-chart__dot--live" />
          </g>
        ) : null}

        {hover ? <line x1={hoverX} y1={pad.top} x2={hoverX} y2={baseline} className="gd-chart__crosshair" /> : null}
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent" />
      </svg>

      {hover ? (
        <div
          className="gd-chart-tip"
          style={{
            left: `${Math.min(Math.max((hoverX / width) * 100, 14), 86)}%`,
          }}
        >
          <strong>{hover.label}</strong>
          <span>
            <i className="gd-chart__key gd-chart__key--real" />
            Real {hover.real == null ? '—' : formatPercent(hover.real)}
          </span>
          <span>
            <i className="gd-chart__key gd-chart__key--target" />
            Targeted {formatPercent(hover.targeted)}
          </span>
        </div>
      ) : null}
    </div>
  );
};

const TrendArrow = ({ direction }: { direction: 'down' | 'up' }) => (
  <svg className={`gd-trend is-${direction}`} viewBox="0 0 12 12" aria-hidden="true">
    {direction === 'down' ? (
      <path d="M2.2 3.2 L9.2 9.2 M9.2 9.2 H5.1 M9.2 9.2 V5.1" />
    ) : (
      <path d="M2.4 9.2 L9.2 2.6 M9.2 2.6 H5.1 M9.2 2.6 V6.7" />
    )}
  </svg>
);

export const GoalDetailPage = ({ goalId, onBack }: GoalDetailPageProps) => {
  const { showToast } = useToast();
  const dashboard = useGetGoalDashboardQuery(goalId);
  const [approveRevision, approveRevisionState] = useApproveGoalRevisionMutation();
  const detail = useMemo(() => buildDetail(goalId, dashboard.data, dashboard.isError ? dashboard.error : undefined), [
    dashboard.data,
    dashboard.error,
    dashboard.isError,
    goalId,
  ]);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [stepFilter, setStepFilter] = useState<'all' | 'open' | 'done'>('all');
  const [stepPage, setStepPage] = useState(0);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const strategiesRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const filteredSteps = useMemo(() => {
    if (stepFilter === 'open') return detail.steps.filter((step) => !step.done);
    if (stepFilter === 'done') return detail.steps.filter((step) => step.done);
    return detail.steps;
  }, [detail.steps, stepFilter]);

  const stepPageCount = Math.max(1, Math.ceil(filteredSteps.length / STEPS_PER_PAGE));
  const safeStepPage = Math.min(stepPage, stepPageCount - 1);
  const pagedSteps = filteredSteps.slice(
    safeStepPage * STEPS_PER_PAGE,
    safeStepPage * STEPS_PER_PAGE + STEPS_PER_PAGE,
  );
  const selectedStep = detail.steps.find((step) => step.id === selectedStepId) ?? null;
  const selectedRec = detail.recommendations.find((item) => item.id === selectedRecId) ?? null;
  const selectedStrategy = detail.strategies.find((item) => item.id === selectedStrategyId) ?? null;

  useEffect(() => {
    setStepPage(0);
  }, [stepFilter, detail.steps.length]);

  useEffect(() => {
    if (selectedStepId && !detail.steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(null);
    }
  }, [detail.steps, selectedStepId]);

  useEffect(() => {
    if (selectedRecId && !detail.recommendations.some((item) => item.id === selectedRecId)) {
      setSelectedRecId(null);
    }
  }, [detail.recommendations, selectedRecId]);

  useEffect(() => {
    if (selectedStrategyId && !detail.strategies.some((item) => item.id === selectedStrategyId)) {
      setSelectedStrategyId(null);
    }
  }, [detail.strategies, selectedStrategyId]);

  useEffect(() => {
    const node = strategiesRef.current;
    if (!node) return undefined;

    const update = () => {
      setCanScrollNext(node.scrollWidth - node.clientWidth > 8);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [detail.strategies.length]);

  const scrollStrategies = () => {
    const node = strategiesRef.current;
    if (!node) return;
    const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 12;
    node.scrollTo({
      left: atEnd ? 0 : node.scrollLeft + Math.min(node.clientWidth * 0.72, 320),
      behavior: 'smooth',
    });
  };

  return (
    <section className="gd-page" aria-label={`${detail.title} dashboard`}>
      <nav className="gd-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="gd-breadcrumb__link" onClick={onBack}>
          Back
        </button>
        <FiChevronRight size={14} aria-hidden="true" />
        <button type="button" className="gd-breadcrumb__muted" onClick={onBack}>
          Achieve Goal
        </button>
        <FiChevronRight size={14} aria-hidden="true" />
        <span className="gd-breadcrumb__current">{detail.title}</span>
      </nav>
      <div className="gd-body">
        <aside className="gd-sidebar" aria-label="Recommended steps">
          <div className="gd-steps-block">
            <h2>
              Recommended steps
              {detail.taskProgressLabel ? <span className="gd-count">{detail.taskProgressLabel}</span> : null}
            </h2>
            {detail.mission ? <p className="gd-steps-mission">{detail.mission}</p> : null}

            <div className="gd-steps-filters" role="tablist" aria-label="Filter steps">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'open', label: 'Open' },
                  { id: 'done', label: 'Done' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={stepFilter === item.id}
                  className={`gd-steps-filter${stepFilter === item.id ? ' is-active' : ''}`}
                  onClick={() => setStepFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {dashboard.isLoading && !dashboard.data ? (
              <div className="gd-steps-state" aria-busy="true">
                <span className="gd-steps-spinner" />
                <p>Loading steps…</p>
              </div>
            ) : null}

            {dashboard.isError && !dashboard.data ? (
              <div className="gd-steps-state" role="alert">
                <p>{getApiErrorMessage(dashboard.error, 'Unable to load steps.')}</p>
                <button type="button" className="gd-btn gd-btn--ghost" onClick={() => void dashboard.refetch()}>
                  Retry
                </button>
              </div>
            ) : null}

            {!dashboard.isLoading && !dashboard.isError && pagedSteps.length === 0 ? (
              <div className="gd-steps-state">
                <p>{stepFilter === 'done' ? 'No completed steps yet.' : 'No recommended steps yet.'}</p>
              </div>
            ) : null}

            {dashboard.data && pagedSteps.length > 0 ? (
              <ol className="gd-steps">
                {pagedSteps.map((step) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      className={`gd-step${step.done ? ' is-done' : ''}${selectedStepId === step.id ? ' is-selected' : ''}`}
                      onClick={() => setSelectedStepId(step.id)}
                    >
                      <span className="gd-step__bullet" aria-hidden="true">
                        {step.done ? <i /> : null}
                      </span>
                      <span className="gd-step__copy">
                        <small>{step.kicker}</small>
                        <span>{step.label}</span>
                      </span>
                      <FiArrowRight className="gd-step__chevron" size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}

            {filteredSteps.length > STEPS_PER_PAGE ? (
              <div className="gd-steps-pagination">
                <button
                  type="button"
                  className="gd-btn gd-btn--ghost"
                  disabled={safeStepPage <= 0}
                  onClick={() => setStepPage((page) => Math.max(0, page - 1))}
                >
                  Previous
                </button>
                <span>
                  {safeStepPage + 1} / {stepPageCount}
                </span>
                <button
                  type="button"
                  className="gd-btn gd-btn--ghost"
                  disabled={safeStepPage >= stepPageCount - 1}
                  onClick={() => setStepPage((page) => Math.min(stepPageCount - 1, page + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <GoalStepDrawer
          goalId={goalId}
          step={selectedStep}
          onClose={() => setSelectedStepId(null)}
          onUpdated={() => {
            showToast({ type: 'success', message: 'Step updated.' });
          }}
        />

        <GoalRecDrawer
          item={selectedRec}
          busy={approveRevisionState.isLoading}
          onClose={() => setSelectedRecId(null)}
          onAction={(kind) => {
            if (kind === 'retry') {
              void dashboard.refetch().finally(() => setSelectedRecId(null));
              return;
            }
            void approveRevision(goalId)
              .unwrap()
              .then(() => {
                showToast({ type: 'success', message: 'Plan update approved.' });
                setSelectedRecId(null);
              })
              .catch((error) => {
                showToast({
                  type: 'error',
                  message: getApiErrorMessage(error, 'Unable to approve that plan update.'),
                });
              });
          }}
        />

        <GoalStrategyDrawer item={selectedStrategy} onClose={() => setSelectedStrategyId(null)} />

        <div className="gd-main" ref={mainRef}>
          <div className="gd-main__top">
            <section className="gd-stage" aria-label="Reduction chart">
              <h2 className="gd-chart-title">Real reduction vs. Targeted reduction</h2>
              <ReductionChart points={detail.chart.points} years={detail.chart.years} />
            </section>

            <aside className="gd-recs" aria-label="Recommendations">
              <div className="gd-recs__actions">
                <button type="button" className="gd-btn gd-btn--primary">
                  <FiFileText size={14} aria-hidden="true" />
                  Generate report
                </button>
              </div>

              <h2>Recommendations</h2>
              <ul className="gd-rec-list">
                {detail.recommendations.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`gd-rec${selectedRecId === item.id ? ' is-selected' : ''}`}
                        onClick={() => setSelectedRecId(item.id)}
                      >
                        <span className="gd-rec-list__icon" aria-hidden="true">
                          <Icon size={15} strokeWidth={1.7} />
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>
                            {item.before}
                            {item.after ? item.after : null}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          <section className="gd-strategies" aria-label="Strategies">
            <div className="gd-strategies__head">
              <h2>
                Strategies
                <span className="gd-count">{detail.strategies.length}</span>
              </h2>
              <button type="button" className="gd-new-strategy">
                <FiPlus size={15} aria-hidden="true" />
                New strategy
              </button>
            </div>

            <div className="gd-strategies__wrap">
              <div className="gd-strategies__track" ref={strategiesRef}>
                {detail.strategies.map((strategy) => (
                  <button
                    key={strategy.id}
                    type="button"
                    className={`gd-strategy gd-strategy--button${selectedStrategyId === strategy.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedStrategyId(strategy.id)}
                  >
                    <header className="gd-strategy__head">
                      <div>
                        <strong>{strategy.title}</strong>
                        <small>{strategy.period}</small>
                      </div>
                      <div className="gd-strategy__tools">
                        <span className={`gd-status is-${strategy.status.toLowerCase()}`}>{strategy.status}</span>
                      </div>
                    </header>
                    {strategy.body ? <p className="gd-strategy__body">{strategy.body}</p> : null}
                    <div className="gd-strategy__metrics">
                      {strategy.metrics.map((metric) => (
                        <div key={`${strategy.id}-${metric.label}`} className="gd-strategy__metric">
                          <strong>
                            <TrendArrow direction={metric.direction} />
                            {metric.value}
                          </strong>
                          <span>{metric.label}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {canScrollNext ? (
                <button type="button" className="gd-strategies__next" aria-label="Next strategies" onClick={scrollStrategies}>
                  <FiArrowRight size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};

const buildDetail = (goalId: string, data: GoalDashboard | undefined, error: unknown) => {
  const title = data?.title || 'Goal';
  const year = String(new Date().getFullYear());
  const executionPercent = (() => {
    if (data?.taskProgress && data.taskProgress.total > 0) {
      return Math.round((data.taskProgress.completed / data.taskProgress.total) * 100);
    }
    const ratio = data?.progress?.execution?.ratio;
    if (typeof ratio === 'number' && Number.isFinite(ratio)) {
      return Math.round(ratio <= 1 ? ratio * 100 : ratio);
    }
    return data?.outcomeProgress ?? null;
  })();
  const chartPoints: GoalChartPoint[] = (data?.chart.points ?? []).map((point, index) => {
    const pointYear = /^\d{4}/.test(point.label) ? point.label.slice(0, 4) : year;
    return {
      id: `${goalId}-${point.label || index}`,
      label: point.label || `Point ${index + 1}`,
      year: pointYear,
      quarter: 'Q1',
      real: point.actual ?? executionPercent,
      targeted: point.target ?? 100,
    };
  });
  if (chartPoints.length === 0) {
    chartPoints.push({
      id: `${goalId}-now`,
      label: 'Now',
      year,
      quarter: 'Q1',
      real: executionPercent ?? 0,
      targeted: 100,
    });
  }
  if (chartPoints.length === 1) {
    chartPoints.unshift({
      id: `${goalId}-start`,
      label: 'Start',
      year: chartPoints[0].year,
      quarter: 'Q1',
      real: 0,
      targeted: 100,
    });
  }
  const years = [...new Set(chartPoints.map((point) => point.year))];
  const milestones = data?.milestones ?? [];
  const planDays = data?.days ?? [];
  const mission = (data?.mission || '').trim();
  const recommendation = (data?.recommendation || data?.planSummary || '').trim();
  const goalSuccess = (data?.successCriteria || '').trim();
  const phases = data?.phases ?? [];

  const dayTasks: GoalStepDetail[] = planDays.flatMap((day, dayIndex) => {
    const dayLabel = day.dateLabel || day.title || `Day ${day.dayIndex ?? dayIndex + 1}`;
    const dayTitle = (day.title || '').trim();
    const dayFocus = (day.focus || '').trim();
    const dayDone = (day.definitionOfDone || '').trim();
    const tasks = day.tasks ?? [];
    const matchingPhase =
      phases.find((phase) => {
        const hay = `${phase.title} ${phase.windowLabel || ''} ${phase.outcome || ''}`.toLowerCase();
        return Boolean(dayTitle) && hay.includes(dayTitle.toLowerCase().slice(0, 18));
      }) || phases[Math.min(dayIndex, Math.max(phases.length - 1, 0))];

    return tasks.map((task, taskIndex) => {
      const label = task.text;
      const siblings = tasks
        .filter((other, otherIndex) => (other.id || otherIndex) !== (task.id || taskIndex))
        .map((other) => other.text)
        .filter(Boolean)
        .slice(0, 3);
      const taskWhy = (task.why || '').trim();
      const taskDone = (task.definitionOfDone || '').trim();

      // Prefer plan-authored fields. Keep drawer short and avoid repeating the same idea.
      const overviewParts = [
        dayFocus || null,
        matchingPhase?.outcome ? `Phase outcome: ${matchingPhase.outcome}` : null,
      ].filter(Boolean) as string[];
      if (overviewParts.length === 0) {
        overviewParts.push(`Part of ${dayTitle || dayLabel}.`);
      }

      const whyItMatters = taskWhy || undefined;

      const howSteps = [
        `Do: ${label}`,
        taskDone ? `Stop when: ${taskDone}` : dayDone ? `Day target: ${dayDone}` : null,
      ].filter(Boolean) as string[];

      const definitionOfDone = taskDone || dayDone || `“${label}” is finished and checkable.`;

      const doneChecks = [definitionOfDone, siblings.length > 0 ? `Related today: ${siblings[0]}` : null].filter(
        Boolean,
      ) as string[];

      return {
        id: task.id || `${goalId}-day-${dayIndex}-task-${taskIndex}`,
        taskId: task.id || '',
        kicker: dayLabel,
        label,
        done: Boolean(task.done),
        note: task.note || '',
        dayTitle,
        hours: day.hours ?? null,
        overviewParts,
        whyItMatters,
        howSteps,
        definitionOfDone,
        doneChecks,
        relatedTasks: siblings,
        dayFocus: dayFocus || undefined,
      };
    });
  });

  const steps: GoalStepDetail[] =
    dayTasks.length > 0
      ? [...dayTasks].sort((left, right) => Number(left.done) - Number(right.done))
      : milestones.length > 0
        ? milestones.map((milestone, index) => {
            const criteria = milestone.successCriteria.filter(Boolean);
            const definitionOfDone =
              criteria[0] ||
              `“${milestone.title}” is finished with clear evidence you can review.`;
            return {
              id: `${goalId}-step-${index}`,
              taskId: '',
              kicker: milestone.dueLabel || milestone.status.replace(/_/g, ' '),
              label: milestone.title,
              done: milestone.status === 'DONE',
              note: '',
              dayTitle: milestone.title,
              hours: null,
              overviewParts: [
                `“${milestone.title}” is a milestone on the path to “${title}”.`,
                mission ? `Mission: ${mission}` : null,
                recommendation || null,
              ].filter(Boolean) as string[],
              whyItMatters:
                criteria.length > 0
                  ? `This milestone matters because success is defined as: ${criteria.join('; ')}.`
                  : 'Completing this milestone keeps the plan honest and sequenced.',
              howSteps: [
                'Treat the success criteria as a checklist.',
                'Produce evidence for each criterion before marking the milestone done.',
              ],
              definitionOfDone,
              doneChecks:
                criteria.length > 0
                  ? [...criteria, 'Evidence is written down so a weekly review can verify it']
                  : [
                      `“${milestone.title}” has a concrete, reviewable result`,
                      'Evidence is written down so a weekly review can verify it',
                    ],
            };
          })
        : [
            {
              id: `${goalId}-step-goal`,
              taskId: '',
              kicker: data?.deadlineLabel || 'Goal',
              label: data?.statement || title,
              done: false,
              note: '',
              dayTitle: title,
              hours: null,
              overviewParts: [
                recommendation ||
                  mission ||
                  data?.statement ||
                  `Work toward “${title}” with one clear, reviewable outcome at a time.`,
              ].filter(Boolean) as string[],
              whyItMatters: goalSuccess
                ? `You are done with the goal only when: ${goalSuccess}.`
                : 'Break the outcome into smaller steps so progress stays measurable.',
              howSteps: [
                'Clarify the next smallest deliverable.',
                'Set a time box and finish that piece.',
                'Capture evidence when you finish.',
              ],
              definitionOfDone:
                goalSuccess ||
                `You can point to concrete evidence that “${title}” is meaningfully closer than before.`,
              doneChecks: [
                'There is a reviewable output from this work session',
                goalSuccess ? `Progress is compatible with: ${goalSuccess}` : 'The next step is clearer than before',
                'Notes capture what changed and what is still open',
              ].filter(Boolean) as string[],
            },
          ];
  const planStrategies = data?.strategies ?? [];
  const strategies: GoalStrategyDetail[] =
    planStrategies.length > 0
      ? planStrategies.map((strategy, index) => {
          const tagLine = (strategy.tags ?? []).slice(0, 2).join(' · ');
          const progressValue =
            executionPercent == null
              ? shortLabel(data?.outcomeLabel || 'Open', 18)
              : `${executionPercent}%`;
          const tasksValue =
            data?.taskProgress && data.taskProgress.total > 0
              ? `${data.taskProgress.completed}/${data.taskProgress.total}`
              : `${data?.workCompleted ?? 0}/${data?.workTotal ?? 0}`;
          return {
            id: strategy.id || `${goalId}-strategy-${index}`,
            title: strategy.title,
            kicker: tagLine || 'Strategy',
            statusLabel: 'Active',
            // Keep card subtitle short; full measurable goal stays in the drawer.
            period: shortLabel(tagLine || data?.timeframe || 'Strategy', 48),
            body: strategy.body,
            measurableGoal: strategy.measurableGoal || '',
            why: strategy.why || '',
            proofPoints: strategy.proofPoints || [],
            effort: strategy.effort || '',
            status: 'ACTIVE' as const,
            metrics: [
              {
                direction: 'up' as const,
                value: progressValue,
                label: 'Progress',
              },
              {
                direction: 'up' as const,
                value: strategy.effort ? shortLabel(strategy.effort, 28) : tasksValue,
                label: strategy.effort ? 'Effort' : 'Tasks done',
              },
            ],
          };
        })
      : (milestones.length > 0
          ? milestones
          : [
              {
                title,
                dueLabel: data?.deadlineLabel || '',
                successCriteria: data?.successCriteria ? [data.successCriteria] : [],
                status: 'PENDING',
              },
            ]
        ).map((milestone, index) => ({
          id: `${goalId}-strategy-${index}`,
          title: milestone.title,
          kicker: milestone.dueLabel || data?.timeframe || 'This plan',
          statusLabel: milestone.status === 'DONE' ? 'Done' : 'Active',
          period: milestone.dueLabel || data?.timeframe || 'This plan',
          body: (milestone.successCriteria || []).join(' · ') || milestone.title,
          measurableGoal: (milestone.successCriteria || [])[0] || '',
          why: `This strategy milestone keeps “${title}” sequenced and measurable.`,
          proofPoints: milestone.successCriteria || [],
          effort: '',
          status: (milestone.status === 'DONE' ? 'DONE' : 'ACTIVE') as 'ACTIVE' | 'DONE',
          metrics: [
            {
              direction: milestone.status === 'DONE' ? ('up' as const) : ('down' as const),
              value: milestone.status === 'DONE' ? 'Done' : 'Open',
              label: shortLabel(milestone.successCriteria[0] || 'Success criteria', 24) || 'Success criteria',
            },
            {
              direction: 'up' as const,
              value:
                data?.outcomeProgress == null
                  ? shortLabel(data?.outcomeLabel || 'Not verified', 18)
                  : `${Math.round(data.outcomeProgress)}%`,
              label: 'Outcome',
            },
          ],
        }));
  const goalStatement = (data?.statement || title).trim();
  const deadlineLabel = (data?.deadlineLabel || data?.timeframe || '').trim();
  const recommendations: GoalRecListItem[] = [
    ...(data?.recommendations ?? []).map((item, index) => {
      const priority = (item.priority || 'MEDIUM').replace(/_/g, ' ');
      const duration = item.suggestedDurationMinutes
        ? `About ${item.suggestedDurationMinutes} minutes`
        : '';
      const reason = (item.reason || '').trim() || `Next useful move for “${title}”.`;
      const howSteps =
        item.howSteps && item.howSteps.length > 0
          ? item.howSteps.slice(0, 3)
          : [item.measurableGoal ? `Aim for: ${item.measurableGoal}` : `Start “${item.title}” today.`].filter(Boolean);
      return {
        id: item.id,
        title: item.title,
        kicker: priority,
        statusLabel: item.milestoneTitle ? 'Linked' : 'Priority',
        summary: reason,
        overviewParts: [reason],
        whyItMatters: item.measurableGoal ? `Done when: ${item.measurableGoal}` : undefined,
        howSteps,
        details: [
          { label: 'Priority', value: priority },
          item.milestoneTitle ? { label: 'Milestone', value: item.milestoneTitle } : null,
          duration ? { label: 'Time', value: duration } : null,
        ].filter(Boolean) as Array<{ label: string; value: string }>,
        related: [],
        before: reason,
        after: duration ? ` ${duration}.` : '',
        linkLabel: '',
        icon: REC_ICONS[index % REC_ICONS.length],
      };
    }),
  ];
  if (data?.latestReview) {
    const reviewSummary = data.latestReview.summary || 'Review notes are available for this period.';
    recommendations.push({
      id: `${goalId}-review`,
      title: `${data.latestReview.periodType} review`,
      kicker: 'Review',
      statusLabel: data.latestReview.periodType,
      summary: reviewSummary,
      overviewParts: [
        `This ${data.latestReview.periodType} review summarizes recent progress on “${title}”.`,
        reviewSummary,
      ],
      whyItMatters:
        'Reviews keep the plan honest. Use them to decide what to continue, adjust, or stop.',
      howSteps: [
        'Read the review summary and highlight one risk or win.',
        data.latestReview.focus
          ? `Make the next focus concrete: ${data.latestReview.focus}`
          : 'Choose one next focus for the coming period.',
        'Update notes or mark related steps done if evidence already exists.',
      ],
      details: [
        { label: 'Period', value: data.latestReview.periodType },
        data.latestReview.focus ? { label: 'Next focus', value: data.latestReview.focus } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
      related: [mission ? `Mission: ${mission}` : null].filter(Boolean) as string[],
      before: reviewSummary,
      after: data.latestReview.focus ? ` Next: ${data.latestReview.focus}` : '',
      linkLabel: '',
      icon: REC_ICONS[recommendations.length % REC_ICONS.length],
    });
  }
  if (data?.proposedRevision) {
    const revisionSummary =
      data.proposedRevision.summary || 'A weekly review suggested a new version of this plan.';
    recommendations.unshift({
      id: 'plan-revision',
      title: 'Proposed plan update',
      kicker: 'Revision',
      statusLabel: `v${data.proposedRevision.version}`,
      summary: revisionSummary,
      overviewParts: [
        `A revised plan (version ${data.proposedRevision.version}) is ready for “${title}”.`,
        revisionSummary,
      ],
      whyItMatters:
        'Approving replaces the current plan with the revised sequence so later steps stay aligned with the latest review.',
      howSteps: [
        'Scan the proposed changes against your current capacity.',
        'Approve only if the update still matches your success criteria.',
        'After approval, continue from the updated recommended steps.',
      ],
      details: [
        { label: 'Version', value: String(data.proposedRevision.version) },
        goalSuccess ? { label: 'Success bar', value: goalSuccess } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
      actionLabel: 'Approve update',
      actionKind: 'approve',
      before: revisionSummary,
      after: '',
      linkLabel: 'Approve update',
      icon: REC_ICONS[0],
    });
  }
  if (data?.positioningHeadline || data?.positioningBody) {
    const headline = (data.positioningHeadline || 'Positioning').trim();
    const body = (data.positioningBody || '').trim();
    recommendations.unshift({
      id: `${goalId}-positioning`,
      title: headline,
      kicker: 'Positioning',
      statusLabel: 'Message',
      summary: body || headline,
      overviewParts: [body || headline],
      whyItMatters: undefined,
      howSteps: data.immediateNextStep ? [data.immediateNextStep] : [],
      details: deadlineLabel ? [{ label: 'Window', value: deadlineLabel }] : [],
      related: (data.funnelTargets ?? []).slice(0, 4),
      before: body || headline,
      after: '',
      linkLabel: '',
      icon: REC_ICONS[0],
    });
  } else if (data?.recommendation || data?.planSummary) {
    const expertText = (data.recommendation || data.planSummary || '').trim();
    recommendations.unshift({
      id: `${goalId}-plan`,
      title: 'Expert recommendation',
      kicker: 'Guidance',
      statusLabel: 'Plan',
      summary: expertText,
      overviewParts: expertText.split(/(?<=[.!?])\s+/).slice(0, 3).filter(Boolean),
      whyItMatters: undefined,
      howSteps: goalSuccess ? [`Aim for: ${goalSuccess}`] : [],
      details: deadlineLabel ? [{ label: 'Timeframe', value: deadlineLabel }] : [],
      related: [],
      before: expertText,
      after: '',
      linkLabel: '',
      icon: REC_ICONS[0],
    });
  }
  (data?.successDefinition?.metrics ?? []).slice(0, 3).forEach((metric, index) => {
    recommendations.push({
      id: `${goalId}-metric-${index}`,
      title: metric.label,
      kicker: 'Metric',
      statusLabel: 'Target',
      summary: `Target: ${metric.target}`,
      overviewParts: [
        `“${metric.label}” is a success metric for “${title}”.`,
        `Target to hit: ${metric.target}.`,
      ],
      whyItMatters:
        'Metrics turn vague progress into something you can verify during weekly review.',
      howSteps: [
        `Decide what evidence proves progress on “${metric.label}”.`,
        `Compare current reality to the target: ${metric.target}.`,
        'Update notes or check-ins when the metric moves.',
      ],
      details: [
        { label: 'Metric', value: metric.label },
        { label: 'Target', value: metric.target },
        deadlineLabel ? { label: 'Window', value: deadlineLabel } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
      before: `Target: ${metric.target}`,
      after: '',
      linkLabel: '',
      icon: REC_ICONS[(index + 1) % REC_ICONS.length],
    });
  });
  if (!data && !error) {
    recommendations.push({
      id: `${goalId}-loading`,
      title: 'Reading this goal',
      kicker: 'Status',
      statusLabel: 'Loading',
      summary: 'The chart, steps, and recommendations are loading from your plan.',
      overviewParts: ['The chart, steps, and recommendations are loading from your plan.'],
      howSteps: ['Wait a moment, then open a recommendation again if detail is still incomplete.'],
      before: 'The chart, steps, and recommendations are loading from your plan.',
      after: '',
      linkLabel: '',
      icon: REC_ICONS[0],
    });
  }
  if (error) {
    const message = getApiErrorMessage(error, 'Unable to load this goal.');
    recommendations.unshift({
      id: 'load-error',
      title: 'This goal did not load',
      kicker: 'Error',
      statusLabel: 'Retry',
      summary: message,
      overviewParts: [message, 'Retry loading to refresh recommendations, steps, and chart data.'],
      howSteps: ['Check your connection.', 'Retry loading this goal.', 'If it fails again, reopen the goal from the list.'],
      actionLabel: 'Retry',
      actionKind: 'retry',
      before: message,
      after: '',
      linkLabel: 'Retry',
      icon: REC_ICONS[0],
    });
  }
  const taskProgressLabel =
    data?.taskProgress && data.taskProgress.total > 0
      ? `${data.taskProgress.completed}/${data.taskProgress.total}`
      : '';

  return {
    title,
    mission: data?.mission || '',
    taskProgressLabel,
    steps,
    strategies,
    recommendations,
    chart: { years, points: chartPoints },
  };
};
