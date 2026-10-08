import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FiArrowRight,
  FiBarChart2,
  FiEdit2,
  FiFileText,
  FiMoreVertical,
  FiPlus,
} from 'react-icons/fi';

import {
  createDummyDashboard,
  getGoalDetail,
  tickDummyDashboard,
  type GoalChartPoint,
  type GoalMetric,
} from './goalDetailData';

import './goal-detail.css';

type GoalDetailPageProps = {
  goalId: string;
  onBack: () => void;
};

type Point = { x: number; y: number };

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

const splitGaugeCaption = (label: string) => {
  const match = label.match(/^(.*?)(\s*\(\d{4}\))\s*$/);
  if (match?.[1] && match[2]) {
    return [match[1].trim(), match[2].trim()];
  }
  return [label];
};

const ProgressGauge = ({
  score,
  label,
  metrics,
  activeId,
  onActiveIdChange,
}: {
  score: number;
  label: string;
  metrics: GoalMetric[];
  activeId: string | null;
  onActiveIdChange: (id: string | null) => void;
}) => {
  const cx = 130;
  const cy = 116;
  const stroke = 9;
  const radii = [98, 80, 62];
  const caption = splitGaugeCaption(label);
  const arcs = metrics.slice(0, 3).map((metric, index) => ({
    ...metric,
    radius: radii[index] ?? 62,
    progress: Math.max(4, Math.min(metric.value, 100)),
  }));

  return (
    <div className="gd-gauge" aria-label={`${formatPercent(score)} ${label}`}>
      <svg viewBox="0 0 260 186" role="img">
        {arcs.map((arc) => {
          const d = `M ${cx - arc.radius} ${cy} A ${arc.radius} ${arc.radius} 0 0 1 ${cx + arc.radius} ${cy}`;
          const dimmed = Boolean(activeId && activeId !== arc.id);
          return (
            <g key={arc.id}>
              <path d={d} fill="none" stroke="#e6eaF0" strokeWidth={stroke} strokeLinecap="round" />
              <path
                className="gd-gauge__fill"
                d={d}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${arc.progress} 100`}
                opacity={dimmed ? 0.28 : 1}
              />
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={18}
                strokeLinecap="round"
                onMouseEnter={() => onActiveIdChange(arc.id)}
                onMouseLeave={() => onActiveIdChange(null)}
              />
            </g>
          );
        })}
        <text className="gd-gauge__score" x={cx} y={cy + 6} textAnchor="middle">
          {formatPercent(score)}
        </text>
        {caption.map((line, index) => (
          <text
            key={line}
            className="gd-gauge__caption"
            x={cx}
            y={cy + 28 + index * 14}
            textAnchor="middle"
          >
            {line}
          </text>
        ))}
      </svg>
    </div>
  );
};

const ReductionChart = ({ points, years }: { points: GoalChartPoint[]; years: string[] }) => {
  const gradientId = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 760, height: 300 });

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;

    const update = () => {
      const next = node.getBoundingClientRect();
      setSize({ width: Math.max(280, next.width), height: 300 });
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

export const GoalDetailPage = ({ goalId }: GoalDetailPageProps) => {
  const detail = useMemo(() => getGoalDetail(goalId), [goalId]);
  const [live, setLive] = useState(() => createDummyDashboard(goalId));
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const strategiesRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLive(createDummyDashboard(goalId));
  }, [goalId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLive((current) => tickDummyDashboard(current));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [goalId]);

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
      <div className="gd-body">
        <aside className="gd-sidebar">
          <div className="gd-summary">
            <h2>Summary</h2>
            <p>{detail.summarySubtitle}</p>
          </div>

          <ProgressGauge
            score={live.overallScore}
            label={detail.overallLabel}
            metrics={live.metrics}
            activeId={activeMetricId}
            onActiveIdChange={setActiveMetricId}
          />

          <ul className="gd-metric-list">
            {live.metrics.map((metric) => (
              <li
                key={metric.id}
                className={activeMetricId === metric.id ? 'is-active' : undefined}
                onMouseEnter={() => setActiveMetricId(metric.id)}
                onMouseLeave={() => setActiveMetricId(null)}
              >
                <span style={{ color: metric.color }}>{metric.label}</span>
                <strong style={{ color: metric.color }}>{formatPercent(metric.value)}</strong>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="gd-results-btn"
            onClick={() => {
              mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <FiBarChart2 size={16} strokeWidth={2} aria-hidden="true" />
            <span>Show full results</span>
          </button>

          <div className="gd-steps-block">
            <h3>Recommended steps</h3>
            <ol className="gd-steps">
              {detail.steps.map((step) => (
                <li key={step.id}>
                  <button type="button" className={`gd-step${step.done ? ' is-done' : ''}`}>
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
          </div>
        </aside>

        <div className="gd-main" ref={mainRef}>
          <div className="gd-main__top">
            <section className="gd-stage" aria-label="Your target">
              <h2>Your target</h2>

              <div className="gd-target-bars">
                {live.targetMetrics.map((metric) => (
                  <div key={metric.id} className="gd-target-bar">
                    <div className="gd-target-bar__label" style={{ color: metric.color }}>
                      {metric.label}
                    </div>
                    <div className="gd-target-bar__track" aria-hidden="true">
                      <span style={{ width: `${metric.fill}%`, background: metric.color }} />
                    </div>
                    <div className="gd-target-bar__values" style={{ color: metric.color }}>
                      <span>{formatPercent(metric.current)}</span>
                      <span>{formatPercent(metric.target)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="gd-chart-title">Real reduction vs. Targeted reduction</h3>
              <ReductionChart points={live.chart.points} years={live.chart.years} />
            </section>

            <aside className="gd-recs" aria-label="Recommendations">
              <div className="gd-recs__actions">
                <button type="button" className="gd-btn gd-btn--ghost">
                  <FiEdit2 size={14} aria-hidden="true" />
                  Edit targets
                </button>
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
                      <span className="gd-rec-list__icon" aria-hidden="true">
                        <Icon size={15} strokeWidth={1.7} />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {item.before}
                          {item.linkLabel ? (
                            <button type="button" className="gd-link">
                              {item.linkLabel}
                            </button>
                          ) : null}
                          {item.after ? item.after : null}
                        </p>
                      </div>
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
                  <article key={strategy.id} className="gd-strategy">
                    <header className="gd-strategy__head">
                      <div>
                        <strong>{strategy.title}</strong>
                        <small>{strategy.period}</small>
                      </div>
                      <div className="gd-strategy__tools">
                        <span className={`gd-status is-${strategy.status.toLowerCase()}`}>{strategy.status}</span>
                        <button type="button" aria-label={`${strategy.title} options`}>
                          <FiMoreVertical size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </header>
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
                  </article>
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
