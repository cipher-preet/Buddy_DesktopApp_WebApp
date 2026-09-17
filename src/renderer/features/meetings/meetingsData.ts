import type { MeetingRecord } from './meetingsTypes';

import cover1 from '@/assets/meetings/meeting-1.jpg';
import cover2 from '@/assets/meetings/meeting-2.jpg';
import cover3 from '@/assets/meetings/meeting-3.jpg';
import cover4 from '@/assets/meetings/meeting-4.jpg';
import cover5 from '@/assets/meetings/meeting-5.jpg';
import cover6 from '@/assets/meetings/meeting-6.jpg';

type MeetingSeed = Omit<MeetingRecord, 'tasks' | 'notes'>;

const participants = {
  arafat: { id: 'p1', name: 'Arafat', initials: 'AR', color: '#1355ff' },
  dana: { id: 'p2', name: 'Dana Wells', initials: 'DW', color: '#8c6df3' },
  mia: { id: 'p3', name: 'Mia Chen', initials: 'MC', color: '#0f8b63' },
  leo: { id: 'p4', name: 'Leo Park', initials: 'LP', color: '#f59e0b' },
  sara: { id: 'p5', name: 'Sara Kim', initials: 'SK', color: '#d92d20' },
  jordan: { id: 'p6', name: 'Jordan Lee', initials: 'JL', color: '#425761' },
};

export const MEETINGS_SEED: MeetingSeed[] = [
  {
    id: 'm1',
    title: 'Getting Started with CallWave A.I',
    dateLabel: 'May 1 2024',
    startLabel: '12:19 PM',
    endLabel: '12:49 PM',
    durationLabel: '30m',
    participantCount: 4,
    owner: 'Arafat',
    scope: 'mine',
    tags: ['General meeting', 'Onboarding'],
    thumbnailTone: 'blue',
    coverImage: cover1,
    layout: 'grid',
    participants: [participants.arafat, participants.dana, participants.mia, participants.leo],
    summaryIntro:
      'Kickoff session covering CallWave setup, workspace basics, and how Buddy captures meetings for follow-up.',
    keyTopics: 'Product walkthrough, recording workflow, and first workspace setup.',
    decisions: 'Adopt Buddy as the default capture tool for weekly syncs.',
    unresolved: 'Confirm SSO rollout timeline with IT.',
    takeaways: [
      {
        title: 'Workspace setup',
        detail: 'Created a shared CallWave space with default tags and owners.',
      },
      {
        title: 'Recording habits',
        detail: 'Agreed to start recording at the beginning of every customer call.',
      },
      {
        title: 'Follow-ups',
        detail: 'Buddy will draft action items automatically after each session.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Arafat',
        timeLabel: '0:12',
        text: 'Welcome everyone — today we will walk through CallWave and how Buddy fits in.',
      },
      {
        id: 't2',
        speaker: 'Dana Wells',
        timeLabel: '1:04',
        text: 'Can we also cover how shared meetings show up for the rest of the team?',
      },
      {
        id: 't3',
        speaker: 'Mia Chen',
        timeLabel: '3:22',
        text: 'The summary tabs look useful for people who miss the live call.',
      },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Leo Park',
        initials: 'LP',
        color: '#f59e0b',
        timeLabel: '2h ago',
        text: 'Great walkthrough — can we pin the SSO checklist here?',
      },
    ],
    attachments: [
      { id: 'a1', name: 'CallWave onboarding.pdf', sizeLabel: '1.2 MB', type: 'pdf' },
      { id: 'a2', name: 'Workspace checklist.docx', sizeLabel: '84 KB', type: 'doc' },
    ],
    suggestions: [
      'What setup steps were covered?',
      'Who owns the SSO follow-up?',
      'Summarize action items for the team',
    ],
  },
  {
    id: 'm2',
    title: 'Sprint Review Demo',
    dateLabel: 'March 12 2025',
    startLabel: '10:00 AM',
    endLabel: '10:45 AM',
    durationLabel: '45m',
    participantCount: 4,
    owner: 'Arafat',
    scope: 'mine',
    tags: ['Sprint', 'Design'],
    thumbnailTone: 'violet',
    coverImage: cover2,
    layout: 'duo',
    participants: [participants.arafat, participants.dana, participants.sara, participants.jordan],
    summaryIntro:
      'This meeting focused on the latest sprint updates, including completed development tasks, UI/UX improvements, and bug fixes. The team reviewed progress and discussed remaining issues.',
    keyTopics: 'Sprint accomplishments, UI refinements, and pending bug resolutions.',
    decisions: 'Finalized UI/UX refinements for navigation and dashboard layout.',
    unresolved: 'Minor UI adjustments and a few remaining bugs need attention.',
    takeaways: [
      {
        title: 'UI/UX Improvements',
        detail: 'Updated navigation flow and dashboard layout for better usability.',
      },
      {
        title: 'Bug Fixes',
        detail: 'Resolved critical login and notification issues.',
      },
      {
        title: 'Next Steps',
        detail: 'Address remaining UI polish items before the release candidate.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Arafat',
        timeLabel: '0:20',
        text: 'Let’s start with the navigation updates and then move into open bugs.',
      },
      {
        id: 't2',
        speaker: 'Dana Wells',
        timeLabel: '4:10',
        text: 'The new dashboard layout reduces clutter and keeps primary actions above the fold.',
      },
      {
        id: 't3',
        speaker: 'Sara Kim',
        timeLabel: '12:40',
        text: 'Login redirect is fixed, but we still need a pass on empty-state visuals.',
      },
    ],
    comments: [
      {
        id: 'c1',
        author: 'Jordan Lee',
        initials: 'JL',
        color: '#425761',
        timeLabel: 'Yesterday',
        text: 'Can we attach the Figma frame for the empty states?',
      },
    ],
    attachments: [
      { id: 'a1', name: 'Sprint-12 demo notes.pdf', sizeLabel: '640 KB', type: 'pdf' },
      { id: 'a2', name: 'Dashboard mock.png', sizeLabel: '2.1 MB', type: 'image' },
    ],
    suggestions: [
      'What were the main UI/UX changes discussed?',
      'List the bugs that were fixed',
      'What is still unresolved?',
    ],
  },
  {
    id: 'm3',
    title: 'Client Kickoff — Northstar',
    dateLabel: 'April 18 2025',
    startLabel: '2:00 PM',
    endLabel: '2:40 PM',
    durationLabel: '40m',
    participantCount: 5,
    owner: 'Dana Wells',
    scope: 'shared',
    tags: ['Client', 'General meeting'],
    thumbnailTone: 'teal',
    coverImage: cover3,
    layout: 'grid',
    participants: [
      participants.dana,
      participants.arafat,
      participants.mia,
      participants.leo,
      participants.sara,
    ],
    summaryIntro:
      'Introductory call with Northstar stakeholders to align on goals, success metrics, and communication cadence.',
    keyTopics: 'Project goals, stakeholder map, and weekly reporting format.',
    decisions: 'Weekly Friday summary email plus shared Buddy meeting folder.',
    unresolved: 'Await brand assets from the client marketing team.',
    takeaways: [
      {
        title: 'Success metrics',
        detail: 'Focus on time-to-insight and meeting follow-through rates.',
      },
      {
        title: 'Cadence',
        detail: 'Bi-weekly demos with a standing Friday async update.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Dana Wells',
        timeLabel: '0:08',
        text: 'Thanks for joining — we will confirm goals and the reporting rhythm today.',
      },
      {
        id: 't2',
        speaker: 'Mia Chen',
        timeLabel: '6:55',
        text: 'We can mirror your brand tokens once assets arrive.',
      },
    ],
    comments: [],
    attachments: [{ id: 'a1', name: 'Northstar brief.pdf', sizeLabel: '980 KB', type: 'pdf' }],
    suggestions: [
      'What did the client ask for?',
      'Summarize the reporting cadence',
      'List open client dependencies',
    ],
  },
  {
    id: 'm4',
    title: 'Design Critique — Calendar Modal',
    dateLabel: 'May 3 2025',
    startLabel: '11:15 AM',
    endLabel: '11:50 AM',
    durationLabel: '35m',
    participantCount: 3,
    owner: 'Sara Kim',
    scope: 'shared',
    tags: ['Design'],
    thumbnailTone: 'amber',
    coverImage: cover4,
    layout: 'duo',
    participants: [participants.sara, participants.dana, participants.jordan],
    summaryIntro:
      'Review of the add-event modal, custom date/time pickers, and reminder controls for visual consistency.',
    keyTopics: 'Picker overlays, AM/PM controls, and reminder card spacing.',
    decisions: 'Ship floating pickers with Buddy primary accents.',
    unresolved: 'Validate keyboard navigation on the date grid.',
    takeaways: [
      {
        title: 'Picker UX',
        detail: 'AM/PM direct selection replaces long scrolling time lists.',
      },
      {
        title: 'Visual polish',
        detail: 'Match radius and soft borders used across settings and home modals.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Sara Kim',
        timeLabel: '1:02',
        text: 'The floating menu should sit above the modal, not expand inside the form.',
      },
    ],
    comments: [],
    attachments: [{ id: 'a1', name: 'Calendar picker specs.pdf', sizeLabel: '420 KB', type: 'pdf' }],
    suggestions: [
      'What picker changes were approved?',
      'Any accessibility follow-ups?',
    ],
  },
  {
    id: 'm5',
    title: 'Weekly Product Sync',
    dateLabel: 'May 6 2025',
    startLabel: '9:30 AM',
    endLabel: '10:00 AM',
    durationLabel: '30m',
    participantCount: 4,
    owner: 'Arafat',
    scope: 'mine',
    tags: ['General meeting', 'Sprint'],
    thumbnailTone: 'slate',
    coverImage: cover5,
    layout: 'solo',
    participants: [participants.arafat, participants.mia, participants.leo, participants.jordan],
    summaryIntro:
      'Standing sync covering roadmap priorities, shipping criteria, and cross-team blockers.',
    keyTopics: 'Roadmap sequencing, QA capacity, and release notes process.',
    decisions: 'Prioritize meetings module for this release.',
    unresolved: 'Need analytics instrumentation estimate.',
    takeaways: [
      {
        title: 'Focus',
        detail: 'Meetings list and detail pages are the next customer-facing milestone.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Arafat',
        timeLabel: '0:30',
        text: 'Meetings and recordings should feel as polished as Calendar and Home.',
      },
    ],
    comments: [],
    attachments: [],
    suggestions: ['What is prioritized this week?', 'Any blockers mentioned?'],
  },
  {
    id: 'm6',
    title: 'Support Handoff — Acme',
    dateLabel: 'May 8 2025',
    startLabel: '4:00 PM',
    endLabel: '4:25 PM',
    durationLabel: '25m',
    participantCount: 2,
    owner: 'Mia Chen',
    scope: 'shared',
    tags: ['Client'],
    thumbnailTone: 'blue',
    coverImage: cover6,
    layout: 'duo',
    participants: [participants.mia, participants.leo],
    summaryIntro:
      'Handoff between success and support covering open tickets, escalation paths, and customer preferences.',
    keyTopics: 'Open tickets, escalation matrix, and preferred contact channels.',
    decisions: 'Route P1 issues through Buddy chat with meeting context attached.',
    unresolved: 'Confirm weekend on-call rotation.',
    takeaways: [
      {
        title: 'Escalation',
        detail: 'Attach meeting summaries when opening high-priority tickets.',
      },
    ],
    transcript: [
      {
        id: 't1',
        speaker: 'Mia Chen',
        timeLabel: '2:14',
        text: 'Acme prefers async updates unless the issue blocks production.',
      },
    ],
    comments: [],
    attachments: [{ id: 'a1', name: 'Acme handoff notes.pdf', sizeLabel: '310 KB', type: 'doc' }],
    suggestions: ['Summarize Acme preferences', 'List open support actions'],
  },
];

const enrichMeeting = (meeting: MeetingSeed): MeetingRecord => ({
  ...meeting,
  tasks: [
    {
      id: `${meeting.id}-task-1`,
      title: meeting.takeaways[0]?.title
        ? `Complete: ${meeting.takeaways[0].title}`
        : 'Capture follow-up actions',
      owner: meeting.owner,
      status: 'open',
      dueLabel: 'This week',
    },
    {
      id: `${meeting.id}-task-2`,
      title: meeting.unresolved.length > 72 ? `${meeting.unresolved.slice(0, 72)}…` : meeting.unresolved,
      owner: meeting.participants[1]?.name ?? meeting.owner,
      status: 'blocked',
      dueLabel: 'Next sync',
    },
    {
      id: `${meeting.id}-task-3`,
      title: 'Share recording summary with attendees',
      owner: meeting.owner,
      status: 'done',
      dueLabel: 'Today',
    },
  ],
  notes: [
    {
      id: `${meeting.id}-note-1`,
      title: 'Meeting overview',
      body: meeting.summaryIntro,
      author: meeting.owner,
      timeLabel: 'Live capture',
    },
    {
      id: `${meeting.id}-note-2`,
      title: 'Decisions log',
      body: meeting.decisions,
      author: meeting.participants[0]?.name ?? meeting.owner,
      timeLabel: 'End of call',
    },
    {
      id: `${meeting.id}-note-3`,
      title: 'Parking lot',
      body: meeting.unresolved,
      author: meeting.participants[1]?.name ?? meeting.owner,
      timeLabel: 'Follow-up',
    },
  ],
});

export const MEETINGS: MeetingRecord[] = MEETINGS_SEED.map(enrichMeeting);

export const findMeetingById = (id: string) => MEETINGS.find((meeting) => meeting.id === id) ?? null;
