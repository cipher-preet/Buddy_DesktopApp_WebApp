export type BillingCycle = 'monthly' | 'yearly';
export type PlanId = 'free' | 'pro' | 'business';

export type DesktopPlan = {
  id: PlanId;
  name: string;
  tagline: string;
  badge?: string;
  variant: 'light' | 'featured' | 'premium';
  prices: Record<BillingCycle, string>;
  amountInr: Record<BillingCycle, number>;
  cadence: Record<BillingCycle, string>;
  limits: {
    notesRecordingHours: string;
    meetingRecordingHours: string;
    mindmaps: string;
    documents: string;
    goals: string;
    marketplace: string;
  };
  features: string[];
  languages: string[];
};

export const ALL_INDIAN_LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Odia',
];

export const billingOptions: { id: BillingCycle; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

export const plans: DesktopPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start capturing notes, meetings, and goals.',
    variant: 'light',
    prices: {
      monthly: '₹0',
      yearly: '₹0',
    },
    amountInr: {
      monthly: 0,
      yearly: 0,
    },
    cadence: {
      monthly: 'forever',
      yearly: 'forever',
    },
    limits: {
      notesRecordingHours: '2 hrs',
      meetingRecordingHours: '10 hrs',
      mindmaps: '10',
      documents: '10',
      goals: '2',
      marketplace: 'Browse only',
    },
    features: [
      '2 hours of notes recording',
      '10 hours of meeting recording',
      '10 mindmaps and 10 documents',
      '2 goal tracking',
      '11 Indian languages',
      'Marketplace browse only',
    ],
    languages: ALL_INDIAN_LANGUAGES,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'More recording, mindmaps, documents, and goals.',
    badge: 'Popular',
    variant: 'featured',
    prices: {
      monthly: '₹499',
      yearly: '₹3,600',
    },
    amountInr: {
      monthly: 499,
      yearly: 3600,
    },
    cadence: {
      monthly: 'per month',
      yearly: 'per year',
    },
    limits: {
      notesRecordingHours: '100 hrs',
      meetingRecordingHours: '100 hrs',
      mindmaps: '200',
      documents: '200',
      goals: '50',
      marketplace: 'Limited',
    },
    features: [
      '100 hours of notes recording',
      '100 hours of meeting recording',
      '200 mindmaps and 200 documents',
      '50 goal tracking',
      '11 Indian languages',
      'Limited marketplace access',
    ],
    languages: ALL_INDIAN_LANGUAGES,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Unlimited capture with full marketplace access.',
    badge: 'Best value',
    variant: 'premium',
    prices: {
      monthly: '₹999',
      yearly: '₹7,200',
    },
    amountInr: {
      monthly: 999,
      yearly: 7200,
    },
    cadence: {
      monthly: 'per month',
      yearly: 'per year',
    },
    limits: {
      notesRecordingHours: 'Unlimited',
      meetingRecordingHours: 'Unlimited',
      mindmaps: 'Unlimited',
      documents: 'Unlimited',
      goals: 'Unlimited',
      marketplace: 'Full access',
    },
    features: [
      'Unlimited notes recording',
      'Unlimited meeting recording',
      'Unlimited mindmaps and documents',
      'Unlimited goal tracking',
      '11 Indian languages',
      'Full marketplace access',
    ],
    languages: ALL_INDIAN_LANGUAGES,
  },
];

export type CompareIcon =
  | 'recording'
  | 'meeting'
  | 'mindmaps'
  | 'documents'
  | 'goals'
  | 'marketplace'
  | 'languages';

export type CompareRow = {
  id: string;
  label: string;
  description: string;
  icon: CompareIcon;
  values: Partial<Record<PlanId, string>>;
};

export const buildCompareRows = (desktopPlans: DesktopPlan[]): CompareRow[] => {
  const byCode = Object.fromEntries(desktopPlans.map((plan) => [plan.id, plan])) as Partial<
    Record<PlanId, DesktopPlan>
  >;

  const valueFor = (code: PlanId, read: (plan: DesktopPlan) => string) =>
    byCode[code] ? read(byCode[code] as DesktopPlan) : '—';

  return [
    {
      id: 'notesRecording',
      label: 'Notes recording',
      description: 'Desktop listen and note capture hours',
      icon: 'recording',
      values: {
        free: valueFor('free', (plan) => plan.limits.notesRecordingHours || '—'),
        pro: valueFor('pro', (plan) => plan.limits.notesRecordingHours || '—'),
        business: valueFor('business', (plan) => plan.limits.notesRecordingHours || '—'),
      },
    },
    {
      id: 'meetingRecording',
      label: 'Meeting recording',
      description: 'Extension meeting capture hours',
      icon: 'meeting',
      values: {
        free: valueFor('free', (plan) => plan.limits.meetingRecordingHours || '—'),
        pro: valueFor('pro', (plan) => plan.limits.meetingRecordingHours || '—'),
        business: valueFor('business', (plan) => plan.limits.meetingRecordingHours || '—'),
      },
    },
    {
      id: 'mindmaps',
      label: 'Mindmaps',
      description: 'Generate structured mind maps',
      icon: 'mindmaps',
      values: {
        free: valueFor('free', (plan) => plan.limits.mindmaps || '—'),
        pro: valueFor('pro', (plan) => plan.limits.mindmaps || '—'),
        business: valueFor('business', (plan) => plan.limits.mindmaps || '—'),
      },
    },
    {
      id: 'documents',
      label: 'Documents',
      description: 'Generate documentation from templates',
      icon: 'documents',
      values: {
        free: valueFor('free', (plan) => plan.limits.documents || '—'),
        pro: valueFor('pro', (plan) => plan.limits.documents || '—'),
        business: valueFor('business', (plan) => plan.limits.documents || '—'),
      },
    },
    {
      id: 'goals',
      label: 'Goal tracking',
      description: 'Active goals you can track',
      icon: 'goals',
      values: {
        free: valueFor('free', (plan) => plan.limits.goals || '—'),
        pro: valueFor('pro', (plan) => plan.limits.goals || '—'),
        business: valueFor('business', (plan) => plan.limits.goals || '—'),
      },
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      description: 'Browse and install agents',
      icon: 'marketplace',
      values: {
        free: valueFor('free', (plan) => plan.limits.marketplace || '—'),
        pro: valueFor('pro', (plan) => plan.limits.marketplace || '—'),
        business: valueFor('business', (plan) => plan.limits.marketplace || '—'),
      },
    },
    {
      id: 'languages',
      label: 'Languages',
      description: 'Indian languages included',
      icon: 'languages',
      values: {
        free: valueFor('free', (plan) => String(plan.languages.length || '—')),
        pro: valueFor('pro', (plan) => String(plan.languages.length || '—')),
        business: valueFor('business', (plan) => String(plan.languages.length || '—')),
      },
    },
  ];
};

export const formatInrAmount = (inr: number) => `₹${Math.max(0, Math.round(inr)).toLocaleString('en-IN')}`;

/** Monthly sticker price implied by the yearly total (backend yearlyAmount / 12). */
export const getYearlyPerMonthInr = (plan: DesktopPlan) =>
  plan.amountInr.yearly > 0 ? Math.round(plan.amountInr.yearly / 12) : 0;

export type PlanPriceDisplay = {
  primary: string;
  cadence: string;
  /** Full yearly charge shown under the monthly equivalent when yearly is selected. */
  fullPayment: string | null;
};

export const getPlanPriceDisplay = (
  plan: DesktopPlan,
  billingCycle: BillingCycle,
): PlanPriceDisplay => {
  if (billingCycle === 'monthly') {
    return {
      primary: plan.prices.monthly,
      cadence: plan.cadence.monthly,
      fullPayment: null,
    };
  }

  if (plan.amountInr.yearly <= 0) {
    return {
      primary: plan.prices.yearly,
      cadence: plan.cadence.yearly,
      fullPayment: null,
    };
  }

  return {
    primary: formatInrAmount(getYearlyPerMonthInr(plan)),
    cadence: 'per month',
    fullPayment: `${plan.prices.yearly}/year`,
  };
};

export const buildPlanFaqs = (desktopPlans: DesktopPlan[]) => {
  const pro = desktopPlans.find((plan) => plan.id === 'pro');
  const business = desktopPlans.find((plan) => plan.id === 'business');
  const languages = business?.languages.join(', ');
  const yearlyLine = (plan?: DesktopPlan) => {
    if (!plan || plan.amountInr.yearly <= 0) {
      return '—';
    }
    return `${plan.prices.yearly} per year (${formatInrAmount(getYearlyPerMonthInr(plan))}/mo)`;
  };

  return [
    {
      q: 'Can I change plans later?',
      a: 'Yes. Switch between Free, Pro, and Business anytime. Your recordings and content stay with you.',
    },
    {
      q: 'What does yearly billing include?',
      a: `Pro is ${yearlyLine(pro)}. Business is ${yearlyLine(business)}. You can still pay monthly if you prefer.`,
    },
    {
      q: 'Which languages are included?',
      a: languages
        ? `${languages}.`
        : 'Language list comes from your active plan on the server.',
    },
  ];
};

/** @deprecated Prefer buildCompareRows(plans) so values stay in sync with live plan data. */
export const compareRows = buildCompareRows(plans);

/** @deprecated Prefer buildPlanFaqs(plans) so answers stay in sync with live plan data. */
export const planFaqs = buildPlanFaqs(plans);

export const getYearlyHint = (plan: DesktopPlan) => {
  if (plan.amountInr.monthly <= 0 || plan.amountInr.yearly <= 0) {
    return null;
  }

  const saved = plan.amountInr.monthly * 12 - plan.amountInr.yearly;
  if (saved <= 0) {
    return null;
  }

  return `Save ${formatInrAmount(saved)} vs monthly`;
};

/** @deprecated Use getYearlyHint */
export const getQuarterlyHint = getYearlyHint;

export const getPlanCtaLabel = (plan: DesktopPlan, isCurrent: boolean) => {
  if (isCurrent) {
    return 'Current plan';
  }

  if (plan.id === 'free') {
    return 'Continue with Free';
  }

  if (plan.id === 'pro') {
    return 'Upgrade to Pro';
  }

  return `Get ${plan.name}`;
};

const formatInrFromPaise = (amountPaise: number) => {
  const inr = Math.round(Number(amountPaise || 0) / 100);
  return `₹${inr.toLocaleString('en-IN')}`;
};

const formatLimitValue = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '—';
  }

  if (value < 0) {
    return 'Unlimited';
  }

  return String(value);
};

const formatRecordingHours = (hours?: number | null) => {
  if (hours === undefined || hours === null) {
    return '—';
  }

  if (hours < 0) {
    return 'Unlimited';
  }

  return `${hours} hrs`;
};

const formatMarketplaceAccess = (access?: string | null) => {
  if (access === 'full') return 'Full access';
  if (access === 'limited') return 'Limited';
  if (access === 'none') return 'Browse only';
  return '—';
};

export type ApiPlanLike = {
  code: PlanId | string;
  name: string;
  description?: string;
  amount: number;
  yearlyAmount?: number;
  quarterlyAmount?: number;
  limits: {
    notesRecordingHours?: number;
    meetingRecordingHours?: number;
    mindmaps?: number;
    documents?: number;
    goals?: number;
    marketplaceAccess?: string;
    spaces?: number;
    notes?: number;
    tasks?: number;
    recordingHours?: number;
  };
  features?: string[];
  languages?: string[];
};

const presentationFor = (code: PlanId) => {
  if (code === 'business') {
    return { badge: 'Best value' as string | undefined, variant: 'premium' as const };
  }
  if (code === 'pro') {
    return { badge: 'Popular' as string | undefined, variant: 'featured' as const };
  }
  return { badge: undefined, variant: 'light' as const };
};

export const mapApiPlanToDesktop = (apiPlan: ApiPlanLike): DesktopPlan => {
  const code: PlanId =
    apiPlan.code === 'business' || apiPlan.code === 'pro' || apiPlan.code === 'free'
      ? apiPlan.code
      : 'free';
  const monthlyPaise = Number(apiPlan.amount || 0);
  const yearlyPaise = Number(apiPlan.yearlyAmount ?? 0);
  const monthlyInr = Math.round(monthlyPaise / 100);
  const yearlyInr = Math.round(yearlyPaise / 100);
  const isFree = code === 'free' || (monthlyInr <= 0 && yearlyInr <= 0);
  const presentation = presentationFor(code);

  return {
    id: code,
    name: apiPlan.name || code,
    tagline: apiPlan.description || '',
    badge: presentation.badge,
    variant: presentation.variant,
    prices: {
      monthly: isFree ? '₹0' : formatInrFromPaise(monthlyPaise),
      yearly: isFree ? '₹0' : formatInrFromPaise(yearlyPaise),
    },
    amountInr: {
      monthly: monthlyInr,
      yearly: yearlyInr,
    },
    cadence: {
      monthly: isFree ? 'forever' : 'per month',
      yearly: isFree ? 'forever' : 'per year',
    },
    limits: {
      notesRecordingHours: formatRecordingHours(
        apiPlan.limits?.notesRecordingHours ?? apiPlan.limits?.recordingHours,
      ),
      meetingRecordingHours: formatRecordingHours(apiPlan.limits?.meetingRecordingHours),
      mindmaps: formatLimitValue(apiPlan.limits?.mindmaps),
      documents: formatLimitValue(apiPlan.limits?.documents),
      goals: formatLimitValue(apiPlan.limits?.goals),
      marketplace: formatMarketplaceAccess(apiPlan.limits?.marketplaceAccess),
    },
    features: apiPlan.features ?? [],
    languages: apiPlan.languages ?? [],
  };
};

/** Map live `/plans` payload only — never substitute the static catalog. */
export const resolveDesktopPlans = (apiPlans?: ApiPlanLike[] | null): DesktopPlan[] => {
  if (!apiPlans?.length) {
    return [];
  }

  return apiPlans
    .filter((plan) => plan.code === 'free' || plan.code === 'pro' || plan.code === 'business')
    .map(mapApiPlanToDesktop);
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data;
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
      if (data && typeof data === 'object') {
        const message = (data as { message?: string }).message;
        if (message?.trim()) {
          return message;
        }
        const nested = (data as { data?: { message?: string } }).data?.message;
        if (nested?.trim()) {
          return nested;
        }
        const detail = (data as { detail?: { message?: string } | string }).detail;
        if (typeof detail === 'string' && detail.trim()) {
          return detail;
        }
        if (detail && typeof detail === 'object' && detail.message?.trim()) {
          return detail.message;
        }
      }
    }

    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  return fallback;
};
