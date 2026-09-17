import type {
  ApiNoteCard,
  ApiSpace,
  ApiTaskCard,
  WorkspaceNote,
  WorkspaceSpace,
  WorkspaceTask,
} from './homeTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

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

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
};

export const formatDueDate = (value?: string | null) => {
  if (!value) {
    return 'No due date';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return formatRelativeDate(date.toISOString());
    }
  }

  return formatRelativeDate(value);
};

export const mapSpace = (space: ApiSpace): WorkspaceSpace => ({
  id: String(space._id),
  name: space.spacename || 'Untitled space',
  description: space.description || '',
  tasksCount: space.tasksCount ?? 0,
  updatedAtLabel: formatRelativeDate(space.updatedAt || space.createdAt),
});

const mapPriority = (priority?: string | null): WorkspaceTask['priority'] => {
  const normalized = String(priority || '').trim().toLowerCase();

  if (normalized === 'high' || normalized === 'h') {
    return 'High';
  }

  if (normalized === 'low' || normalized === 'l') {
    return 'Low';
  }

  return 'Medium';
};

const mapTaskStatus = (operation?: string | null): WorkspaceTask['status'] => {
  const normalized = String(operation || '').trim().toUpperCase();

  if (normalized === 'DONE' || normalized === 'COMPLETED' || normalized === 'COMPLETE') {
    return 'done';
  }

  if (normalized === 'REVIEW' || normalized === 'IN_REVIEW') {
    return 'review';
  }

  return 'open';
};

export const mapTask = (task: ApiTaskCard): WorkspaceTask => ({
  id: String(task.id),
  title: task.title || 'Untitled task',
  description: task.body || task.descriptionPreview || '',
  dueDate: formatDueDate(task.dueDate),
  priority: mapPriority(task.priority),
  status: mapTaskStatus(task.operation),
});

export const mapNote = (note: ApiNoteCard): WorkspaceNote => ({
  id: String(note.id),
  title: note.title || 'Untitled note',
  excerpt: note.body?.trim() || note.bodyPreview || '',
});
