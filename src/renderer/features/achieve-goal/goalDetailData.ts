import type { IconType } from 'react-icons';
import { FiAtSign, FiBox, FiLink2 } from 'react-icons/fi';
import { IoDiamondOutline } from 'react-icons/io5';

export type GoalMetric = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type GoalStep = {
  id: string;
  kicker: string;
  label: string;
  done: boolean;
};

export type GoalStrategy = {
  id: string;
  title: string;
  period: string;
  status: 'ACTIVE' | 'DRAFT' | 'DONE';
  metrics: Array<{ direction: 'down' | 'up'; value: string; label: string }>;
};

export type GoalRecommendation = {
  id: string;
  title: string;
  before: string;
  linkLabel: string;
  after: string;
  icon: IconType;
};

export type GoalTargetMetric = {
  id: string;
  label: string;
  current: number;
  target: number;
  fill: number;
  color: string;
};

export type GoalChartPoint = {
  id: string;
  label: string;
  year: string;
  quarter: string;
  real: number | null;
  targeted: number;
};

export type GoalDetail = {
  id: string;
  brand: string;
  title: string;
  summarySubtitle: string;
  overallScore: number;
  overallLabel: string;
  metrics: GoalMetric[];
  steps: GoalStep[];
  targetMetrics: GoalTargetMetric[];
  chart: {
    years: string[];
    points: GoalChartPoint[];
  };
  strategies: GoalStrategy[];
  recommendations: GoalRecommendation[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let next = seed;
  return () => {
    next += 0x6d2b79f5;
    let t = next;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const METRIC_COLORS = {
  usage: '#1a3f8f',
  recycled: '#129e96',
  non: '#e15d56',
} as const;

export const createDummyDashboard = (goalId: string) => {
  const rand = mulberry32(hashString(`goal-dash:${goalId}`));
  const usage = Math.round(42 + rand() * 22);
  const recycled = Math.round(48 + rand() * 24);
  const non = Math.round(28 + rand() * 24);
  const score = Math.round(32 + rand() * 18);

  const metrics: GoalMetric[] = [
    { id: 'usage', label: 'Plastic usage', value: usage, color: METRIC_COLORS.usage },
    { id: 'recycled', label: 'Recycled or bio-based', value: recycled, color: METRIC_COLORS.recycled },
    { id: 'non', label: 'Non-recyclable materials', value: non, color: METRIC_COLORS.non },
  ];

  const targetMetrics: GoalTargetMetric[] = [
    { id: 'usage', label: 'Plastic usage', current: usage + 18, target: Math.max(28, usage - 12), fill: clamp(usage * 0.72, 18, 86), color: METRIC_COLORS.usage },
    { id: 'recycled', label: 'Recycled or bio-based', current: Math.max(22, recycled - 14), target: Math.min(88, recycled + 16), fill: clamp(recycled * 0.48, 16, 70), color: '#14a394' },
    { id: 'non', label: 'Non-recyclable materials', current: non + 8, target: Math.max(18, non - 14), fill: clamp(non * 0.9, 20, 82), color: '#e06a62' },
  ].map((item) => ({
    ...item,
    current: clamp(Math.round(item.current), 8, 96),
    target: clamp(Math.round(item.target), 8, 96),
    fill: clamp(Math.round(item.fill), 12, 88),
  }));

  const years = ['2022', '2023', '2024', '2025', '2026'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const points: GoalChartPoint[] = [];
  let targeted = 16 + rand() * 8;
  let real = 10 + rand() * 6;

  years.forEach((year) => {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      targeted = clamp(targeted + 2.4 + rand() * 3.2 - 0.6, 12, 96);
      const yearNumber = Number(year);
      const isFuture = yearNumber > currentYear || (yearNumber === currentYear && quarter > currentQuarter);
      const isCurrent = yearNumber === currentYear && quarter === currentQuarter;
      if (!isFuture) {
        real = clamp(real + 1.4 + rand() * 4.2 - (rand() > 0.72 ? 5.5 : 0.4), 8, targeted - 4);
      }
      points.push({
        id: `${year}-Q${quarter}`,
        label: `Q${quarter} ${year}`,
        year,
        quarter: `Q${quarter}`,
        real: isFuture ? null : Math.round((isCurrent ? real + rand() * 1.4 : real) * 10) / 10,
        targeted: Math.round(targeted * 10) / 10,
      });
    }
  });

  return {
    overallScore: score,
    metrics,
    targetMetrics,
    chart: { years, points },
  };
};

export const tickDummyDashboard = (current: ReturnType<typeof createDummyDashboard>) => {
  const jitter = (value: number, amount: number, min: number, max: number) =>
    Math.round(clamp(value + (Math.random() - 0.48) * amount, min, max) * 10) / 10;

  const metrics = current.metrics.map((metric) => ({
    ...metric,
    value: jitter(metric.value, 1.6, 18, 92),
  }));

  const liveIndex = [...current.chart.points].reverse().findIndex((point) => point.real != null);
  const liveAt = liveIndex >= 0 ? current.chart.points.length - 1 - liveIndex : -1;

  return {
    overallScore: jitter(current.overallScore, 1.1, 24, 78),
    metrics,
    targetMetrics: current.targetMetrics.map((metric, index) => ({
      ...metric,
      current: jitter(metric.current, 1.4, 12, 96),
      fill: clamp(metrics[index]?.value ?? metric.fill, 12, 88),
    })),
    chart: {
      ...current.chart,
      points: current.chart.points.map((point, index) =>
        index === liveAt && point.real != null
          ? { ...point, real: jitter(point.real, 1.8, 8, Math.max(12, point.targeted - 2)) }
          : point,
      ),
    },
  };
};

const baseDetail = (id: string, title: string): GoalDetail => {
  const dummy = createDummyDashboard(id);

  return {
  id,
  brand: 'CIRCLE',
  title,
  summarySubtitle: 'Your score, results and next steps for plastic reduction!',
  overallScore: dummy.overallScore,
  overallLabel: 'Your Plastic Reduction (2024)',
  metrics: dummy.metrics,
  steps: [
    { id: '1', kicker: 'STEP 1', label: 'Set target baseline', done: true },
    { id: '2', kicker: 'STEP 2', label: 'Create & set active strategy', done: true },
    { id: '3', kicker: 'STEP 3', label: 'Review & submit strategy', done: false },
    { id: '4', kicker: 'STEP 4', label: 'Set training programs', done: false },
    { id: '5', kicker: 'STEP 5', label: 'Monitor, report, and optimize', done: false },
  ],
  targetMetrics: dummy.targetMetrics,
  chart: dummy.chart,
  strategies: [
    {
      id: 's1',
      title: 'Strategy #1',
      period: '2023 - 2024',
      status: 'ACTIVE',
      metrics: [
        { direction: 'down', value: '30% less', label: 'PET bottles' },
        { direction: 'down', value: '40% less', label: 'plastic bags' },
      ],
    },
    {
      id: 's2',
      title: 'Strategy #2',
      period: '2021 - 2023',
      status: 'ACTIVE',
      metrics: [
        { direction: 'up', value: '50% more', label: 'PET bottles' },
        { direction: 'down', value: '20% less', label: 'non-recyclable mat.' },
      ],
    },
    {
      id: 's3',
      title: 'Strategy #3',
      period: '2021 - 2050',
      status: 'ACTIVE',
      metrics: [
        { direction: 'down', value: '90% less', label: 'PET bottles' },
        { direction: 'down', value: '15% less', label: 'film wrap' },
      ],
    },
    {
      id: 's4',
      title: 'Strategy #4',
      period: '2024 - 2026',
      status: 'DRAFT',
      metrics: [
        { direction: 'up', value: '22% more', label: 'bio-based packs' },
        { direction: 'down', value: '12% less', label: 'waste volume' },
      ],
    },
    {
      id: 's5',
      title: 'Strategy #5',
      period: '2025',
      status: 'ACTIVE',
      metrics: [
        { direction: 'down', value: '28% less', label: 'single-use cups' },
        { direction: 'up', value: '15% more', label: 'reuse loops' },
      ],
    },
    {
      id: 's6',
      title: 'Strategy #6',
      period: '2025 - 2026',
      status: 'DONE',
      metrics: [
        { direction: 'up', value: '40% more', label: 'supplier audits' },
        { direction: 'down', value: '25% less', label: 'landfill share' },
      ],
    },
  ],
  recommendations: [
    {
      id: 'r1',
      title: 'Implement APR Design',
      before: 'Consider implementing the APR ',
      linkLabel: 'Design Guide',
      after: ' and engaging with partners on recyclable formats.',
      icon: FiLink2,
    },
    {
      id: 'r2',
      title: 'Engage U.S. Plastic Pact',
      before: 'Consider engaging with the U.S. ',
      linkLabel: 'Plastics Pact',
      after: ' to align shared reduction targets.',
      icon: IoDiamondOutline,
    },
    {
      id: 'r3',
      title: 'Material Innovation Labs',
      before: "Explore the Innovation Labs materials' ",
      linkLabel: 'Sustainability Initiative',
      after: ' for lower-impact packaging.',
      icon: FiBox,
    },
    {
      id: 'r4',
      title: 'Supplier Sustainability Program',
      before: 'Create a program to work closely with suppliers to reduce plastic usage.',
      linkLabel: '',
      after: '',
      icon: FiAtSign,
    },
  ],
};
};

export const GOAL_DETAILS: Record<string, GoalDetail> = {
  basic: baseDetail('basic', 'Basic Goal'),
  'customer-service': baseDetail('customer-service', 'Customer Service AI'),
  'lead-generation': baseDetail('lead-generation', 'Lead Generation AI'),
  'appointment-booking': baseDetail('appointment-booking', 'Appointment Booking'),
  'outbound-sales': baseDetail('outbound-sales', 'Outbound Sales'),
  'product-recommendation': baseDetail('product-recommendation', 'Product Recommendation'),
  receptionist: baseDetail('receptionist', 'Virtual Receptionist'),
  'rental-service': baseDetail('rental-service', 'Rental Service'),
  'inbound-qualification': baseDetail('inbound-qualification', 'Inbound Qualification'),
};

export const getGoalDetail = (id: string): GoalDetail =>
  GOAL_DETAILS[id] ?? baseDetail(id, 'Goal Dashboard');
