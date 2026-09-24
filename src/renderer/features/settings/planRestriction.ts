export type PlanResource = 'spaces' | 'notes' | 'tasks' | 'recordingHours';

export type PlanRestrictionInfo = {
  message: string;
  resource?: PlanResource;
  planCode?: string;
  limit?: number | string | null;
  used?: number | null;
};

const PLAN_RESOURCES = new Set<PlanResource>(['spaces', 'notes', 'tasks', 'recordingHours']);

const UPGRADE_MESSAGE_PATTERN =
  /plan limit|upgrade your plan|upgrade plan|recording time limit|limit reached|maximum .* (spaces|notes|tasks)|reached your .* limit/i;

const resourceLabels: Record<PlanResource, string> = {
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
  return null;
};

const readResource = (value: unknown): PlanResource | undefined => {
  const record = asRecord(value);
  const resource = record?.resource;
  if (typeof resource === 'string' && PLAN_RESOURCES.has(resource as PlanResource)) {
    return resource as PlanResource;
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
  const message =
    readMessage(data) ||
    readMessage(nested) ||
    readMessage(record.message) ||
    '';

  const resource = readResource(nested) || readResource(data);
  const planCode =
    (typeof nested?.planCode === 'string' && nested.planCode) ||
    (typeof data?.planCode === 'string' && data.planCode) ||
    undefined;
  const limit =
    (nested?.limit as number | string | null | undefined) ??
    (data?.limit as number | string | null | undefined) ??
    null;
  const used =
    (typeof nested?.used === 'number' ? nested.used : null) ??
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
  if (resource === 'recordingHours') {
    return 'Recording limit reached';
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
