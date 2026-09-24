export type HomeApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type ApiSpace = {
  _id: string;
  spacename: string;
  description?: string;
  userId?: string;
  isListning?: boolean;
  listeningStartedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tasksCount?: number;
  notesCount?: number;
};

export type ApiNoteCard = {
  id: string;
  title: string;
  body?: string;
  bodyPreview?: string;
  confidence?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiTaskCard = {
  id: string;
  title: string;
  body?: string;
  descriptionPreview?: string;
  evidence?: unknown;
  operation?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  confidence?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SpacesPage = {
  spaces: ApiSpace[];
  nextCursor: string | null;
};

export type NotesPage = {
  notes: ApiNoteCard[];
  nextCursor: string | null;
};

export type TasksPage = {
  tasks: ApiTaskCard[];
  nextCursor: string | null;
};

/** Nested envelope used by getuserspaces */
export type NestedSpacesServiceResponse = {
  status?: number;
  message?: string;
  data?: SpacesPage;
};

export type WorkspaceSpace = {
  id: string;
  name: string;
  description: string;
  tasksCount: number;
  notesCount: number;
  updatedAtLabel: string;
};

export type WorkspaceTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  dueDateKey: string | null;
  dueDateTone: 'none' | 'overdue' | 'today' | 'tomorrow' | 'upcoming';
  priority: 'High' | 'Medium' | 'Low';
  status: 'done' | 'open' | 'review';
  createdAtLabel: string;
};

export type WorkspaceNote = {
  id: string;
  title: string;
  excerpt: string;
  dateLabel: string;
};
