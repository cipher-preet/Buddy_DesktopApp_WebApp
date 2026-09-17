export type MeetingScope = 'all' | 'mine' | 'shared';

export type MeetingTag = 'General meeting' | 'Sprint' | 'Design' | 'Client' | 'Onboarding';

export type MeetingParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type MeetingTranscriptLine = {
  id: string;
  speaker: string;
  timeLabel: string;
  text: string;
};

export type MeetingComment = {
  id: string;
  author: string;
  initials: string;
  color: string;
  timeLabel: string;
  text: string;
};

export type MeetingAttachment = {
  id: string;
  name: string;
  sizeLabel: string;
  type: 'pdf' | 'image' | 'doc';
};

export type MeetingTask = {
  id: string;
  title: string;
  owner: string;
  status: 'open' | 'done' | 'blocked';
  dueLabel: string;
};

export type MeetingNote = {
  id: string;
  title: string;
  body: string;
  author: string;
  timeLabel: string;
};

export type MeetingChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
};

export type MeetingRecord = {
  id: string;
  title: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  participantCount: number;
  owner: string;
  scope: 'mine' | 'shared';
  tags: MeetingTag[];
  thumbnailTone: 'blue' | 'violet' | 'teal' | 'amber' | 'slate';
  coverImage: string;
  layout: 'solo' | 'duo' | 'grid';
  participants: MeetingParticipant[];
  summaryIntro: string;
  keyTopics: string;
  decisions: string;
  unresolved: string;
  takeaways: Array<{ title: string; detail: string }>;
  transcript: MeetingTranscriptLine[];
  comments: MeetingComment[];
  attachments: MeetingAttachment[];
  tasks: MeetingTask[];
  notes: MeetingNote[];
  suggestions: string[];
};
