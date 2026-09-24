export type BillingCycle = 'monthly' | 'quarterly';
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
    spaces: string;
    notes: string;
    tasks: string;
    recordingHours: string;
  };
  features: string[];
  languages: string[];
};

export const billingOptions: { id: BillingCycle; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
];

export const plans: DesktopPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start organizing spaces, notes, and personal tasks.',
    variant: 'light',
    prices: {
      monthly: '₹0',
      quarterly: '₹0',
    },
    amountInr: {
      monthly: 0,
      quarterly: 0,
    },
    cadence: {
      monthly: 'forever',
      quarterly: 'forever',
    },
    limits: {
      spaces: '3',
      notes: '25',
      tasks: '50',
      recordingHours: '2 hrs',
    },
    features: ['Personal spaces', 'Basic notes and tasks', 'Limited meeting recording', 'Buddy AI chat preview'],
    languages: ['English', 'Hindi'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'More recording, daily summaries, and smarter planning.',
    badge: 'Popular',
    variant: 'featured',
    prices: {
      monthly: '₹299',
      quarterly: '₹799',
    },
    amountInr: {
      monthly: 299,
      quarterly: 799,
    },
    cadence: {
      monthly: 'per month',
      quarterly: 'per quarter',
    },
    limits: {
      spaces: '25',
      notes: 'Unlimited',
      tasks: 'Unlimited',
      recordingHours: '40 hrs',
    },
    features: ['Daily briefing from your work', 'Goal monitor for spaces', 'Advanced AI chat with notes', 'Priority support'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Team-ready workflows, shared spaces, and full language access.',
    badge: 'Best value',
    variant: 'premium',
    prices: {
      monthly: '₹799',
      quarterly: '₹1,999',
    },
    amountInr: {
      monthly: 799,
      quarterly: 1999,
    },
    cadence: {
      monthly: 'per month',
      quarterly: 'per quarter',
    },
    limits: {
      spaces: 'Unlimited',
      notes: 'Unlimited',
      tasks: 'Unlimited',
      recordingHours: 'Unlimited',
    },
    features: ['Team access and shared spaces', 'Unlimited recording', 'Business language pack', 'Admin-ready support'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'],
  },
];

export type CompareIcon = 'spaces' | 'recording' | 'languages' | 'briefing' | 'goals' | 'team';

export type CompareRow = {
  id: string;
  label: string;
  description: string;
  icon: CompareIcon;
  values: Partial<Record<PlanId, string>>;
};

const hasFeature = (features: string[], needle: string) =>
  features.some((feature) => feature.toLowerCase().includes(needle.toLowerCase()));

export const buildCompareRows = (desktopPlans: DesktopPlan[]): CompareRow[] => {
  const byCode = Object.fromEntries(desktopPlans.map((plan) => [plan.id, plan])) as Partial<
    Record<PlanId, DesktopPlan>
  >;

  const valueFor = (code: PlanId, read: (plan: DesktopPlan) => string) =>
    byCode[code] ? read(byCode[code] as DesktopPlan) : '—';

  return [
    {
      id: 'spaces',
      label: 'More spaces',
      description: 'Organize work across dedicated spaces',
      icon: 'spaces',
      values: {
        free: valueFor('free', (plan) => plan.limits.spaces || '—'),
        pro: valueFor('pro', (plan) => plan.limits.spaces || '—'),
        business: valueFor('business', (plan) => plan.limits.spaces || '—'),
      },
    },
    {
      id: 'recording',
      label: 'Meeting recording',
      description: 'Capture conversations with included hours',
      icon: 'recording',
      values: {
        free: valueFor('free', (plan) => plan.limits.recordingHours || '—'),
        pro: valueFor('pro', (plan) => plan.limits.recordingHours || '—'),
        business: valueFor('business', (plan) => plan.limits.recordingHours || '—'),
      },
    },
    {
      id: 'languages',
      label: 'Language pack',
      description: 'Speak and listen in more Indian languages',
      icon: 'languages',
      values: {
        free: valueFor('free', (plan) => String(plan.languages.length || '—')),
        pro: valueFor('pro', (plan) => String(plan.languages.length || '—')),
        business: valueFor('business', (plan) => String(plan.languages.length || '—')),
      },
    },
    {
      id: 'briefing',
      label: 'Daily briefing',
      description: 'Personalized summary from your day',
      icon: 'briefing',
      values: {
        free: valueFor('free', (plan) => (hasFeature(plan.features, 'briefing') ? 'Yes' : '—')),
        pro: valueFor('pro', (plan) => (hasFeature(plan.features, 'briefing') ? 'Yes' : '—')),
        business: valueFor('business', (plan) =>
          hasFeature(plan.features, 'briefing') ? 'Yes' : '—',
        ),
      },
    },
    {
      id: 'goals',
      label: 'Goal monitor',
      description: 'Track outcomes across every space',
      icon: 'goals',
      values: {
        free: valueFor('free', (plan) => (hasFeature(plan.features, 'goal') ? 'Yes' : '—')),
        pro: valueFor('pro', (plan) => (hasFeature(plan.features, 'goal') ? 'Yes' : '—')),
        business: valueFor('business', (plan) => (hasFeature(plan.features, 'goal') ? 'Yes' : '—')),
      },
    },
    {
      id: 'team',
      label: 'Team access',
      description: 'Collaborate with shared workspaces',
      icon: 'team',
      values: {
        free: valueFor('free', (plan) => (hasFeature(plan.features, 'team') ? 'Yes' : '—')),
        pro: valueFor('pro', (plan) => (hasFeature(plan.features, 'team') ? 'Yes' : '—')),
        business: valueFor('business', (plan) => (hasFeature(plan.features, 'team') ? 'Yes' : '—')),
      },
    },
  ];
};

export const buildPlanFaqs = (desktopPlans: DesktopPlan[]) => {
  const pro = desktopPlans.find((plan) => plan.id === 'pro');
  const business = desktopPlans.find((plan) => plan.id === 'business');
  const languages = business?.languages.join(', ');

  return [
    {
      q: 'Can I change plans later?',
      a: 'Yes. Switch between Free, Pro, and Business anytime. Your spaces and recordings stay with you.',
    },
    {
      q: 'What does quarterly billing include?',
      a: `Pro is ${pro?.prices.quarterly || '—'} for 3 months. Business is ${
        business?.prices.quarterly || '—'
      } for 3 months. You can still pay monthly if you prefer.`,
    },
    {
      q: 'Which languages does Business unlock?',
      a: languages ? `${languages}.` : 'Business includes 11 Indian languages.',
    },
  ];
};

/** @deprecated Prefer buildCompareRows(plans) so values stay in sync with live plan data. */
export const compareRows = buildCompareRows(plans);

/** @deprecated Prefer buildPlanFaqs(plans) so answers stay in sync with live plan data. */
export const planFaqs = buildPlanFaqs(plans);

export const getQuarterlyHint = (plan: DesktopPlan) => {
  if (plan.amountInr.monthly <= 0) {
    return null;
  }

  const saved = plan.amountInr.monthly * 3 - plan.amountInr.quarterly;
  if (saved <= 0) {
    return null;
  }

  return `Save ₹${saved.toLocaleString('en-IN')} vs monthly`;
};

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

export type ApiPlanLike = {
  code: PlanId | string;
  name: string;
  description?: string;
  amount: number;
  quarterlyAmount?: number;
  limits: {
    spaces: number;
    notes: number;
    tasks: number;
    recordingHours?: number;
  };
  features?: string[];
  languages?: string[];
};

export const mapApiPlanToDesktop = (apiPlan: ApiPlanLike): DesktopPlan => {
  const code = (apiPlan.code as PlanId) || 'free';
  const catalog = plans.find((plan) => plan.id === code);
  const monthlyPaise = Number(apiPlan.amount || 0);
  const quarterlyPaise = Number(apiPlan.quarterlyAmount ?? monthlyPaise * 3);
  const monthlyInr = Math.round(monthlyPaise / 100);
  const quarterlyInr = Math.round(quarterlyPaise / 100);
  const isFree = code === 'free' || monthlyInr <= 0;

  return {
    id: catalog?.id ?? (code === 'business' ? 'business' : code === 'pro' ? 'pro' : 'free'),
    name: apiPlan.name || catalog?.name || 'Plan',
    tagline: apiPlan.description || catalog?.tagline || '',
    badge: catalog?.badge,
    variant: catalog?.variant ?? (code === 'business' ? 'premium' : code === 'pro' ? 'featured' : 'light'),
    prices: {
      monthly: isFree ? '₹0' : formatInrFromPaise(monthlyPaise),
      quarterly: isFree ? '₹0' : formatInrFromPaise(quarterlyPaise),
    },
    amountInr: {
      monthly: monthlyInr,
      quarterly: quarterlyInr,
    },
    cadence: {
      monthly: isFree ? 'forever' : 'per month',
      quarterly: isFree ? 'forever' : 'per quarter',
    },
    limits: {
      spaces: formatLimitValue(apiPlan.limits?.spaces),
      notes: formatLimitValue(apiPlan.limits?.notes),
      tasks: formatLimitValue(apiPlan.limits?.tasks),
      recordingHours: formatRecordingHours(apiPlan.limits?.recordingHours),
    },
    features: apiPlan.features?.length ? apiPlan.features : catalog?.features ?? [],
    languages: apiPlan.languages?.length ? apiPlan.languages : catalog?.languages ?? [],
  };
};

export const resolveDesktopPlans = (apiPlans?: ApiPlanLike[] | null): DesktopPlan[] => {
  if (!apiPlans?.length) {
    return plans;
  }

  const mapped = apiPlans
    .filter((plan) => plan.code === 'free' || plan.code === 'pro' || plan.code === 'business')
    .map(mapApiPlanToDesktop);

  return mapped.length ? mapped : plans;
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
