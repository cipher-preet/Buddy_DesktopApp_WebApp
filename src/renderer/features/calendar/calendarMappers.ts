import type { CalendarDayItem, CalendarEvent, DaySummary, EventCategory } from './calendarTypes';
import type { CalendarFeedDto, CalendarFeedItemDto } from './calendarApiTypes';

const TIME_LABEL_PATTERN = /^(1[0-2]|[1-9]):([0-5]\d)\s?(AM|PM)$/i;

export const parseTimeLabelToMinutes = (label: string | null | undefined) => {
  if (!label) {
    return null;
  }

  const match = label.trim().match(TIME_LABEL_PATTERN);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hour < 12) {
    hour += 12;
  }
  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
};

export const minutesToApiTimeLabel = (totalMinutes: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }

  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const categoryFromFeedItem = (item: CalendarFeedItemDto): EventCategory => {
  if (item.source === 'conversation') {
    return 'meeting';
  }
  return 'meeting';
};

export const mapFeedToCalendarEvent = (item: CalendarFeedItemDto): CalendarEvent | null => {
  if (item.kind !== 'meeting') {
    return null;
  }

  const startMinutes = parseTimeLabelToMinutes(item.startTimeLabel) ?? 9 * 60;
  const endMinutes = Math.max(
    startMinutes + 30,
    parseTimeLabelToMinutes(item.endTimeLabel) ?? startMinutes + 60,
  );

  return {
    id: `${item.source}:${item.id}`,
    title: item.title || 'Meeting',
    description: item.description || item.location || undefined,
    category: categoryFromFeedItem(item),
    date: item.dateKey,
    startMinutes,
    endMinutes,
    canJoin: false,
    source: item.source,
    spaceName: item.spaceName,
  };
};

export const mapFeedToDayItem = (item: CalendarFeedItemDto): CalendarDayItem | null => {
  if (item.kind === 'meeting') {
    return null;
  }

  const kind = item.kind === 'task' || item.kind === 'note' || item.kind === 'reminder' ? item.kind : null;
  if (!kind) {
    return null;
  }

  const priorityRaw = item.priority?.toLowerCase();
  const priority =
    priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
      ? (priorityRaw.charAt(0).toUpperCase() + priorityRaw.slice(1)) as 'High' | 'Medium' | 'Low'
      : undefined;

  return {
    id: `${item.source}:${item.id}`,
    kind,
    title: item.title || kind,
    description: item.description || item.spaceName || undefined,
    date: item.dateKey,
    timeMinutes: parseTimeLabelToMinutes(item.startTimeLabel) ?? undefined,
    done: item.done,
    priority,
  };
};

export const mapCalendarFeed = (feed: CalendarFeedDto) => {
  const events: CalendarEvent[] = [];
  const dayItems: CalendarDayItem[] = [];

  for (const item of feed.items ?? []) {
    const event = mapFeedToCalendarEvent(item);
    if (event) {
      events.push(event);
      continue;
    }

    const dayItem = mapFeedToDayItem(item);
    if (dayItem) {
      dayItems.push(dayItem);
    }
  }

  return {
    events,
    dayItems,
    summaryByDate: feed.summaryByDate ?? {},
    spaces: feed.spaces ?? [],
    counts: feed.counts,
    windows: feed.windows ?? {},
  };
};

export const emptyDaySummary = (): DaySummary => ({
  meetings: 0,
  tasks: 0,
  notes: 0,
  reminders: 0,
  total: 0,
});

export const getCalendarErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'status' in error) {
    const status = (error as { status?: number | string }).status;
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
      return 'Could not reach the calendar server. Check that Node Backend is running.';
    }
  }

  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string; detail?: string } }).data;
    if (data?.message) {
      return data.message;
    }
    if (data?.detail) {
      return data.detail;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
