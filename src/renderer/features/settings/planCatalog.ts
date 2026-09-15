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

export const compareRows = [
  { label: 'Spaces', free: '3', pro: '25', business: 'Unlimited' },
  { label: 'Recording', free: '2 hrs', pro: '40 hrs', business: 'Unlimited' },
  { label: 'Languages', free: '2', pro: '6', business: '11' },
  { label: 'Daily briefing', free: '—', pro: 'Yes', business: 'Yes' },
  { label: 'Goal monitor', free: '—', pro: 'Yes', business: 'Yes' },
  { label: 'Team access', free: '—', pro: '—', business: 'Yes' },
];

export const planFaqs = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Switch between Free, Pro, and Business anytime. Your spaces and recordings stay with you.',
  },
  {
    q: 'What does quarterly billing include?',
    a: 'Pro is ₹799 for 3 months. Business is ₹1,999 for 3 months. You can still pay monthly if you prefer.',
  },
  {
    q: 'Which languages does Business unlock?',
    a: 'English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, and Urdu.',
  },
];

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
