import {
  FiBookOpen,
  FiCalendar,
  FiMessageSquare,
  FiShoppingBag,
  FiTarget,
  FiVideo,
} from 'react-icons/fi';

import './documentation.css';

const GUIDES = [
  {
    id: 'getting-started',
    title: 'Getting started',
    body: 'Create a space, record a meeting, and let KukuNotes turn it into notes, tasks, and follow-ups.',
    icon: FiBookOpen,
  },
  {
    id: 'meetings',
    title: 'Meetings & recording',
    body: 'Start a recording, add context, and review transcripts, summaries, and action items after the call.',
    icon: FiVideo,
  },
  {
    id: 'goals',
    title: 'Achieve Goal',
    body: 'Open a goal dashboard, track reduction targets, and work through recommended steps and strategies.',
    icon: FiTarget,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    body: 'Connect Google Calendar so upcoming events show in KukuNotes and you can jump into the right meeting.',
    icon: FiCalendar,
  },
  {
    id: 'chat',
    title: 'AI Chat',
    body: 'Ask questions about your notes, meetings, and tasks. Check answers before you share them.',
    icon: FiMessageSquare,
  },
  {
    id: 'marketplace',
    title: 'Marketplace agents',
    body: 'Browse featured agents, preview a trial, and add an agent to your workspace when you are ready.',
    icon: FiShoppingBag,
  },
];

export const DocumentationPage = () => {
  return (
    <section className="documentation-page" aria-label="Documentation">
      <div className="documentation-inner">
        <header className="documentation-hero">
          <h1>Documentation</h1>
          <p>Guides for KukuNotes — meetings, goals, calendar, chat, and marketplace agents.</p>
        </header>

        <div className="documentation-grid">
          {GUIDES.map((guide) => {
            const Icon = guide.icon;
            return (
              <article className="documentation-card" key={guide.id}>
                <span className="documentation-card__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <h2>{guide.title}</h2>
                <p>{guide.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
