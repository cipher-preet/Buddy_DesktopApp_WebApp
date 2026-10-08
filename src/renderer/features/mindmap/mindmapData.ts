import { MarkerType, type Edge, type Node } from '@xyflow/react';

import type { MindmapCardData, MindmapTone } from './mindmapTypes';

export type MindmapSpace = {
  id: string;
  name: string;
  updatedAt: string;
};

export const mindmapSpaces: MindmapSpace[] = [
  { id: 'tgd', name: 'TGD Meetings', updatedAt: 'Updated today' },
  { id: 'product', name: 'Product Planning', updatedAt: 'Updated yesterday' },
  { id: 'design', name: 'Design System', updatedAt: 'Updated 2d ago' },
  { id: 'onboarding', name: 'Customer Onboarding', updatedAt: 'Updated 3d ago' },
  { id: 'marketing', name: 'Marketing Launch', updatedAt: 'Updated 4d ago' },
  { id: 'engineering', name: 'Engineering Sync', updatedAt: 'Updated 5d ago' },
  { id: 'support', name: 'Support Ops', updatedAt: 'Updated 6d ago' },
  { id: 'sales', name: 'Sales Playbook', updatedAt: 'Updated 1w ago' },
  { id: 'finance', name: 'Finance Review', updatedAt: 'Updated 1w ago' },
  { id: 'hr', name: 'People & Culture', updatedAt: 'Updated 2w ago' },
  { id: 'research', name: 'User Research', updatedAt: 'Updated 2w ago' },
  { id: 'security', name: 'Security Checklist', updatedAt: 'Updated 3w ago' },
  { id: 'growth', name: 'Growth Experiments', updatedAt: 'Updated 3w ago' },
  { id: 'partners', name: 'Partner Programs', updatedAt: 'Updated 1mo ago' },
];

const card = (
  id: string,
  position: { x: number; y: number },
  data: MindmapCardData,
): Node<MindmapCardData> => ({
  id,
  type: 'mindmapNode',
  position,
  data,
});

const edge = (
  id: string,
  source: string,
  target: string,
  color: string,
  options?: { dashed?: boolean; label?: string },
): Edge => ({
  id,
  source,
  target,
  type: 'smoothstep',
  animated: false,
  label: options?.label,
  style: {
    stroke: color,
    strokeWidth: 2,
    strokeDasharray: options?.dashed ? '6 4' : undefined,
  },
  labelStyle: options?.label
    ? {
        fill: '#fff',
        fontWeight: 600,
        fontSize: 11,
      }
    : undefined,
  labelBgStyle: options?.label
    ? {
        fill: '#111827',
        fillOpacity: 0.92,
      }
    : undefined,
  labelBgPadding: [8, 6] as [number, number],
  labelBgBorderRadius: 6,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color,
  },
});

type MindmapGraph = {
  nodes: Node<MindmapCardData>[];
  edges: Edge[];
};

type BranchSpec = {
  id: string;
  title: string;
  tone: MindmapTone;
  color: string;
  position: { x: number; y: number };
  cards: {
    id: string;
    title: string;
    position: { x: number; y: number };
    items: string[];
    tags?: string[];
    variant?: MindmapCardData['variant'];
    dashed?: boolean;
  }[];
};

const buildMap = (
  hubTitle: string,
  hubSubtitle: string,
  branches: BranchSpec[],
  extraLabel?: { edgeId: string; label: string },
): MindmapGraph => {
  const nodes: Node<MindmapCardData>[] = [
    card('hub', { x: 0, y: 0 }, {
      kind: 'hub',
      title: hubTitle,
      subtitle: hubSubtitle,
      tone: 'hub',
    }),
  ];
  const edges: Edge[] = [];

  for (const branch of branches) {
    nodes.push(
      card(`branch-${branch.id}`, branch.position, {
        kind: 'branch',
        title: branch.title,
        tone: branch.tone,
      }),
    );
    edges.push(edge(`e-hub-${branch.id}`, 'hub', `branch-${branch.id}`, branch.color));

    branch.cards.forEach((item, index) => {
      nodes.push(
        card(item.id, item.position, {
          kind: 'card',
          title: item.title,
          tone: branch.tone,
          items: item.items,
          tags: item.tags,
          variant: item.variant,
        }),
      );
      edges.push(
        edge(`e-${branch.id}-${item.id}`, `branch-${branch.id}`, item.id, branch.color, {
          dashed: item.dashed ?? index % 2 === 1,
          label: extraLabel?.edgeId === `e-${branch.id}-${item.id}` ? extraLabel.label : undefined,
        }),
      );
    });
  }

  return { nodes, edges };
};

const tgdMap = buildMap(
  'TGD Meeting Summary',
  'Key Notes & Actionable Tasks',
  [
    {
      id: 'attendance',
      title: 'Attendance Shifts',
      tone: 'cyan',
      color: '#22d3ee',
      position: { x: -380, y: -220 },
      cards: [
        {
          id: 'shift-types',
          title: 'Shift Types',
          position: { x: -720, y: -340 },
          tags: ['#shift'],
          items: ['Fixed shift', 'Flexible shift'],
        },
        {
          id: 'shift-info',
          title: 'Shift Information',
          position: { x: -720, y: -160 },
          items: ['Shift name & type', 'Timing / flexible window', 'Break & overtime flags'],
        },
      ],
    },
    {
      id: 'grace',
      title: 'Grace Period',
      tone: 'green',
      color: '#4ade80',
      position: { x: 300, y: -240 },
      cards: [
        {
          id: 'grace-flow',
          title: 'Grace-Period Flow',
          position: { x: 580, y: -360 },
          items: [
            'Within grace → Present',
            'After grace → Present with Delay',
            'After threshold → Absent',
          ],
        },
        {
          id: 'grace-rules',
          title: 'Policy Notes',
          position: { x: 580, y: -140 },
          items: ['Do not mark absent immediately', 'Configure threshold days'],
          dashed: true,
        },
      ],
    },
    {
      id: 'leave',
      title: 'Leave Management',
      tone: 'magenta',
      color: '#e879f9',
      position: { x: -360, y: 180 },
      cards: [
        {
          id: 'leave-master',
          title: 'Leave Master',
          position: { x: -700, y: 120 },
          items: ['Leave name / type', 'Eligibility rules', 'Max days per request'],
        },
        {
          id: 'leave-excess',
          title: 'Excess Leave',
          position: { x: -700, y: 320 },
          items: ['Consecutive leave limit', 'Unpaid beyond limit'],
        },
      ],
    },
    {
      id: 'tasks',
      title: 'Actionable Tasks',
      tone: 'lavender',
      color: '#a78bfa',
      position: { x: 280, y: 200 },
      cards: [
        {
          id: 'tasks-high',
          title: 'High Priority',
          position: { x: 560, y: 120 },
          variant: 'alert',
          items: ['Finalize attendance status', 'Implement flexible shifts'],
        },
        {
          id: 'tasks-medium',
          title: 'Medium Priority',
          position: { x: 560, y: 320 },
          items: ['Fix shift UI actions', 'Complete overtime module'],
        },
      ],
    },
  ],
  { edgeId: 'e-grace-grace-flow', label: 'Why these notes are connected?' },
);

const productMap = buildMap('Product Planning', 'Q2 roadmap overview', [
  {
    id: 'goals',
    title: 'Goals',
    tone: 'blue',
    color: '#60a5fa',
    position: { x: -340, y: -200 },
    cards: [
      {
        id: 'goals-q',
        title: 'Quarter Goals',
        position: { x: -660, y: -300 },
        tags: ['#goals'],
        items: ['Ship mindmap v1', 'Improve onboarding', 'Reduce churn'],
      },
      {
        id: 'goals-kpis',
        title: 'Success Metrics',
        position: { x: -660, y: -100 },
        items: ['Activation rate +12%', 'Weekly active spaces'],
      },
    ],
  },
  {
    id: 'risks',
    title: 'Risks',
    tone: 'pink',
    color: '#f472b6',
    position: { x: 300, y: -180 },
    cards: [
      {
        id: 'risks-top',
        title: 'Top Risks',
        position: { x: 580, y: -280 },
        variant: 'alert',
        items: ['Scope creep', 'API delays', 'Limited design bandwidth'],
      },
      {
        id: 'risks-mitigation',
        title: 'Mitigation',
        position: { x: 580, y: -80 },
        items: ['Freeze scope mid-sprint', 'Shared API contract'],
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery',
    tone: 'purple',
    color: '#c084fc',
    position: { x: 40, y: 220 },
    cards: [
      {
        id: 'delivery-plan',
        title: 'Release Plan',
        position: { x: -220, y: 320 },
        items: ['Alpha → Beta → GA', 'Feature flags', 'Rollback checklist'],
      },
      {
        id: 'delivery-owners',
        title: 'Owners',
        position: { x: 260, y: 320 },
        items: ['PM: roadmap', 'Eng: execution', 'Design: polish'],
      },
    ],
  },
]);

const designMap = buildMap('Design System', 'Tokens, components, patterns', [
  {
    id: 'tokens',
    title: 'Tokens',
    tone: 'green',
    color: '#4ade80',
    position: { x: -340, y: -200 },
    cards: [
      {
        id: 'foundation',
        title: 'Foundation',
        position: { x: -660, y: -300 },
        tags: ['#design'],
        items: ['Color palette', 'Typography scale', 'Spacing rules'],
      },
      {
        id: 'motion',
        title: 'Motion',
        position: { x: -660, y: -100 },
        items: ['Ease curves', 'Duration tokens', 'Reduced motion'],
      },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    tone: 'purple',
    color: '#c084fc',
    position: { x: 300, y: -160 },
    cards: [
      {
        id: 'core-kit',
        title: 'Core Kit',
        position: { x: 580, y: -260 },
        items: ['Buttons', 'Inputs', 'Cards', 'Navigation'],
      },
      {
        id: 'patterns',
        title: 'Patterns',
        position: { x: 580, y: -60 },
        items: ['Empty states', 'Modals', 'Toasts'],
      },
    ],
  },
  {
    id: 'docs',
    title: 'Documentation',
    tone: 'blue',
    color: '#60a5fa',
    position: { x: 0, y: 220 },
    cards: [
      {
        id: 'guidelines',
        title: 'Guidelines',
        position: { x: -260, y: 320 },
        items: ['Usage rules', 'Do / Don’t examples'],
      },
      {
        id: 'handoff',
        title: 'Handoff',
        position: { x: 240, y: 320 },
        items: ['Figma library', 'Code snippets'],
      },
    ],
  },
]);

const onboardingMap = buildMap('Customer Onboarding', 'First-week experience', [
  {
    id: 'welcome',
    title: 'Welcome',
    tone: 'yellow',
    color: '#facc15',
    position: { x: -320, y: -180 },
    cards: [
      {
        id: 'day1',
        title: 'Day 1',
        position: { x: -640, y: -280 },
        items: ['Account setup', 'First workspace', 'Invite teammates'],
      },
      {
        id: 'day2',
        title: 'Day 2–3',
        position: { x: -640, y: -80 },
        items: ['Record sample meeting', 'Review AI summary'],
      },
    ],
  },
  {
    id: 'activation',
    title: 'Activation',
    tone: 'magenta',
    color: '#e879f9',
    position: { x: 300, y: -160 },
    cards: [
      {
        id: 'aha',
        title: 'Aha Moments',
        position: { x: 580, y: -260 },
        items: ['Create first note', 'Record first meeting'],
      },
      {
        id: 'nudges',
        title: 'Nudges',
        position: { x: 580, y: -60 },
        items: ['Email tips', 'In-app checklist'],
      },
    ],
  },
  {
    id: 'success',
    title: 'Success',
    tone: 'green',
    color: '#4ade80',
    position: { x: 20, y: 220 },
    cards: [
      {
        id: 'health',
        title: 'Health Signals',
        position: { x: -240, y: 320 },
        items: ['3+ sessions / week', 'Shared space created'],
      },
      {
        id: 'expansion',
        title: 'Expansion',
        position: { x: 260, y: 320 },
        items: ['Invite managers', 'Upgrade prompt'],
      },
    ],
  },
]);

const marketingMap = buildMap('Marketing Launch', 'Campaign checklist', [
  {
    id: 'channels',
    title: 'Channels',
    tone: 'magenta',
    color: '#e879f9',
    position: { x: -340, y: -200 },
    cards: [
      {
        id: 'gtm',
        title: 'Go-to-Market',
        position: { x: -660, y: -300 },
        tags: ['#launch'],
        items: ['Email sequence', 'Landing page', 'Social teasers'],
      },
      {
        id: 'paid',
        title: 'Paid',
        position: { x: -660, y: -100 },
        items: ['Search ads', 'Retargeting'],
      },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    tone: 'blue',
    color: '#60a5fa',
    position: { x: 300, y: -160 },
    cards: [
      {
        id: 'creative',
        title: 'Creative Pack',
        position: { x: 580, y: -260 },
        items: ['Hero visuals', 'Demo video', 'Press kit'],
      },
      {
        id: 'copy',
        title: 'Copy Bank',
        position: { x: 580, y: -60 },
        items: ['Headlines', 'CTAs', 'FAQ answers'],
      },
    ],
  },
  {
    id: 'timeline',
    title: 'Timeline',
    tone: 'yellow',
    color: '#facc15',
    position: { x: 0, y: 220 },
    cards: [
      {
        id: 'milestones',
        title: 'Milestones',
        position: { x: -260, y: 320 },
        items: ['Teaser week', 'Launch day', 'Follow-up week'],
      },
      {
        id: 'owners',
        title: 'Owners',
        position: { x: 240, y: 320 },
        items: ['Content', 'Design', 'Growth'],
      },
    ],
  },
]);

const makeSimpleComplexMap = (
  title: string,
  subtitle: string,
  leftTone: MindmapTone,
  leftColor: string,
  rightTone: MindmapTone,
  rightColor: string,
  leftTitle: string,
  rightTitle: string,
  bottomTone: MindmapTone,
  bottomColor: string,
  bottomTitle: string,
  items: [string[], string[], string[], string[], string[], string[]],
): MindmapGraph =>
  buildMap(title, subtitle, [
    {
      id: 'left',
      title: leftTitle,
      tone: leftTone,
      color: leftColor,
      position: { x: -340, y: -180 },
      cards: [
        { id: 'left-a', title: `${leftTitle} · A`, position: { x: -660, y: -280 }, items: items[0] },
        { id: 'left-b', title: `${leftTitle} · B`, position: { x: -660, y: -80 }, items: items[1] },
      ],
    },
    {
      id: 'right',
      title: rightTitle,
      tone: rightTone,
      color: rightColor,
      position: { x: 300, y: -160 },
      cards: [
        { id: 'right-a', title: `${rightTitle} · A`, position: { x: 580, y: -260 }, items: items[2] },
        { id: 'right-b', title: `${rightTitle} · B`, position: { x: 580, y: -60 }, items: items[3] },
      ],
    },
    {
      id: 'bottom',
      title: bottomTitle,
      tone: bottomTone,
      color: bottomColor,
      position: { x: 0, y: 220 },
      cards: [
        { id: 'bottom-a', title: `${bottomTitle} · A`, position: { x: -260, y: 320 }, items: items[4] },
        { id: 'bottom-b', title: `${bottomTitle} · B`, position: { x: 240, y: 320 }, items: items[5] },
      ],
    },
  ]);

const mapsBySpaceId: Record<string, MindmapGraph> = {
  tgd: tgdMap,
  product: productMap,
  design: designMap,
  onboarding: onboardingMap,
  marketing: marketingMap,
  engineering: makeSimpleComplexMap(
    'Engineering Sync',
    'Sprint health & blockers',
    'cyan',
    '#22d3ee',
    'pink',
    '#f472b6',
    'Delivery',
    'Quality',
    'blue',
    '#60a5fa',
    'Ops',
    [
      ['PR review SLA', 'Release train'],
      ['Incident rota', 'On-call notes'],
      ['Flaky tests', 'Coverage gaps'],
      ['Perf budgets', 'Error budgets'],
      ['CI pipeline', 'Feature flags'],
      ['Docs debt', 'Tech radar'],
    ],
  ),
  support: makeSimpleComplexMap(
    'Support Ops',
    'Ticket flow & SLAs',
    'green',
    '#4ade80',
    'yellow',
    '#facc15',
    'Inbox',
    'Escalation',
    'purple',
    '#c084fc',
    'Knowledge',
    [
      ['Priority queues', 'Auto-assign'],
      ['Macros', 'CSAT prompts'],
      ['L2 handoff', 'Bug linking'],
      ['VIP path', 'Refund policy'],
      ['Help center', 'Internal FAQ'],
      ['Training clips', 'Weekly review'],
    ],
  ),
  sales: makeSimpleComplexMap(
    'Sales Playbook',
    'Pipeline & discovery',
    'blue',
    '#60a5fa',
    'magenta',
    '#e879f9',
    'Pipeline',
    'Discovery',
    'lavender',
    '#a78bfa',
    'Close',
    [
      ['Lead scoring', 'Stage hygiene'],
      ['Forecasting', 'Win/loss'],
      ['Pain questions', 'Demo script'],
      ['Competitors', 'Objections'],
      ['Proposal pack', 'Pricing grid'],
      ['Legal checklist', 'Handoff to CS'],
    ],
  ),
  finance: makeSimpleComplexMap(
    'Finance Review',
    'Budget & runway',
    'green',
    '#4ade80',
    'yellow',
    '#facc15',
    'Budget',
    'Cash',
    'pink',
    '#f472b6',
    'Reporting',
    [
      ['Headcount plan', 'Tool spend'],
      ['Vendor renewals', 'Capex notes'],
      ['Runway months', 'Burn rate'],
      ['Collections', 'Refunds'],
      ['Monthly close', 'Board pack'],
      ['Tax calendar', 'Audit prep'],
    ],
  ),
  hr: makeSimpleComplexMap(
    'People & Culture',
    'Hiring & retention',
    'lavender',
    '#a78bfa',
    'cyan',
    '#22d3ee',
    'Hiring',
    'Culture',
    'green',
    '#4ade80',
    'Growth',
    [
      ['Open roles', 'Scorecards'],
      ['Interview loop', 'Offer process'],
      ['Values', 'Recognition'],
      ['Manager tips', 'Feedback'],
      ['Career paths', 'Learning budget'],
      ['1:1 cadence', 'Perf reviews'],
    ],
  ),
  research: makeSimpleComplexMap(
    'User Research',
    'Insights backlog',
    'blue',
    '#60a5fa',
    'green',
    '#4ade80',
    'Methods',
    'Findings',
    'purple',
    '#c084fc',
    'Actions',
    [
      ['Interviews', 'Surveys'],
      ['Usability tests', 'Diary studies'],
      ['Pain themes', 'Jobs-to-be-done'],
      ['Quotes bank', 'Opportunity map'],
      ['Design briefs', 'Experiment ideas'],
      ['Roadmap inputs', 'Share-outs'],
    ],
  ),
  security: makeSimpleComplexMap(
    'Security Checklist',
    'Controls & readiness',
    'pink',
    '#f472b6',
    'yellow',
    '#facc15',
    'Access',
    'App Sec',
    'cyan',
    '#22d3ee',
    'Compliance',
    [
      ['SSO / MFA', 'Role reviews'],
      ['Secret rotation', 'Device policy'],
      ['Threat model', 'Dependency scan'],
      ['Pen test notes', 'Bug bounty'],
      ['SOC2 tasks', 'Vendor reviews'],
      ['Incident plan', 'Tabletop drills'],
    ],
  ),
  growth: makeSimpleComplexMap(
    'Growth Experiments',
    'Loop & learn',
    'magenta',
    '#e879f9',
    'blue',
    '#60a5fa',
    'Acquire',
    'Activate',
    'green',
    '#4ade80',
    'Retain',
    [
      ['SEO bets', 'Referral'],
      ['Paid creatives', 'Landing tests'],
      ['Empty-state CTA', 'Checklist'],
      ['Time-to-value', 'Templates'],
      ['Drip emails', 'Win-backs'],
      ['Usage digests', 'Upgrade prompts'],
    ],
  ),
  partners: makeSimpleComplexMap(
    'Partner Programs',
    'Channel & co-sell',
    'purple',
    '#c084fc',
    'cyan',
    '#22d3ee',
    'Recruit',
    'Enable',
    'yellow',
    '#facc15',
    'Operate',
    [
      ['Tier model', 'Target list'],
      ['NDA / MSA', 'Kickoff'],
      ['Demo env', 'Sales kit'],
      ['Certification', 'Portal'],
      ['Deal reg', 'MDF rules'],
      ['QBR notes', 'Renewals'],
    ],
  ),
};

const emptyMap: MindmapGraph = { nodes: [], edges: [] };

/** Returns a saved/demo graph for the space, or an empty canvas when none exists. */
export const getMindmapForSpace = (spaceId: string): MindmapGraph =>
  mapsBySpaceId[spaceId] ?? emptyMap;
