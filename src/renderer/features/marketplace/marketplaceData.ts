import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiHeadphones,
  FiInbox,
  FiLayers,
  FiMail,
  FiMessageSquare,
  FiPhoneCall,
  FiPieChart,
  FiShield,
  FiTarget,
  FiTruck,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { HiOutlineLightBulb } from 'react-icons/hi';

export type MarketplaceAgent = {
  id: string;
  title: string;
  description: string;
  author: string;
  installs: string;
  tone: 'blue' | 'red' | 'navy' | 'teal' | 'orange' | 'purple' | 'green';
  icon: IconType;
};

export const FEATURED_AGENTS: MarketplaceAgent[] = [
  {
    id: 'meeting-notes-task-creator',
    title: 'Meeting Notes Task Creator',
    description:
      'This AI Agent turns action items from Meeting Notes into structured tasks in a designated Tasks database.',
    author: 'Chape',
    installs: '602',
    tone: 'blue',
    icon: FiCheckSquare,
  },
  {
    id: 'business-workspace-auditor',
    title: 'Business Workspace Auditor',
    description:
      'Audits your Notion workspace against a scalability checklist and delivers a prioritized improvement plan for approval.',
    author: 'Imene Mellal',
    installs: '982',
    tone: 'red',
    icon: FiCheckSquare,
  },
  {
    id: 'crm-intelligence',
    title: 'CRM Intelligence',
    description:
      'Analyzes CRM pages and client databases to help manage leads, prioritize contacts, and improve relationship tracking.',
    author: 'Shoaib',
    installs: '688',
    tone: 'navy',
    icon: HiOutlineLightBulb,
  },
  {
    id: 'agency-operations-manager',
    title: 'Agency Operations Manager',
    description:
      'Agency Operations Manager is a specialized AI agent designed for digital agencies that need structure, clarity, and operational flow.',
    author: 'Nation4Business',
    installs: '1.7K',
    tone: 'blue',
    icon: FiClipboard,
  },
  {
    id: 'lead-qualifier',
    title: 'Inbound Lead Qualifier',
    description:
      'Scores inbound interest, captures budget and timeline, and routes hot leads to the right owner automatically.',
    author: 'Kuku Labs',
    installs: '1.2K',
    tone: 'teal',
    icon: FiTarget,
  },
  {
    id: 'support-triage',
    title: 'Support Ticket Triage',
    description:
      'Reads new tickets, tags urgency, and drafts a first response so your team can jump in faster.',
    author: 'Aisha Khan',
    installs: '864',
    tone: 'orange',
    icon: FiInbox,
  },
  {
    id: 'calendar-briefing',
    title: 'Daily Calendar Briefing',
    description:
      'Summarizes tomorrow’s meetings, prep notes, and open tasks into a one-page morning brief.',
    author: 'Noah Patel',
    installs: '743',
    tone: 'purple',
    icon: FiCalendar,
  },
  {
    id: 'sales-coach',
    title: 'Outbound Sales Coach',
    description:
      'Reviews call transcripts, flags missed discovery questions, and suggests a tighter follow-up sequence.',
    author: 'Elena Rossi',
    installs: '2.1K',
    tone: 'green',
    icon: FiPhoneCall,
  },
  {
    id: 'standup-writer',
    title: 'Standup Recap Writer',
    description:
      'Turns scattered standup notes into a clean recap with blockers, owners, and next actions.',
    author: 'Jordan Lee',
    installs: '519',
    tone: 'blue',
    icon: FiUsers,
  },
  {
    id: 'pipeline-pulse',
    title: 'Pipeline Pulse Analyst',
    description:
      'Watches deal movement, highlights stalled opportunities, and recommends the next best contact.',
    author: 'Maya Chen',
    installs: '1.4K',
    tone: 'navy',
    icon: FiPieChart,
  },
  {
    id: 'receptionist',
    title: 'Virtual Receptionist',
    description:
      'Greets callers, answers common questions, and routes requests to the right teammate with a short summary.',
    author: 'Omar Haddad',
    installs: '3.2K',
    tone: 'teal',
    icon: FiHeadphones,
  },
  {
    id: 'content-brief',
    title: 'Content Brief Builder',
    description:
      'Creates SEO-ready briefs from a topic, including outline, keywords, and internal-link suggestions.',
    author: 'Priya Shah',
    installs: '427',
    tone: 'red',
    icon: FiLayers,
  },
  {
    id: 'invoice-chaser',
    title: 'Invoice Follow-up Agent',
    description:
      'Drafts polite payment reminders and logs every chase so finance can stay on top of overdue invoices.',
    author: 'Lucas Meyer',
    installs: '356',
    tone: 'orange',
    icon: FiMail,
  },
  {
    id: 'risk-reviewer',
    title: 'Contract Risk Reviewer',
    description:
      'Flags risky clauses, missing dates, and unusual liability language before you send a contract out.',
    author: 'Sofia Alvarez',
    installs: '791',
    tone: 'purple',
    icon: FiShield,
  },
  {
    id: 'csat-listener',
    title: 'CSAT Comment Listener',
    description:
      'Reads customer comments, clusters themes, and posts a weekly digest of praise and pain points.',
    author: 'Ben Carter',
    installs: '612',
    tone: 'green',
    icon: FiMessageSquare,
  },
  {
    id: 'onboarding-guide',
    title: 'Customer Onboarding Guide',
    description:
      'Walks new customers through setup, checks missing fields, and books a kickoff when they stall.',
    author: 'Hannah Brooks',
    installs: '948',
    tone: 'blue',
    icon: FiZap,
  },
  {
    id: 'logistics-tracker',
    title: 'Logistics Exception Tracker',
    description:
      'Monitors delayed shipments, drafts customer updates, and escalates exceptions that need a human.',
    author: 'Kenji Sato',
    installs: '284',
    tone: 'navy',
    icon: FiTruck,
  },
  {
    id: 'health-score',
    title: 'Account Health Scorer',
    description:
      'Combines usage, tickets, and meeting notes into a weekly health score for each customer account.',
    author: 'Riley Adams',
    installs: '1.1K',
    tone: 'teal',
    icon: FiActivity,
  },
  {
    id: 'hiring-screener',
    title: 'Hiring Screener',
    description:
      'Reviews resumes against the role, writes a short scorecard, and suggests interview questions.',
    author: 'Camille Dubois',
    installs: '533',
    tone: 'red',
    icon: FiUsers,
  },
  {
    id: 'product-rec',
    title: 'Product Recommendation Agent',
    description:
      'Guides shoppers to the right product based on needs, budget, and past conversation context.',
    author: 'Alex Rivera',
    installs: '2.4K',
    tone: 'orange',
    icon: FiTarget,
  },
  {
    id: 'weekly-report',
    title: 'Weekly Ops Reporter',
    description:
      'Pulls goals, meetings, and open tasks into a Friday report your leadership team can scan in minutes.',
    author: 'Taylor Nguyen',
    installs: '1.9K',
    tone: 'purple',
    icon: FiClipboard,
  },
  {
    id: 'knowledge-cleaner',
    title: 'Knowledge Base Cleaner',
    description:
      'Finds duplicate articles, outdated answers, and missing FAQs so your help center stays accurate.',
    author: 'Ivy Park',
    installs: '401',
    tone: 'green',
    icon: FiInbox,
  },
  {
    id: 'event-host',
    title: 'Event Follow-up Host',
    description:
      'After a webinar or demo, it sends tailored recaps, books next steps, and tags hot attendees.',
    author: 'Marcus Cole',
    installs: '677',
    tone: 'blue',
    icon: FiCalendar,
  },
  {
    id: 'qa-coach',
    title: 'Call Quality Coach',
    description:
      'Scores support and sales calls for empathy, clarity, and compliance, then shares coaching notes.',
    author: 'Nina Volkov',
    installs: '825',
    tone: 'navy',
    icon: FiHeadphones,
  },
];
