import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import './documentation.css';

const SECTIONS = [
  { id: 'what-is-kukunotes', title: 'What is KukuNotes?' },
  { id: 'how-to-use-the-docs', title: 'How to use the docs' },
  { id: 'getting-started', title: 'Getting started' },
  { id: 'meetings', title: 'Meetings & recording' },
  { id: 'goals', title: 'Achieve Goal' },
  { id: 'calendar', title: 'Calendar' },
  { id: 'chat', title: 'AI Chat' },
  { id: 'marketplace', title: 'Marketplace agents' },
  { id: 'next-steps', title: 'Next Steps' },
] as const;

export const DocumentationPage = () => {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  const sectionIds = useMemo(() => SECTIONS.map((section) => section.id), []);

  useEffect(() => {
    const nodes = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (nodes.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.1, 0.35, 0.6],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    const node = document.getElementById(id);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <section className="documentation-page" aria-label="Documentation">
      <div className="documentation-layout">
        <article className="documentation-article">
          <h1>KukuNotes Docs</h1>
          <p className="documentation-lead">Welcome to the KukuNotes documentation!</p>

          <section id="what-is-kukunotes" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('what-is-kukunotes')}>
                #
              </button>
              What is KukuNotes?
            </h2>
            <p>
              KukuNotes is an AI workspace for meetings, notes, tasks, and follow-ups. Record a call,
              capture context, and let KukuNotes turn the conversation into summaries, action items,
              and searchable notes.
            </p>
            <p>
              You can keep work organized in spaces, ask questions in AI Chat, plan goals, connect your
              calendar, and extend your workspace with marketplace agents — so your team can move from
              conversation to execution faster.
            </p>
          </section>

          <section id="how-to-use-the-docs" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('how-to-use-the-docs')}>
                #
              </button>
              How to use the docs
            </h2>
            <p>The docs are organized into focused guides:</p>
            <ul>
              <li>
                <strong>Getting started:</strong> Create a space, record a meeting, and review the first
                notes and tasks.
              </li>
              <li>
                <strong>Product guides:</strong> Learn meetings, goals, calendar, chat, and marketplace
                agents.
              </li>
              <li>
                <strong>Next steps:</strong> Jump into the workflows that matter most for your team.
              </li>
            </ul>
            <p>
              Use the sidebar to move between product areas, or jump with the{' '}
              <strong>On this page</strong> links on the right.
            </p>
          </section>

          <section id="getting-started" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('getting-started')}>
                #
              </button>
              Getting started
            </h2>
            <p>
              Create a space for a project or team, then start a recording or connect a calendar event.
              After the meeting ends, KukuNotes prepares notes, tasks, and follow-ups you can edit and
              share.
            </p>
            <p>
              Keep related work in the same space so transcripts, notes, and tasks stay easy to find
              later.
            </p>
          </section>

          <section id="meetings" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('meetings')}>
                #
              </button>
              Meetings &amp; recording
            </h2>
            <p>
              Start a recording from the Record button, add context when needed, and review the
              transcript, summary, and action items after the call.
            </p>
            <p>
              Open a meeting detail page to replay key moments, refine notes, and turn follow-ups into
              tasks without leaving KukuNotes.
            </p>
          </section>

          <section id="goals" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('goals')}>
                #
              </button>
              Achieve Goal
            </h2>
            <p>
              Open a goal dashboard to track progress, reduction targets, and recommended next steps.
              Use strategies and step-by-step plans to break larger outcomes into work you can finish.
            </p>
          </section>

          <section id="calendar" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('calendar')}>
                #
              </button>
              Calendar
            </h2>
            <p>
              Connect Google Calendar so upcoming events appear in KukuNotes. Jump into the right
              meeting from your schedule, then keep notes attached to the same context.
            </p>
          </section>

          <section id="chat" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('chat')}>
                #
              </button>
              AI Chat
            </h2>
            <p>
              Ask questions about your notes, meetings, and tasks. Use chat to find decisions, draft
              follow-ups, and check answers before you share them with your team.
            </p>
          </section>

          <section id="marketplace" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('marketplace')}>
                #
              </button>
              Marketplace agents
            </h2>
            <p>
              Browse featured agents, preview a trial, and add an agent to your workspace when you are
              ready. Agents help extend KukuNotes for specialized workflows without leaving your
              existing spaces.
            </p>
          </section>

          <section id="next-steps" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('next-steps')}>
                #
              </button>
              Next Steps
            </h2>
            <p>Create your first space and learn the core KukuNotes workflows.</p>
            <a className="documentation-next" href="#getting-started" onClick={(event) => {
              event.preventDefault();
              scrollToSection('getting-started');
            }}>
              <span className="documentation-next__copy">
                <strong>Getting Started</strong>
                <small>Learn how to create spaces, record meetings, and review notes with KukuNotes.</small>
              </span>
              <FiArrowRight aria-hidden="true" size={18} />
            </a>
          </section>
        </article>

        <aside className="documentation-toc" aria-label="On this page">
          <p className="documentation-toc__title">On this page</p>
          <nav>
            <ul>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className={activeId === section.id ? 'is-active' : undefined}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </section>
  );
};
