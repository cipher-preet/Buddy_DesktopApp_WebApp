import type {
  ApiNoteCard,
  ApiSpace,
  ApiTaskCard,
  DateGroupedItems,
  WorkspaceNote,
  WorkspaceSpace,
  WorkspaceTask,
} from './homeTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, '0');

const toSortAt = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const toDateGroupMeta = (value?: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return {
      dateGroupKey: 'unknown',
      dateGroupLabel: 'No date',
      sortAt: 0,
    };
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());

  return {
    dateGroupKey: `${year}-${month}-${day}`,
    dateGroupLabel: `${day}-${month}-${year}`,
    sortAt: date.getTime(),
  };
};

export const groupItemsByDate = <T extends { dateGroupKey: string; dateGroupLabel: string; sortAt: number }>(
  items: T[],
): DateGroupedItems<T>[] => {
  const sorted = [...items].sort((a, b) => b.sortAt - a.sortAt || b.dateGroupKey.localeCompare(a.dateGroupKey));
  const groups: DateGroupedItems<T>[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of sorted) {
    const existingIndex = indexByKey.get(item.dateGroupKey);
    if (existingIndex === undefined) {
      indexByKey.set(item.dateGroupKey, groups.length);
      groups.push({
        key: item.dateGroupKey,
        label: item.dateGroupLabel,
        items: [item],
      });
      continue;
    }
    groups[existingIndex].items.push(item);
  }

  return groups;
};

const toLocalDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseDueDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return toLocalDate(`${value}T00:00:00`);
  }

  return toLocalDate(value);
};

export const formatRelativeDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startToday - startTarget) / DAY_MS);

  if (dayDiff === 0) {
    return 'Today';
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return `${dayDiff} days ago`;
  }

  if (dayDiff === -1) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

export const formatNoteDate = (value?: string | null) => {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatRelativeDate(value);
  }

  const relative = formatRelativeDate(value);
  if (relative === 'Today' || relative === 'Yesterday' || relative.endsWith('days ago')) {
    return relative;
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDueDateDetails = (
  value?: string | null,
): { label: string; tone: WorkspaceTask['dueDateTone'] } => {
  const due = parseDueDate(value);
  if (!due) {
    return { label: 'No due date', tone: 'none' };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((due.getTime() - today.getTime()) / DAY_MS);

  if (dayDiff < 0) {
    const days = Math.abs(dayDiff);
    return {
      label: days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`,
      tone: 'overdue',
    };
  }

  if (dayDiff === 0) {
    return { label: 'Due today', tone: 'today' };
  }

  if (dayDiff === 1) {
    return { label: 'Due tomorrow', tone: 'tomorrow' };
  }

  if (dayDiff < 7) {
    return {
      label: `Due ${due.toLocaleDateString(undefined, { weekday: 'short' })}`,
      tone: 'upcoming',
    };
  }

  return {
    label: `Due ${due.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: due.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })}`,
    tone: 'upcoming',
  };
};

/** @deprecated use formatDueDateDetails */
export const formatDueDate = (value?: string | null) => formatDueDateDetails(value).label;

export const mapSpace = (space: ApiSpace): WorkspaceSpace => ({
  id: String(space._id),
  name: space.spacename || 'Untitled space',
  description: space.description || '',
  tasksCount: space.tasksCount ?? 0,
  notesCount: space.notesCount ?? 0,
  updatedAtLabel: formatRelativeDate(space.updatedAt || space.createdAt),
});

const mapPriority = (priority?: string | null): WorkspaceTask['priority'] => {
  const normalized = String(priority || '').trim().toLowerCase();

  if (
    normalized === 'high' ||
    normalized === 'h' ||
    normalized === 'urgent' ||
    normalized === 'p1' ||
    normalized === 'critical'
  ) {
    return 'High';
  }

  if (normalized === 'low' || normalized === 'l' || normalized === 'p3' || normalized === 'minor') {
    return 'Low';
  }

  return 'Medium';
};

const mapTaskStatus = (operation?: string | null, status?: string | null): WorkspaceTask['status'] => {
  const normalized = String(operation || status || '').trim().toUpperCase();

  if (normalized === 'DONE' || normalized === 'COMPLETED' || normalized === 'COMPLETE') {
    return 'done';
  }

  if (normalized === 'REVIEW' || normalized === 'IN_REVIEW') {
    return 'review';
  }

  return 'open';
};

export const mapTask = (task: ApiTaskCard): WorkspaceTask => {
  const due = formatDueDateDetails(task.dueDate);
  const dueDateKey =
    typeof task.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate.trim())
      ? task.dueDate.trim()
      : null;
  const stamp = task.updatedAt || task.createdAt;
  const dateGroup = toDateGroupMeta(stamp);

  return {
    id: String(task.id),
    title: task.title || 'Untitled task',
    description: (task.body || task.descriptionPreview || '').trim(),
    dueDate: due.label,
    dueDateKey,
    dueDateTone: due.tone,
    priority: mapPriority(task.priority),
    status: mapTaskStatus(task.operation),
    createdAtLabel: formatNoteDate(task.createdAt || task.updatedAt),
    dateGroupKey: dateGroup.dateGroupKey,
    dateGroupLabel: dateGroup.dateGroupLabel,
    sortAt: dateGroup.sortAt || toSortAt(stamp),
  };
};

// Must match the backend's NOTE_PREVIEW_LENGTH for getStagedNotesBySpace.
const NOTE_PREVIEW_LENGTH = 140;

export const mapNote = (note: ApiNoteCard): WorkspaceNote => {
  const body = note.body?.trim() || '';
  const preview = note.bodyPreview?.trim() || '';
  const stamp = note.updatedAt || note.createdAt;
  const dateGroup = toDateGroupMeta(stamp);

  return {
    id: String(note.id),
    title: note.title || 'Untitled note',
    excerpt: body || preview,
    isTruncated: !body && preview.length >= NOTE_PREVIEW_LENGTH,
    dateLabel: formatNoteDate(stamp),
    dateGroupKey: dateGroup.dateGroupKey,
    dateGroupLabel: dateGroup.dateGroupLabel,
    sortAt: dateGroup.sortAt || toSortAt(stamp),
  };
};
