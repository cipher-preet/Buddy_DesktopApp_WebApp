export type PlanResource =
  | 'notesRecordingHours'
  | 'meetingRecordingHours'
  | 'mindmaps'
  | 'documents'
  | 'goals'
  | 'marketplace'
  | 'spaces'
  | 'notes'
  | 'tasks'
  | 'recordingHours';

export type PlanRestrictionInfo = {
  message: string;
  resource?: PlanResource;
  planCode?: string;
  limit?: number | string | null;
  used?: number | null;
};

const PLAN_RESOURCES = new Set<PlanResource>([
  'notesRecordingHours',
  'meetingRecordingHours',
  'mindmaps',
  'documents',
  'goals',
  'marketplace',
  'spaces',
  'notes',
  'tasks',
  'recordingHours',
]);

const UPGRADE_MESSAGE_PATTERN =
  /plan limit|upgrade your plan|upgrade plan|recording time limit|limit reached|marketplace|maximum .* (spaces|notes|tasks|mindmaps|documents|goals)|reached your .* limit/i;

const resourceLabels: Record<PlanResource, string> = {
  notesRecordingHours: 'notes recording time',
  meetingRecordingHours: 'meeting recording time',
  mindmaps: 'mindmaps',
  documents: 'documents',
  goals: 'goals',
  marketplace: 'marketplace installs',
  spaces: 'spaces',
  notes: 'notes',
  tasks: 'tasks',
  recordingHours: 'recording time',
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
};

const readMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }
  // FastAPI detail object shape
  const detail = asRecord(record.detail);
  if (detail && typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message.trim();
  }
  return null;
};

const readResource = (value: unknown): PlanResource | undefined => {
  const record = asRecord(value);
  const resource = record?.resource;
  if (typeof resource === 'string' && PLAN_RESOURCES.has(resource as PlanResource)) {
    return resource as PlanResource;
  }
  const detail = asRecord(record?.detail);
  const detailResource = detail?.resource;
  if (
    typeof detailResource === 'string' &&
    PLAN_RESOURCES.has(detailResource as PlanResource)
  ) {
    return detailResource as PlanResource;
  }
  return undefined;
};

export const getPlanResourceLabel = (resource?: PlanResource) => {
  if (!resource) {
    return 'this feature';
  }
  return resourceLabels[resource];
};

export const getPlanRestriction = (error: unknown): PlanRestrictionInfo | null => {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const record = error as {
    status?: number | string;
    data?: unknown;
    message?: unknown;
  };

  const data = asRecord(record.data);
  const nested = asRecord(data?.data);
  const detail = asRecord(data?.detail) || asRecord(nested?.detail);
  const message =
    readMessage(data) ||
    readMessage(nested) ||
    readMessage(detail) ||
    readMessage(record.message) ||
    '';

  const resource =
    readResource(nested) || readResource(detail) || readResource(data);
  const planCode =
    (typeof nested?.planCode === 'string' && nested.planCode) ||
    (typeof detail?.planCode === 'string' && detail.planCode) ||
    (typeof data?.planCode === 'string' && data.planCode) ||
    undefined;
  const limit =
    (nested?.limit as number | string | null | undefined) ??
    (detail?.limit as number | string | null | undefined) ??
    (data?.limit as number | string | null | undefined) ??
    null;
  const used =
    (typeof nested?.used === 'number' ? nested.used : null) ??
    (typeof detail?.used === 'number' ? detail.used : null) ??
    (typeof data?.used === 'number' ? data.used : null);

  const looksLikePlanLimit =
    Boolean(resource) ||
    Boolean(planCode && (limit != null || used != null)) ||
    UPGRADE_MESSAGE_PATTERN.test(message);

  if (!looksLikePlanLimit) {
    return null;
  }

  return {
    message:
      message ||
      `Plan limit reached. Upgrade your plan to create more ${getPlanResourceLabel(resource)}.`,
    resource,
    planCode,
    limit,
    used,
  };
};

export const isPlanRestrictionError = (error: unknown) => Boolean(getPlanRestriction(error));

export const buildUpgradeTitle = (resource?: PlanResource) => {
  if (resource === 'notesRecordingHours' || resource === 'recordingHours') {
    return 'Notes recording limit reached';
  }
  if (resource === 'meetingRecordingHours') {
    return 'Meeting recording limit reached';
  }
  if (resource === 'mindmaps') {
    return 'Mindmap limit reached';
  }
  if (resource === 'documents') {
    return 'Document limit reached';
  }
  if (resource === 'goals') {
    return 'Goal limit reached';
  }
  if (resource === 'marketplace') {
    return 'Marketplace upgrade needed';
  }
  if (resource === 'spaces') {
    return 'Space limit reached';
  }
  if (resource === 'notes') {
    return 'Note limit reached';
  }
  if (resource === 'tasks') {
    return 'Task limit reached';
  }
  return 'Plan limit reached';
};
