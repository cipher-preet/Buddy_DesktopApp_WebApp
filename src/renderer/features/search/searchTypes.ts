export type SearchResultType = 'space' | 'task' | 'note' | 'meeting' | 'event';

export type SearchResultItem = {
  type: SearchResultType;
  id: string;
  title: string;
  snippet: string;
  spaceId: string | null;
  spaceName: string | null;
  meetingId: string | null;
  /** ISO timestamp, or a YYYY-MM-DD key for date-only values. */
  date: string | null;
  dateKind: 'created' | 'due' | 'started' | 'scheduled' | 'updated' | null;
  timeLabel: string | null;
  status: string | null;
  priority: string | null;
  score: number;
};

export type SearchResultGroup = {
  type: SearchResultType;
  total: number;
  items: SearchResultItem[];
};

export type ParsedSearchFilters = {
  raw: string;
  terms: string[];
  types: SearchResultType[];
  dateRange: { from: string; to: string; label: string } | null;
  timeLabel: string | null;
  status: 'done' | 'open' | 'overdue' | null;
  priority: 'high' | 'medium' | 'low' | null;
};

export type SearchResponse = {
  query: ParsedSearchFilters;
  matchMode: 'all' | 'any';
  total: number;
  groups: SearchResultGroup[];
};

export type MeetingDetailTab = 'summary' | 'transcript' | 'tasks' | 'notes';

export type SearchNavigationTarget =
  | { kind: 'space'; spaceId: string }
  | { kind: 'task' | 'note'; spaceId: string; itemId: string }
  | { kind: 'meeting'; meetingId: string; tab?: MeetingDetailTab }
  | { kind: 'event'; dateKey: string };

/** `nonce` lets the same target be re-applied when picked again from search. */
export type DashboardFocusTarget = {
  spaceId: string;
  section?: 'tasks' | 'notes';
  itemId?: string;
  nonce: number;
};

export type MeetingFocusTarget = { meetingId: string; tab?: MeetingDetailTab; nonce: number };

export type CalendarFocusTarget = { dateKey: string; nonce: number };

export const toNavigationTarget = (item: SearchResultItem): SearchNavigationTarget | null => {
  switch (item.type) {
    case 'space':
      return { kind: 'space', spaceId: item.id };
    case 'task':
    case 'note':
      if (item.spaceId) {
        return { kind: item.type, spaceId: item.spaceId, itemId: item.id };
      }
      return item.meetingId
        ? { kind: 'meeting', meetingId: item.meetingId, tab: item.type === 'task' ? 'tasks' : 'notes' }
        : null;
    case 'meeting':
      return { kind: 'meeting', meetingId: item.id };
    case 'event':
      return item.date ? { kind: 'event', dateKey: item.date.slice(0, 10) } : null;
    default:
      return null;
  }
};
