export type CalendarApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type CalendarFeedKind = 'meeting' | 'task' | 'note' | 'reminder' | 'other';

export type CalendarFeedSource =
  | 'calendar_event'
  | 'reminder'
  | 'task'
  | 'note'
  | 'conversation';

export type CalendarFeedItemDto = {
  id: string;
  source: CalendarFeedSource;
  kind: CalendarFeedKind;
  title: string;
  description: string;
  dateKey: string;
  startTimeLabel: string | null;
  endTimeLabel: string | null;
  location?: string;
  spaceId: string | null;
  spaceName: string | null;
  priority: string | null;
  done: boolean;
  tone?: string;
  aiReminder?: boolean;
  remindBeforeMinutes?: number;
  reminderId?: string | null;
};

export type CalendarFeedSpaceDto = {
  id: string;
  name: string;
};

export type CalendarDaySummaryDto = {
  meetings: number;
  tasks: number;
  notes: number;
  reminders: number;
  total: number;
};

export type CalendarFeedDto = {
  from: string;
  to: string;
  items: CalendarFeedItemDto[];
  spaces: CalendarFeedSpaceDto[];
  summaryByDate: Record<string, CalendarDaySummaryDto>;
  windows: Record<string, { startHour: number; endHour: number }>;
  counts: CalendarDaySummaryDto;
};

export type CalendarEventCardDto = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateKey: string;
  dateLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  tone: string;
  aiReminder: boolean;
  aiCalling: boolean;
  notification: boolean;
  beeping: boolean;
  remindBeforeMinutes: number;
  reminderId: string | null;
};

export type CalendarEventWritePayload = {
  title: string;
  description: string;
  location: string;
  dateKey: string;
  dateLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  aiReminder: boolean;
  aiCalling: boolean;
  notification: boolean;
  beeping: boolean;
  remindBeforeMinutes: number;
};
