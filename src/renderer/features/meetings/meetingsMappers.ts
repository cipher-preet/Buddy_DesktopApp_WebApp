import cover1 from '@/assets/meetings/meeting-1.jpg';
import cover2 from '@/assets/meetings/meeting-2.jpg';
import cover3 from '@/assets/meetings/meeting-3.jpg';
import cover4 from '@/assets/meetings/meeting-4.jpg';
import cover5 from '@/assets/meetings/meeting-5.jpg';
import cover6 from '@/assets/meetings/meeting-6.jpg';

import type {
  ApiMeetingDetail,
  ApiMeetingListItem,
  ApiMeetingNoteItem,
  ApiMeetingPlayback,
  ApiMeetingSummary,
  ApiMeetingTaskItem,
  ApiTranscriptSegment,
  MeetingDetailShell,
  MeetingListItem,
  MeetingNoteView,
  MeetingPlaybackView,
  MeetingProvider,
  MeetingSummaryView,
  MeetingTaskView,
  MeetingThumbnailTone,
  MeetingTranscriptLineView,
} from './meetingsApiTypes';

const COVER_IMAGES = [cover1, cover2, cover3, cover4, cover5, cover6] as const;

const THUMBNAIL_TONES: MeetingThumbnailTone[] = ['blue', 'violet', 'teal', 'amber', 'slate'];

const PROVIDER_LABELS: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  MICROSOFT_TEAMS: 'Teams',
  UNKNOWN: 'Meeting',
};

const STATUS_LABELS: Record<string, string> = {
  RECORDING: 'Recording',
  STOP_REQUESTED: 'Stopping',
  WAITING_FOR_UPLOADS: 'Waiting for uploads',
  UPLOAD_COMPLETE: 'Uploaded',
  WAITING_FOR_TRANSCRIPTS: 'Transcribing',
  PROCESSING: 'Processing',
  FINALIZING: 'Finalizing',
  READY: 'Ready',
  INTERRUPTED: 'Interrupted',
  FAILED: 'Failed',
  FINALIZATION_FAILED: 'Failed',
};

const toDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const hashId = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const formatTimeLabel = (date: Date | null) => {
  if (!date) {
    return '—';
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDateLabel = (date: Date | null) => {
  if (!date) {
    return '—';
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startTarget) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

const formatDurationLabel = (durationMs?: number | null, startedAt?: Date | null, endedAt?: Date | null) => {
  let ms = typeof durationMs === 'number' && Number.isFinite(durationMs) ? durationMs : null;

  if (ms === null && startedAt && endedAt) {
    ms = Math.max(0, endedAt.getTime() - startedAt.getTime());
  }

  if (ms === null || ms <= 0) {
    return '—';
  }

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatOffsetLabel = (offsetMs: number | null | undefined) => {
  if (typeof offsetMs !== 'number' || !Number.isFinite(offsetMs) || offsetMs < 0) {
    return '—';
  }

  const totalSeconds = Math.floor(offsetMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const providerLabel = (provider?: MeetingProvider | null) => {
  if (!provider) {
    return 'Meeting';
  }

  return PROVIDER_LABELS[provider] || String(provider).replaceAll('_', ' ');
};

const statusLabel = (status?: string | null, ready?: boolean) => {
  if (ready) {
    return 'Ready';
  }

  if (!status) {
    return 'Processing';
  }

  return STATUS_LABELS[status] || status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const joinLines = (values: string[] | undefined, empty = '') => {
  if (!values?.length) {
    return empty;
  }

  return values.map((value) => value.trim()).filter(Boolean).join('\n');
};

export const mapMeetingListItem = (item: ApiMeetingListItem): MeetingListItem => {
  const raw = item as ApiMeetingListItem & { _id?: string; id?: string };
  const id = String(item.meetingSessionId || raw._id || raw.id || '');
  const startedAt = toDate(item.startedAt) || toDate(item.createdAt);
  const endedAt = toDate(item.endedAt);
  const toneIndex = hashId(id || item.meetingTitle || 'meeting') % THUMBNAIL_TONES.length;
  const coverIndex = hashId(id || item.meetingTitle || 'meeting') % COVER_IMAGES.length;
  const spaceId = item.spaceId ? String(item.spaceId) : null;

  return {
    id,
    title: item.meetingTitle?.trim() || 'Untitled meeting',
    dateLabel: formatDateLabel(startedAt),
    startLabel: formatTimeLabel(startedAt),
    endLabel: formatTimeLabel(endedAt),
    durationLabel: formatDurationLabel(item.durationMs, startedAt, endedAt),
    providerLabel: providerLabel(item.provider),
    spaceId,
    recordingAvailable: Boolean(item.recordingAvailable),
    recordingPartial: Boolean(item.recordingPartial),
    ready: Boolean(item.ready),
    recordingStatus: String(item.recordingStatus || ''),
    statusLabel: statusLabel(item.recordingStatus, item.ready),
    thumbnailTone: THUMBNAIL_TONES[toneIndex],
    coverImage: COVER_IMAGES[coverIndex],
  };
};

export const mapMeetingDetailShell = (item: ApiMeetingDetail): MeetingDetailShell => {
  const base = mapMeetingListItem(item);

  return {
    ...base,
    artifacts: {
      taskCount: item.artifacts?.taskCount ?? 0,
      noteCount: item.artifacts?.noteCount ?? 0,
      hasSummary: Boolean(item.artifacts?.hasSummary),
    },
    conversationStatus: item.conversationStatus ?? null,
    uploadStatus: String(item.uploadStatus || ''),
    transcriptionStatus: String(item.transcriptionStatus || ''),
    processingStatus: String(item.processingStatus || ''),
    videoMergeStatus: String(item.videoMergeStatus || ''),
    meetingUrl: item.meetingUrl ? String(item.meetingUrl) : null,
  };
};

export const mapMeetingSummary = (payload: ApiMeetingSummary): MeetingSummaryView => {
  const facts = payload.importantFacts ?? [];
  const unresolvedParts = [...(payload.openQuestions ?? []), ...(payload.blockers ?? [])];

  return {
    available: Boolean(payload.available),
    summaryIntro: payload.summary?.trim() || '',
    keyTopics: joinLines(payload.topics),
    decisions: joinLines(payload.decisions),
    unresolved: joinLines(unresolvedParts),
    takeaways: facts.map((fact, index) => ({
      title: `Takeaway ${index + 1}`,
      detail: fact,
    })),
  };
};

export const mapTranscriptSegments = (segments: ApiTranscriptSegment[] | undefined): MeetingTranscriptLineView[] => {
  if (!segments?.length) {
    return [];
  }

  return segments
    .map((segment, index) => {
      const speaker =
        segment.speakerLabel?.trim() ||
        (segment.speakerId ? `Speaker ${segment.speakerId}` : 'Speaker');

      return {
        id: String(segment.id || `seg-${index}`),
        speaker,
        timeLabel: formatOffsetLabel(segment.startOffsetMs),
        text: String(segment.text || '').trim(),
        startOffsetMs:
          typeof segment.startOffsetMs === 'number' && Number.isFinite(segment.startOffsetMs)
            ? Math.max(0, segment.startOffsetMs)
            : null,
      };
    })
    .filter((line) => Boolean(line.text));
};

export const mapMeetingTask = (task: ApiMeetingTaskItem): MeetingTaskView => {
  const normalized = String(task.status || 'open').toLowerCase();
  const status: MeetingTaskView['status'] =
    normalized === 'done' || normalized === 'completed'
      ? 'done'
      : normalized === 'blocked' || normalized === 'cancelled'
        ? 'blocked'
        : 'open';

  return {
    id: String(task.id),
    title: task.title?.trim() || 'Untitled task',
    body: task.body?.trim() || '',
    owner: task.owner?.trim() || 'Unassigned',
    dueLabel: task.dueDate ? formatDateLabel(toDate(task.dueDate)) : 'No due date',
    status,
  };
};

export const mapMeetingNote = (note: ApiMeetingNoteItem): MeetingNoteView => ({
  id: String(note.id),
  title: note.title?.trim() || 'Untitled note',
  body: note.body?.trim() || '',
  timeLabel: formatDateLabel(toDate(note.updatedAt || note.createdAt)),
});

const noteContentKey = (note: Pick<MeetingNoteView, 'title' | 'body'>) =>
  `${note.title.trim().toLowerCase()}|${note.body.trim().toLowerCase()}`;

/** Prefer published notes when staged + published copies share the same content. */
export const dedupeMeetingNotes = (
  notes: ApiMeetingNoteItem[],
): MeetingNoteView[] => {
  const sorted = [...notes].sort((left, right) => {
    const leftStaged = left.staged ? 1 : 0;
    const rightStaged = right.staged ? 1 : 0;
    if (leftStaged !== rightStaged) {
      return leftStaged - rightStaged;
    }
    const leftTime = Date.parse(String(left.updatedAt || left.createdAt || '')) || 0;
    const rightTime = Date.parse(String(right.updatedAt || right.createdAt || '')) || 0;
    return rightTime - leftTime;
  });

  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: MeetingNoteView[] = [];

  for (const raw of sorted) {
    const mapped = mapMeetingNote(raw);
    const contentKey = noteContentKey(mapped);

    if (seenIds.has(mapped.id) || seenContent.has(contentKey)) {
      continue;
    }

    seenIds.add(mapped.id);
    seenContent.add(contentKey);
    result.push(mapped);
  }

  return result;
};

export const dedupeMeetingTasks = (tasks: MeetingTaskView[]): MeetingTaskView[] => {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: MeetingTaskView[] = [];

  for (const task of tasks) {
    const contentKey = `${task.title.trim().toLowerCase()}|${task.body.trim().toLowerCase()}`;
    if (seenIds.has(task.id) || seenContent.has(contentKey)) {
      continue;
    }
    seenIds.add(task.id);
    seenContent.add(contentKey);
    result.push(task);
  }

  return result;
};

export const mapMeetingPlayback = (payload: ApiMeetingPlayback): MeetingPlaybackView => ({
  url: String(payload.url || ''),
  expiresAt: String(payload.expiresAt || ''),
});
