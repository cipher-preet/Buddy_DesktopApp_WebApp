export type CalendarView = 'month' | 'week' | 'day';

export type EventCategory =
  | 'holiday'
  | 'birthday'
  | 'anniversary'
  | 'launch'
  | 'meeting'
  | 'interview'
  | 'onboarding';

export type DayItemKind = 'task' | 'note' | 'reminder';

export type CalendarAttendee = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  /** Local date key YYYY-MM-DD */
  date: string;
  startMinutes: number;
  endMinutes: number;
  attendees?: CalendarAttendee[];
  canJoin?: boolean;
};

export type CalendarDayItem = {
  id: string;
  kind: DayItemKind;
  title: string;
  description?: string;
  /** Local date key YYYY-MM-DD */
  date: string;
  /** Optional time label minutes from midnight */
  timeMinutes?: number;
  done?: boolean;
  priority?: 'High' | 'Medium' | 'Low';
};

export type DaySummary = {
  meetings: number;
  tasks: number;
  notes: number;
  reminders: number;
  total: number;
};

export type EventDraft = {
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  canJoin: boolean;
};
