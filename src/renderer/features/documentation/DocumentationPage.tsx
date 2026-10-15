import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import './documentation.css';

const SECTIONS = [
  { id: 'what-is-kukunotes', title: 'What is KukuNotes?' },
  { id: 'how-to-use-the-docs', title: 'How to use the docs' },
  { id: 'core-ideas', title: 'Core ideas' },
  { id: 'getting-started', title: 'Getting started' },
  { id: 'home', title: 'Home & spaces' },
  { id: 'listening', title: 'Record & listening' },
  { id: 'meetings', title: 'Meetings' },
  { id: 'goals', title: 'Achieve Goal' },
  { id: 'document-it', title: 'Document it' },
  { id: 'mindmap', title: 'Mindmap' },
  { id: 'chat', title: 'AI Chat' },
  { id: 'calendar', title: 'Calendar' },
  { id: 'integrations', title: 'Integrations' },
  { id: 'marketplace', title: 'Marketplace' },
  { id: 'settings', title: 'Settings' },
  { id: 'privacy', title: 'Privacy & control' },
  { id: 'next-steps', title: 'Next steps' },
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
          <p className="documentation-lead">
            Welcome to the KukuNotes documentation. This guide explains every main feature in the
            desktop and web app — what it does, why it helps, and how to use it in simple steps.
          </p>
          <p>
            Prefer a product overview first? Visit{' '}
            <a href="https://kukunotes.com/" target="_blank" rel="noreferrer">
              kukunotes.com
            </a>
            .
          </p>

          <section id="what-is-kukunotes" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('what-is-kukunotes')}
              >
                #
              </button>
              What is KukuNotes?
            </h2>
            <p>
              KukuNotes is your personal AI assistant for real conversations. It helps you{' '}
              <strong>capture</strong> meetings and discussions, <strong>organize</strong> them into
              spaces with notes and tasks, and <strong>grow</strong> with goals, documents, and AI
              chat grounded in what you already lived.
            </p>
            <p>
              Unlike tools that send a recording bot into Zoom or Google Meet, KukuNotes is{' '}
              <strong>opt-in</strong>: you start listening when a conversation is worth keeping. Notes,
              tasks, and summaries stay connected to the space you chose.
            </p>
            <h3>Why use KukuNotes?</h3>
            <ul>
              <li>
                <strong>Stop losing decisions</strong> — meetings become searchable notes and clear
                next steps.
              </li>
              <li>
                <strong>Keep work in context</strong> — each project or area of life gets its own
                space.
              </li>
              <li>
                <strong>Ask from your own history</strong> — AI Chat answers from your spaces, notes,
                and meetings, not a blank chat.
              </li>
              <li>
                <strong>Stay in control</strong> — listening is a choice, and sharing is selective.
              </li>
            </ul>
          </section>

          <section id="how-to-use-the-docs" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('how-to-use-the-docs')}
              >
                #
              </button>
              How to use the docs
            </h2>
            <p>Each feature guide follows the same pattern:</p>
            <ul>
              <li>
                <strong>What it is</strong> — a short plain explanation.
              </li>
              <li>
                <strong>Why use it</strong> — the benefit in everyday work.
              </li>
              <li>
                <strong>How to use it</strong> — simple steps matching the buttons you see in the app.
              </li>
            </ul>
            <p>
              Use the left sidebar to open a product area, or jump with the{' '}
              <strong>On this page</strong> links on the right.
            </p>
          </section>

          <section id="core-ideas" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('core-ideas')}
              >
                #
              </button>
              Core ideas
            </h2>
            <h3>Spaces</h3>
            <p>
              A <strong>space</strong> is a home for one project, client, meeting series, or part of
              life. Notes, tasks, documents, mind maps, and recordings stay inside that space so work
              does not mix together.
            </p>
            <h3>Capture once, use everywhere</h3>
            <p>
              When you listen to a conversation, KukuNotes can create a transcript, summary, notes,
              and tasks. Those items live in the space you picked, and you can ask about them later in
              AI Chat or turn them into Word documents with Document it.
            </p>
            <h3>Selective sharing</h3>
            <p>
              You choose exactly which notes and tasks leave a space. Everything else stays private to
              that space.
            </p>
          </section>

          <section id="getting-started" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('getting-started')}
              >
                #
              </button>
              Getting started
            </h2>
            <p>
              Sign in, create your first space, then capture one conversation. That is enough to see
              the full KukuNotes loop.
            </p>
            <h3>How to get started</h3>
            <ol>
              <li>Open KukuNotes and sign in.</li>
              <li>
                Go to <strong>Home</strong> and create a space (for example “Product Launch” or
                “Client X”).
              </li>
              <li>
                Click <strong>Record</strong> at the top, pick that space, and begin capture when the
                conversation starts.
              </li>
              <li>
                When you stop, open <strong>Meetings</strong> to review the summary, transcript,
                notes, and tasks.
              </li>
              <li>
                Back on <strong>Home</strong>, manage tasks and notes for that space, or ask{' '}
                <strong>AI Chat</strong> what was decided.
              </li>
            </ol>
          </section>

          <section id="home" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('home')}>
                #
              </button>
              Home &amp; spaces
            </h2>
            <p>
              <strong>Home</strong> is your main workspace. Pick a space on the left, then work with
              its tasks, notes, documents, and mind map in one place.
            </p>
            <h3>Why use Home?</h3>
            <ul>
              <li>See overdue and priority tasks without opening another tool.</li>
              <li>Keep notes next to the work they belong to.</li>
              <li>Generate documents or a mind map from the same space context.</li>
            </ul>
            <h3>How to use Home</h3>
            <ol>
              <li>
                Open <strong>Home</strong> from the sidebar.
              </li>
              <li>
                Create or select a space. You can rename or delete a space from its menu when needed.
              </li>
              <li>
                Switch between <strong>Tasks</strong>, <strong>Notes</strong>,{' '}
                <strong>Document</strong>, and <strong>Mindmap</strong> tabs for that space.
              </li>
              <li>
                Use <strong>Create</strong> to add a task or note. Edit or delete items from each
                card’s menu.
              </li>
              <li>
                Mark tasks done as you finish them so priorities stay honest.
              </li>
            </ol>
            <h3>Share from a space</h3>
            <p>
              With a space selected, open the side panel <strong>Share</strong> tab. Share the full
              space or pick specific notes and tasks, then export (for example as PDF). Only what you
              select leaves the space.
            </p>
          </section>

          <section id="listening" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('listening')}
              >
                #
              </button>
              Record &amp; listening
            </h2>
            <p>
              The header <strong>Record</strong> button starts an opt-in voice session for a meeting,
              walk, class, or working session. Capture only starts when you choose it — the mic is not
              on in the background.
            </p>
            <h3>Why use Record?</h3>
            <ul>
              <li>No invite bot joins your call.</li>
              <li>Everything lands in the space you select.</li>
              <li>You get a path from conversation → summary → notes and tasks.</li>
            </ul>
            <h3>How to use it</h3>
            <ol>
              <li>
                Click <strong>Record</strong> at the top of the app. If your plan’s recording time is
                used up, you will be asked to upgrade first.
              </li>
              <li>
                In the voice session dialog, select a space — or create a <strong>New space</strong>.
              </li>
              <li>
                Confirm <strong>Record</strong> to begin capture.
              </li>
              <li>
                Use the recording bar to <strong>Pause</strong>, <strong>Resume</strong>, or{' '}
                <strong>Stop</strong>.
              </li>
              <li>
                After processing, review the session under <strong>Meetings</strong>, and check notes
                and tasks on <strong>Home</strong> for that space.
              </li>
            </ol>
          </section>

          <section id="meetings" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('meetings')}
              >
                #
              </button>
              Meetings
            </h2>
            <p>
              <strong>Meetings</strong> is your library of recorded sessions. Open any meeting to
              review the AI summary, full transcript, extracted tasks, and notes.
            </p>
            <h3>Why use Meetings?</h3>
            <ul>
              <li>Replay what was said without scrubbing a long recording alone.</li>
              <li>Turn commitments into tasks with one place to check them.</li>
              <li>Assign a meeting to the right space so Home stays organized.</li>
            </ul>
            <h3>How to use Meetings</h3>
            <ol>
              <li>
                Open <strong>Meetings</strong> from the sidebar.
              </li>
              <li>Switch between grid and list views, and search if you have many sessions.</li>
              <li>Open a meeting card to see details.</li>
              <li>
                Use the tabs: <strong>Summary</strong>, <strong>Transcript</strong>,{' '}
                <strong>Tasks</strong>, and <strong>Notes</strong>.
              </li>
              <li>
                Assign the meeting to a space from the space menu on the card when needed.
              </li>
              <li>
                Delete a meeting only when you are sure — you will get a confirmation first.
              </li>
            </ol>
            <p>
              Tip: inside a meeting you can also use chat scoped to that meeting to ask “What were the
              action items?” or “What decisions were made?”
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
              <strong>Achieve Goal</strong> turns a goal statement into a guided plan: strategies,
              steps, and progress you can track over time.
            </p>
            <h3>Why use Achieve Goal?</h3>
            <ul>
              <li>Break a big outcome into steps you can finish.</li>
              <li>See strategies and recommended next moves in one dashboard.</li>
              <li>Keep personal or project goals next to the rest of your KukuNotes work.</li>
            </ul>
            <h3>How to use Achieve Goal</h3>
            <ol>
              <li>
                Open <strong>Achieve Goal</strong>.
              </li>
              <li>
                Type what you want to achieve (for example: “Become a full-stack developer in 6
                months”), or tap a suggestion tag.
              </li>
              <li>
                Press the send arrow to start. Complete the setup steps (including spaces and plan
                review), then <strong>Approve</strong>.
              </li>
              <li>
                Open a goal card to see progress, strategies, steps, and recommendations.
              </li>
              <li>
                Use the vertical ⋮ menu on a goal card to delete it — confirm before it is removed.
              </li>
            </ol>
          </section>

          <section id="document-it" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('document-it')}
              >
                #
              </button>
              Document it
            </h2>
            <p>
              <strong>Document it</strong> turns the work already in a space into a polished Word
              document using ready-made templates (meeting recap, weekly planner, project status, and
              more).
            </p>
            <h3>Why use Document it?</h3>
            <ul>
              <li>Save time writing handoffs, recaps, and plans.</li>
              <li>Ground the document in real notes and tasks from one space.</li>
              <li>Download a DOCX you can share outside KukuNotes.</li>
            </ul>
            <h3>How to use Document it</h3>
            <ol>
              <li>
                Open <strong>Document it</strong> (or the Document tab inside a space on Home).
              </li>
              <li>Choose a template that matches what you need.</li>
              <li>
                Select one space, then click <strong>Document it</strong> to start generation.
              </li>
              <li>Wait until the status shows the document is ready.</li>
              <li>
                Use <strong>Preview</strong> to read it in the app, or <strong>Download DOCX</strong>{' '}
                to save the file.
              </li>
            </ol>
            <p>
              Preview is available after generation finishes — not before you start — so you always
              preview the real document.
            </p>
          </section>

          <section id="mindmap" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('mindmap')}
              >
                #
              </button>
              Mindmap
            </h2>
            <p>
              <strong>Mindmap</strong> builds a visual map of a space — themes, links, and structure —
              so you can see the big picture at a glance.
            </p>
            <h3>Why use Mindmap?</h3>
            <ul>
              <li>Understand how topics in a space connect.</li>
              <li>Spot gaps or clusters before planning next work.</li>
              <li>Share a clearer picture than a long list of notes.</li>
            </ul>
            <h3>How to use Mindmap</h3>
            <ol>
              <li>
                Open <strong>Mindmap</strong> from the sidebar, or use the Mindmap tab on Home for a
                space.
              </li>
              <li>Pick the space you want to map.</li>
              <li>
                Click <strong>Generate mind map</strong> (or <strong>View mind map</strong> if one
                already exists).
              </li>
              <li>Explore the canvas when generation completes.</li>
            </ol>
          </section>

          <section id="chat" className="documentation-section">
            <h2>
              <button type="button" className="documentation-anchor" onClick={() => scrollToSection('chat')}>
                #
              </button>
              AI Chat
            </h2>
            <p>
              <strong>AI Chat</strong> lets you ask questions in plain language. Answers come from
              your spaces, notes, tasks, and meetings — not from a blank general chat.
            </p>
            <h3>Why use AI Chat?</h3>
            <ul>
              <li>Find decisions and open tasks without searching manually.</li>
              <li>Summarize a day or a meeting in seconds.</li>
              <li>Create follow-up tasks from what the chat finds.</li>
            </ul>
            <h3>How to use AI Chat</h3>
            <ol>
              <li>
                Open <strong>AI Chat</strong> from the sidebar, or use the AI Chat side panel when you
                are on another page.
              </li>
              <li>
                Optionally click <strong>Add context</strong> and pick spaces so answers stay focused.
              </li>
              <li>
                Ask something like “What tasks are still open?” or “Summarize my day.”
              </li>
              <li>Use suggestions if you want a quick starting prompt.</li>
              <li>
                Open chat history from the title menu, or start a <strong>New</strong> thread anytime.
              </li>
              <li>
                Inside a meeting detail page, chat can stay scoped to that meeting (summary, action
                items, decisions).
              </li>
            </ol>
          </section>

          <section id="calendar" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('calendar')}
              >
                #
              </button>
              Calendar
            </h2>
            <p>
              <strong>Calendar</strong> shows your schedule in month, week, or day views. Create
              events in KukuNotes and connect Google Calendar so upcoming meetings stay visible next
              to your work.
            </p>
            <h3>Why use Calendar?</h3>
            <ul>
              <li>See meetings and focus time in the same app as notes and tasks.</li>
              <li>Jump from the schedule into the right context faster.</li>
              <li>Set reminders so important events are harder to miss.</li>
            </ul>
            <h3>How to use Calendar</h3>
            <ol>
              <li>
                Open <strong>Calendar</strong>.
              </li>
              <li>
                Use <strong>Today</strong>, prev/next, or the month picker to move around.
              </li>
              <li>
                Switch <strong>Month</strong>, <strong>Week</strong>, or <strong>Day</strong> as you
                prefer.
              </li>
              <li>
                Click <strong>Add Event</strong> to create an event with title, time, location, and
                optional reminder.
              </li>
              <li>
                To sync Google Calendar, connect it under <strong>Integrations</strong>, then use{' '}
                <strong>Sync now</strong> when you want the latest events.
              </li>
            </ol>
          </section>

          <section id="integrations" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('integrations')}
              >
                #
              </button>
              Integrations
            </h2>
            <p>
              <strong>Integrations</strong> connects KukuNotes to tools you already use. Google
              Calendar connect and sync are available in the app today. Other connectors (Outlook,
              Zoom, Slack, Dropbox, Salesforce, HubSpot) appear as upcoming options.
            </p>
            <h3>Why use Integrations?</h3>
            <ul>
              <li>Bring your schedule into KukuNotes without copying events by hand.</li>
              <li>Keep capture and follow-up close to the tools your team already trusts.</li>
            </ul>
            <h3>How to connect Google Calendar</h3>
            <ol>
              <li>
                Open <strong>Integrations</strong>.
              </li>
              <li>
                Find <strong>Google Calendar</strong> and click connect.
              </li>
              <li>Complete sign-in in the browser window that opens.</li>
              <li>
                Return to KukuNotes and use <strong>Sync</strong> when you want the latest events.
              </li>
              <li>Disconnect anytime from the same card if you no longer want the link.</li>
            </ol>
          </section>

          <section id="marketplace" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('marketplace')}
              >
                #
              </button>
              Marketplace
            </h2>
            <p>
              <strong>Marketplace</strong> lists featured AI agents that extend KukuNotes for
              specialized workflows — for example competitor analysis, LinkedIn automation, hiring
              screeners, and weekly ops reporting.
            </p>
            <h3>Why use Marketplace?</h3>
            <ul>
              <li>Browse focused helpers without leaving your workspace.</li>
              <li>Hiring is rolling out soon — you can explore agents today.</li>
            </ul>
            <h3>How to use Marketplace</h3>
            <ol>
              <li>
                Open <strong>Marketplace</strong>.
              </li>
              <li>Browse featured agents and read what each one does.</li>
              <li>
                Click <strong>Hire Agent</strong> to reserve interest — hiring opens when agents go
                live.
              </li>
            </ol>
          </section>

          <section id="settings" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('settings')}
              >
                #
              </button>
              Settings
            </h2>
            <p>
              <strong>Settings</strong> is where you manage your profile, plan, feedback, support,
              logout, and account deletion.
            </p>
            <h3>What you can do</h3>
            <ul>
              <li>
                <strong>Profile</strong> — update your name and basic account details.
              </li>
              <li>
                <strong>Workspace shortcuts</strong> — jump back to Home Notes, Tasks, or Spaces.
              </li>
              <li>
                <strong>Plans</strong> — see your current plan and upgrade when you need more
                notes recording, meeting recording, mindmaps, documents, goals, or marketplace
                installs.
              </li>
              <li>
                <strong>Feedback</strong> — tell the team what is working or broken.
              </li>
              <li>
                <strong>Help &amp; Support</strong> — open a ticket or contact support if you need
                help.
              </li>
              <li>
                <strong>Log out</strong> or <strong>Delete account</strong> — with a clear
                confirmation before anything destructive happens.
              </li>
            </ul>
          </section>

          <section id="privacy" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('privacy')}
              >
                #
              </button>
              Privacy &amp; control
            </h2>
            <p>KukuNotes is designed so useful capture never means “always listening.”</p>
            <ul>
              <li>
                <strong>Listening is opt-in</strong> — capture starts only when you tap{' '}
                <strong>Record</strong>.
              </li>
              <li>
                <strong>Spaces stay separate</strong> — projects and personal planning do not collapse
                into one stream.
              </li>
              <li>
                <strong>Sharing is a choice</strong> — you pick the exact notes and tasks someone else
                should see.
              </li>
            </ul>
            <p>
              Learn more about the product on{' '}
              <a href="https://kukunotes.com/" target="_blank" rel="noreferrer">
                kukunotes.com
              </a>
              .
            </p>
          </section>

          <section id="next-steps" className="documentation-section">
            <h2>
              <button
                type="button"
                className="documentation-anchor"
                onClick={() => scrollToSection('next-steps')}
              >
                #
              </button>
              Next steps
            </h2>
            <p>Pick one path and try it today:</p>
            <a
              className="documentation-next"
              href="#getting-started"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection('getting-started');
              }}
            >
              <span className="documentation-next__copy">
                <strong>Getting started</strong>
                <small>Create a space, start listening, and review your first meeting.</small>
              </span>
              <FiArrowRight aria-hidden="true" size={18} />
            </a>
            <a
              className="documentation-next"
              href="#home"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection('home');
              }}
            >
              <span className="documentation-next__copy">
                <strong>Home &amp; spaces</strong>
                <small>Organize tasks and notes, then share only what you choose.</small>
              </span>
              <FiArrowRight aria-hidden="true" size={18} />
            </a>
            <a
              className="documentation-next"
              href="#chat"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection('chat');
              }}
            >
              <span className="documentation-next__copy">
                <strong>AI Chat</strong>
                <small>Ask questions grounded in your real notes and meetings.</small>
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
