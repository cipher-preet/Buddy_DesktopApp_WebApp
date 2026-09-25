export type MeetingApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type MeetingProvider =
  | 'GOOGLE_MEET'
  | 'ZOOM'
  | 'MICROSOFT_TEAMS'
  | 'UNKNOWN'
  | string;

export type ApiMeetingListItem = {
  meetingSessionId: string;
  userId: string;
  spaceId: string | null;
  provider: MeetingProvider;
  sourceType?: string;
  meetingTitle: string | null;
  meetingUrl: string | null;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  durationMs?: number | null;
  recordingAvailable?: boolean;
  recordingPartial?: boolean;
  mergeMissingSequenceCount?: number | null;
  mergePresentChunkCount?: number | null;
  finalRecordingS3Key?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  recordingStatus?: string | null;
  uploadStatus?: string | null;
  transcriptionStatus?: string | null;
  processingStatus?: string | null;
  videoMergeStatus?: string | null;
  ready?: boolean;
};

export type ApiMeetingArtifacts = {
  taskCount: number;
  noteCount: number;
  hasSummary: boolean;
};

export type ApiMeetingDetail = ApiMeetingListItem & {
  artifacts?: ApiMeetingArtifacts;
  conversationStatus?: string | null;
  expectedFinalSequence?: number | null;
  lastReceivedSequence?: number;
  totalChunks?: number;
  uploadedChunks?: number;
  processedChunks?: number;
  failedChunks?: number;
  extensionVersion?: string | null;
};

export type ApiMeetingsPage = {
  items: ApiMeetingListItem[];
  nextCursor: string | null;
  spaceId?: string | null;
};

export type ApiTranscriptSegment = {
  id: string;
  text: string;
  startOffsetMs: number | null;
  endOffsetMs: number | null;
  spokenAtUtc?: string | null;
  chunkSequence?: number;
  speakerId?: string | null;
  speakerLabel?: string | null;
};

export type ApiMeetingTranscript = {
  meetingSessionId: string;
  durationMs: number | null;
  segments: ApiTranscriptSegment[];
};

export type ApiMeetingSummary = {
  meetingSessionId: string;
  available: boolean;
  summary: string | null;
  topics: string[];
  importantFacts: string[];
  decisions: string[];
  openQuestions: string[];
  blockers: string[];
  languageCodes?: string[];
  createdAt?: string | null;
};

export type ApiMeetingTaskItem = {
  id: string;
  title: string;
  body: string;
  owner: string | null;
  dueDate: string | null;
  status: 'open' | 'done' | 'blocked' | string;
  operation?: string | null;
  confidence?: number | null;
  staged?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiMeetingNoteItem = {
  id: string;
  title: string;
  body: string;
  confidence?: number | null;
  staged?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiMeetingTasks = {
  meetingSessionId: string;
  items: ApiMeetingTaskItem[];
};

export type ApiMeetingNotes = {
  meetingSessionId: string;
  items: ApiMeetingNoteItem[];
};

export type ApiMeetingPlayback = {
  url: string;
  expiresAt: string;
  s3Key: string;
};

export type MeetingThumbnailTone = 'blue' | 'violet' | 'teal' | 'amber' | 'slate';

/** Basic fields shown on the meetings listing cards. */
export type MeetingListItem = {
  id: string;
  title: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  providerLabel: string;
  spaceId: string | null;
  recordingAvailable: boolean;
  /** True when merge skipped one or more lost chunks but still produced a playable file. */
  recordingPartial: boolean;
  ready: boolean;
  recordingStatus: string;
  statusLabel: string;
  thumbnailTone: MeetingThumbnailTone;
  coverImage: string;
};

export type MeetingDetailShell = MeetingListItem & {
  artifacts: ApiMeetingArtifacts;
  conversationStatus: string | null;
  uploadStatus: string;
  transcriptionStatus: string;
  processingStatus: string;
  videoMergeStatus: string;
  meetingUrl: string | null;
};

export type MeetingTranscriptLineView = {
  id: string;
  speaker: string;
  timeLabel: string;
  text: string;
  startOffsetMs: number | null;
};

export type MeetingSummaryView = {
  available: boolean;
  summaryIntro: string;
  keyTopics: string;
  decisions: string;
  unresolved: string;
  takeaways: Array<{ title: string; detail: string }>;
};

export type MeetingTaskView = {
  id: string;
  title: string;
  body: string;
  owner: string;
  dueLabel: string;
  status: 'open' | 'done' | 'blocked';
};

export type MeetingNoteView = {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
};

export type MeetingPlaybackView = {
  url: string;
  expiresAt: string;
};
