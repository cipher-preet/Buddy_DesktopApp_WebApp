import type {
  CalendarDayItem,
  CalendarEvent,
  DayItemKind,
  DaySummary,
  EventCategory,
} from './calendarTypes';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; icon: string; tone: string }
> = {
  holiday: { label: 'Holiday', icon: '🏖️', tone: 'holiday' },
  birthday: { label: 'Birthday', icon: '🎂', tone: 'birthday' },
  anniversary: { label: 'Anniversary', icon: '🥳', tone: 'anniversary' },
  launch: { label: 'New Launch', icon: '🔥', tone: 'launch' },
  meeting: { label: 'Meeting', icon: '👥', tone: 'meeting' },
  interview: { label: 'Interview', icon: '💼', tone: 'interview' },
  onboarding: { label: 'Onboarding', icon: '🚀', tone: 'onboarding' },
};

export const DAY_ITEM_META: Record<
  DayItemKind,
  { label: string; icon: string; tone: string; plural: string }
> = {
  task: { label: 'Task', icon: '✓', tone: 'task', plural: 'Tasks' },
  note: { label: 'Note', icon: '📝', tone: 'note', plural: 'Notes' },
  reminder: { label: 'Reminder', icon: '🔔', tone: 'reminder', plural: 'Reminders' },
};

export const MEETING_CATEGORIES: EventCategory[] = ['meeting', 'interview', 'onboarding'];

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const startOfWeek = (date: Date) => addDays(date, -date.getDay());

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const formatFullDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const formatShortWeekday = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

export const minutesToLabel = (minutes: number) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const timeInputToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTimeInput = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const formatDuration = (startMinutes: number, endMinutes: number) => {
  const total = Math.max(0, endMinutes - startMinutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

export const formatTimeRange = (startMinutes: number, endMinutes: number) =>
  `${minutesToLabel(startMinutes)} - ${minutesToLabel(endMinutes)} • ${formatDuration(startMinutes, endMinutes)}`;

export const getMonthGridDates = (monthDate: Date) => {
  const first = startOfMonth(monthDate);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

export const getWeekDates = (date: Date) => {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
};

export const eventsForDate = (events: CalendarEvent[], date: Date) => {
  const key = toDateKey(date);
  return events
    .filter((event) => event.date === key)
    .sort((a, b) => a.startMinutes - b.startMinutes);
};

export const dayItemsForDate = (items: CalendarDayItem[], date: Date) => {
  const key = toDateKey(date);
  return items
    .filter((item) => item.date === key)
    .sort((a, b) => (a.timeMinutes ?? 24 * 60) - (b.timeMinutes ?? 24 * 60));
};

export const meetingsForDate = (events: CalendarEvent[], date: Date) =>
  eventsForDate(events, date).filter((event) => MEETING_CATEGORIES.includes(event.category));

export const getDaySummary = (
  events: CalendarEvent[],
  items: CalendarDayItem[],
  date: Date,
): DaySummary => {
  const dayEvents = eventsForDate(events, date);
  const dayItems = dayItemsForDate(items, date);
  const meetings = dayEvents.filter((event) => MEETING_CATEGORIES.includes(event.category)).length;
  const tasks = dayItems.filter((item) => item.kind === 'task').length;
  const notes = dayItems.filter((item) => item.kind === 'note').length;
  const reminders = dayItems.filter((item) => item.kind === 'reminder').length;

  return {
    meetings,
    tasks,
    notes,
    reminders,
    total: meetings + tasks + notes + reminders,
  };
};

export const nowMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export const createEventId = () =>
  `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
