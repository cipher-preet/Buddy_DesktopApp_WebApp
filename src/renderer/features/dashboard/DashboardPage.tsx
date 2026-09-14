import { useMemo, useState } from 'react';
import {
  FiCalendar,
  FiFileText,
  FiFolder,
  FiPlus,
  FiUser,
} from 'react-icons/fi';

type Space = {
  id: string;
  name: string;
  description: string;
  owner: string;
  updatedAt: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    owner: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'done' | 'open' | 'review';
  }>;
  notes: Array<{
    id: string;
    title: string;
    excerpt: string;
  }>;
};

type ActiveSection = 'tasks' | 'notes';

const spaces: Space[] = [
  {
    id: 'product',
    name: 'Product Planning',
    description: 'Roadmap, feature notes, and weekly product decisions.',
    owner: 'Preet Kumar',
    updatedAt: 'Today',
    tasks: [
      {
        id: 't1',
        title: 'Finalize dashboard IA',
        description:
          'Lock the Home page structure by confirming how the spaces list behaves, how the selected folder loads its content, and how users move between the Tasks and Notes views without losing context.',
        dueDate: 'Today',
        owner: 'Preet Kumar',
        priority: 'High',
        status: 'open',
      },
      {
        id: 't2',
        title: 'Review task and note empty states',
        description:
          'Create clear empty states for new spaces, including helpful copy, an obvious primary action, and enough visual structure so the page still feels complete when no tasks or notes exist.',
        dueDate: 'Design review',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'review',
      },
      {
        id: 't3',
        title: 'Confirm sidebar folder behavior',
        description:
          'Validate active states, keyboard focus, long folder names, spacing, and scrolling behavior so the spaces sidebar remains predictable when the user has many folders.',
        dueDate: 'Completed',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'done',
      },
      {
        id: 't9',
        title: 'Define task detail density',
        description:
          'Decide which task fields should always be visible in the card view, including the description, owner, date, priority, and completion state, so the interface stays useful without becoming visually heavy.',
        dueDate: 'Today',
        owner: 'Preet Kumar',
        priority: 'High',
        status: 'open',
      },
      {
        id: 't10',
        title: 'Tune note card readability',
        description:
          'Review the note cards at different text lengths and make sure long descriptions remain readable, wrap naturally, and keep consistent spacing across compact and expanded workspace states.',
        dueDate: 'Tomorrow',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'review',
      },
      {
        id: 't11',
        title: 'Prepare folder creation flow',
        description:
          'Outline the first version of the create-space flow, including the naming field, optional description, default task and note sections, and where the new folder should appear after creation.',
        dueDate: 'This week',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'open',
      },
      {
        id: 't12',
        title: 'Document responsive behavior',
        description:
          'Write down how the spaces list, segmented switch, task cards, and notes should adapt when the meeting panel is collapsed or when the app window becomes narrow.',
        dueDate: 'Friday',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'open',
      },
      {
        id: 't13',
        title: 'Review accessibility labels',
        description:
          'Check that buttons, tabs, folder selections, and task completion controls have clear accessible labels and that keyboard users can move through the workspace predictably.',
        dueDate: 'Next sprint',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'done',
      },
    ],
    notes: [
      {
        id: 'n1',
        title: 'Home workspace direction',
        excerpt:
          'The Home workspace should behave like a focused folder system. A user selects a space on the left, then reviews the work connected to that space on the right. The right side should stay calm and task-oriented, with a simple switch between operational tasks and written notes.',
      },
      {
        id: 'n2',
        title: 'Navigation cleanup',
        excerpt:
          'The global shell should stay visually quiet while the Home page carries the working context. Navigation, spacing, and content density should help the user scan quickly without making the dashboard feel empty or oversized.',
      },
      {
        id: 'n7',
        title: 'Task card information design',
        excerpt:
          'Task cards should be descriptive enough that a user understands the work without opening a separate detail view. The title should describe the outcome, the paragraph should explain the reason and scope, and the compact metadata row should only support quick scanning.',
      },
      {
        id: 'n8',
        title: 'Spaces sidebar behavior',
        excerpt:
          'The spaces sidebar should feel like a folder list rather than a settings menu. It needs clear selected states, predictable ordering, and enough room for longer names while keeping the main task and note content visually dominant.',
      },
      {
        id: 'n9',
        title: 'Professional density target',
        excerpt:
          'The target density is closer to a productivity dashboard than a marketing page. Cards can contain meaningful content, but headings, chips, controls, and spacing should stay compact enough for repeated daily use.',
      },
      {
        id: 'n10',
        title: 'Notes section expectation',
        excerpt:
          'Notes should read like useful written context, not metadata logs. Each note needs a clear heading and a descriptive paragraph that captures the decision, idea, or summary the user may want to revisit later.',
      },
      {
        id: 'n11',
        title: 'Scroll behavior review',
        excerpt:
          'Long workspaces should scroll smoothly without breaking the app shell. The user should be able to keep the main navigation and top search available while reviewing larger task and note collections inside the Home page.',
      },
    ],
  },
  {
    id: 'meetings',
    name: 'Meeting Notes',
    description: 'Transcripts, summaries, and follow-up items from calls.',
    owner: 'Preet Kumar',
    updatedAt: 'Yesterday',
    tasks: [
      {
        id: 't4',
        title: 'Send recap to stakeholders',
        description:
          'Prepare a concise recap with meeting decisions, open blockers, assigned owners, and the next set of follow-up actions so every stakeholder can quickly understand what changed.',
        dueDate: 'Tomorrow',
        owner: 'Preet Kumar',
        priority: 'High',
        status: 'open',
      },
      {
        id: 't5',
        title: 'Tag action items from kickoff',
        description:
          'Review the kickoff transcript, identify commitments and unresolved questions, then convert each meaningful follow-up into a task with an owner and expected completion date.',
        dueDate: 'In review',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'review',
      },
    ],
    notes: [
      {
        id: 'n3',
        title: 'New Account Kickoff',
        excerpt:
          'The kickoff focused on customer goals, onboarding expectations, and the biggest risks for the first implementation phase. The team agreed to prioritize fast setup, clear ownership, and weekly check-ins until the account reaches a stable workflow.',
      },
      {
        id: 'n4',
        title: 'Team Wins',
        excerpt:
          'The team reviewed progress across active projects, called out completed design updates, and identified areas where coordination improved. The main takeaway was to keep decisions documented close to the related work so follow-up stays easy.',
      },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Ideas, references, competitive notes, and experiments.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 10',
    tasks: [
      {
        id: 't6',
        title: 'Collect AI assistant examples',
        description:
          'Collect examples of strong productivity assistant layouts, with attention to sidebar hierarchy, content switching, dense card design, and how apps balance notes, tasks, and meetings in one workspace.',
        dueDate: 'Backlog',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'open',
      },
      {
        id: 't7',
        title: 'Summarize UX patterns',
        description:
          'Summarize repeated UI patterns from the research set, including how selected states, segmented controls, card metadata, and empty states are handled across mature productivity tools.',
        dueDate: 'Completed',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'done',
      },
    ],
    notes: [
      {
        id: 'n5',
        title: 'Assistant dashboard patterns',
        excerpt:
          'Strong assistant dashboards usually combine a stable global shell with page-level navigation. The most usable examples keep controls compact, separate folders from content, and use dense but readable cards for activities that need quick review.',
      },
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Private reminders, learning notes, and personal planning.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 8',
    tasks: [
      {
        id: 't8',
        title: 'Create weekly planning template',
        description:
          'Prepare a weekly planning structure that captures priorities, review notes, reminders, and unfinished work. The template should be reusable enough for personal planning without feeling heavy.',
        dueDate: 'Next week',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'open',
      },
    ],
    notes: [
      {
        id: 'n6',
        title: 'Learning queue',
        excerpt:
          'This queue collects topics to revisit while improving the desktop assistant, including better local data organization, smoother page transitions, more useful task metadata, and cleaner note-writing patterns.',
      },
    ],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Implementation tasks, architecture notes, and technical follow-ups.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 7',
    tasks: [
      {
        id: 't14',
        title: 'Create API service conventions',
        description:
          'Define how RTK Query endpoints should be grouped, named, tagged, and exported so future API work follows one predictable pattern across the desktop app.',
        dueDate: 'This week',
        owner: 'Preet Kumar',
        priority: 'High',
        status: 'open',
      },
      {
        id: 't15',
        title: 'Plan local storage strategy',
        description:
          'Decide which user preferences should live in Electron storage, which should come from the backend, and how to avoid mixing local UI state with synchronized workspace data.',
        dueDate: 'Next week',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'review',
      },
    ],
    notes: [
      {
        id: 'n12',
        title: 'Renderer architecture',
        excerpt:
          'The renderer should keep feature modules isolated, use shared components for repeated interface patterns, and keep API communication centralized through the RTK Query service layer.',
      },
      {
        id: 'n13',
        title: 'Electron process boundary',
        excerpt:
          'The preload bridge should expose only safe, intentional APIs to the renderer. Any future filesystem, settings, or native integrations should pass through small typed methods rather than direct Node access.',
      },
    ],
  },
  {
    id: 'design-system',
    name: 'Design System',
    description: 'Tokens, components, interaction states, and shared UI rules.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 6',
    tasks: [
      {
        id: 't16',
        title: 'Audit shared CSS variables',
        description:
          'Review colors, spacing, font sizes, shadows, and layout variables to remove duplicates and make sure every new screen can reuse the same visual foundation.',
        dueDate: 'Sep 15',
        owner: 'Preet Kumar',
        priority: 'Medium',
        status: 'open',
      },
    ],
    notes: [
      {
        id: 'n14',
        title: 'Component consistency',
        excerpt:
          'Buttons, panels, segmented controls, chips, and cards should share the same radius, border color, and type scale so each feature feels like part of one desktop product.',
      },
    ],
  },
  {
    id: 'customer-success',
    name: 'Customer Success',
    description: 'Customer conversations, onboarding plans, and account follow-ups.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 5',
    tasks: [
      {
        id: 't17',
        title: 'Draft onboarding checklist',
        description:
          'Create a reusable checklist for new customers that covers setup steps, success criteria, first-week follow-ups, and owners for every important handoff.',
        dueDate: 'Sep 18',
        owner: 'Preet Kumar',
        priority: 'High',
        status: 'open',
      },
    ],
    notes: [
      {
        id: 'n15',
        title: 'Onboarding risks',
        excerpt:
          'The most common onboarding risks are unclear ownership, missing context after kickoff calls, and not converting meeting decisions into visible follow-up tasks quickly enough.',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Launch ideas, positioning notes, and campaign planning.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 3',
    tasks: [
      {
        id: 't18',
        title: 'Collect launch messaging ideas',
        description:
          'Gather short positioning statements that explain the desktop assistant as a practical workspace for tasks, notes, meetings, and personal knowledge.',
        dueDate: 'Backlog',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'open',
      },
    ],
    notes: [
      {
        id: 'n16',
        title: 'Positioning angle',
        excerpt:
          'The strongest positioning is not just an AI chat surface. It is a persistent desktop workspace that keeps folders, tasks, notes, and meeting context organized in one place.',
      },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Budget notes, subscription tracking, and planning references.',
    owner: 'Preet Kumar',
    updatedAt: 'Sep 1',
    tasks: [
      {
        id: 't19',
        title: 'Track recurring tools',
        description:
          'Create a small list of active subscriptions, renewal dates, owners, and usage notes so budget decisions can be reviewed without searching through separate documents.',
        dueDate: 'Monthly',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'review',
      },
    ],
    notes: [
      {
        id: 'n17',
        title: 'Budget workspace idea',
        excerpt:
          'Finance notes should prioritize quick review and recurring reminders. The space can eventually combine lightweight tasks with short notes for decisions and renewal context.',
      },
    ],
  },
  {
    id: 'archive',
    name: 'Archive',
    description: 'Older notes and completed planning references.',
    owner: 'Preet Kumar',
    updatedAt: 'Aug 28',
    tasks: [
      {
        id: 't20',
        title: 'Clean old planning notes',
        description:
          'Review older planning notes, keep anything still useful, and move stale decisions out of active spaces so the main workspace remains focused.',
        dueDate: 'Someday',
        owner: 'Preet Kumar',
        priority: 'Low',
        status: 'open',
      },
    ],
    notes: [
      {
        id: 'n18',
        title: 'Archive purpose',
        excerpt:
          'The archive should keep historical context available without letting older work crowd the active spaces. It is useful for reference, but should not compete with current task lists.',
      },
    ],
  },
];

const statusLabel = {
  done: 'Done',
  open: 'Open',
  review: 'Review',
} satisfies Record<Space['tasks'][number]['status'], string>;

export const DashboardPage = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState(spaces[0].id);
  const [activeSection, setActiveSection] = useState<ActiveSection>('tasks');
  const [completedTaskIds, setCompletedTaskIds] = useState(
    () => new Set(spaces.flatMap((space) => space.tasks.filter((task) => task.status === 'done').map((task) => task.id))),
  );

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? spaces[0],
    [selectedSpaceId],
  );

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds((currentTaskIds) => {
      const nextTaskIds = new Set(currentTaskIds);

      if (nextTaskIds.has(taskId)) {
        nextTaskIds.delete(taskId);
        return nextTaskIds;
      }

      nextTaskIds.add(taskId);
      return nextTaskIds;
    });
  };

  return (
    <section className="home-workspace" aria-label="Home workspace">
      <aside className="spaces-panel" aria-label="Spaces">
        <div className="spaces-panel__header">
          <div>
            <p>Workspace</p>
            <h2>Spaces</h2>
          </div>
          <button type="button" aria-label="Create space">
            <FiPlus aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="spaces-list">
          {spaces.map((space) => (
            <button
              className="space-item"
              data-active={space.id === selectedSpace.id ? 'true' : undefined}
              key={space.id}
              type="button"
              onClick={() => setSelectedSpaceId(space.id)}
            >
              <span className="space-item__icon">
                <FiFolder aria-hidden="true" size={17} />
              </span>
              <span className="space-item__content">
                <strong>{space.name}</strong>
                <small>{space.updatedAt}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-detail">
        <div className="space-switch" role="tablist" aria-label="Space content">
          <button
            className="space-switch__button"
            data-active={activeSection === 'tasks' ? 'true' : undefined}
            type="button"
            role="tab"
            aria-selected={activeSection === 'tasks'}
            onClick={() => setActiveSection('tasks')}
          >
            Tasks
          </button>
          <button
            className="space-switch__button"
            data-active={activeSection === 'notes' ? 'true' : undefined}
            type="button"
            role="tab"
            aria-selected={activeSection === 'notes'}
            onClick={() => setActiveSection('notes')}
          >
            Notes
          </button>
        </div>

        <div className="space-sections">
          {activeSection === 'tasks' ? (
            <section className="workspace-card" aria-label="Tasks">
              <div className="task-stack">
                {selectedSpace.tasks.map((task) => {
                  const isDone = completedTaskIds.has(task.id);

                  return (
                    <article className="task-card" data-status={isDone ? 'done' : task.status} key={task.id}>
                      <label className="task-card__toggle" aria-label={`Mark ${task.title} done`}>
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleTaskCompletion(task.id)}
                        />
                        <span />
                      </label>
                      <div className="task-card__content">
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                        <div className="task-card__meta">
                          <span>
                            <FiCalendar aria-hidden="true" size={13} />
                            {task.dueDate}
                          </span>
                          <span>
                            <FiUser aria-hidden="true" size={13} />
                            {task.owner}
                          </span>
                          <span data-priority={task.priority}>{task.priority}</span>
                        </div>
                      </div>
                      <span className="task-card__status">{isDone ? 'Done' : statusLabel[task.status]}</span>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="workspace-card" aria-label="Notes">
              <div className="notes-stack">
                {selectedSpace.notes.map((note) => (
                  <article className="space-note" key={note.id}>
                    <span className="space-note__icon">
                      <FiFileText aria-hidden="true" size={16} />
                    </span>
                    <div>
                      <h3>{note.title}</h3>
                      <p>{note.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
};
