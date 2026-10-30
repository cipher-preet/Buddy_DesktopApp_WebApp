import { api } from '@/services/api';

export type GoalStepOption = {
  id: string;
  label: string;
};

export type GoalFinding = {
  text: string;
  sourceType?: string;
  sourceId?: string;
  category?: string;
};

export type GoalMilestone = {
  title: string;
  successCriteria: string[];
  dueLabel: string;
  dependencies: string[];
};

export type GoalPlanTask = {
  id: string;
  text: string;
  done?: boolean;
  note?: string;
  why?: string;
  definitionOfDone?: string;
};

export type GoalPlanDay = {
  id?: string;
  dayIndex?: number;
  dateLabel?: string;
  scheduledDate?: string;
  title: string;
  focus?: string;
  category?: string;
  minutes?: number;
  hours?: number | null;
  status?: string;
  notes?: string;
  tasks?: GoalPlanTask[];
  definitionOfDone?: string;
};

export type GoalPlanStrategy = {
  id?: string;
  title: string;
  body: string;
  measurableGoal?: string;
  why?: string;
  proofPoints?: string[];
  effort?: string;
  tags?: string[];
};

export type GoalPlanChecklist = {
  id?: string;
  title: string;
  items?: GoalPlanTask[];
};

export type GoalSuccessDefinition = {
  deadlineLabel?: string;
  metrics?: Array<{ label: string; target: string }>;
};

export type GoalStep = {
  stepId: string;
  prompt: string;
  control: string;
  options: GoalStepOption[];
  allowFreeText?: boolean;
  findings?: GoalFinding[];
  milestones?: GoalMilestone[];
  mission?: string;
  recommendation?: string;
  successDefinition?: GoalSuccessDefinition;
  phases?: Array<{ id?: string; title: string; windowLabel?: string; outcome?: string }>;
  days?: GoalPlanDay[];
  strategies?: GoalPlanStrategy[];
  checklists?: GoalPlanChecklist[];
  scorecard?: Array<{ area: string; criteria: string }>;
  note?: string;
  brief?: string[];
  realityCheck?: string;
  primaryFocus?: string;
  secondaryFocus?: string;
  starter?: string;
  assumptions?: string[];
  resourceSplit?: Array<{ item: string; amount: string }>;
  openQuestions?: Array<{ id?: string; prompt: string; options?: GoalStepOption[] }>;
};

export type GoalPlan = {
  version?: number;
  measurementType?: string;
  summary?: string;
  mission?: string;
  recommendation?: string;
  successDefinition?: GoalSuccessDefinition;
  milestones?: GoalMilestone[];
  phases?: Array<{ id?: string; title: string; windowLabel?: string; outcome?: string }>;
  days?: GoalPlanDay[];
  strategies?: GoalPlanStrategy[];
  checklists?: GoalPlanChecklist[];
  scorecard?: Array<{ area: string; criteria: string }>;
  assumptions?: string[];
};

export type GoalRecord = {
  id: string;
  title: string;
  statement: string;
  status: string;
  goalType?: string;
  description?: string;
  category: string;
  audience?: string;
  targetMetric?: string;
  timeframe: string;
  successCriteria: string;
  availableHoursPerWeek: number | null;
  constraints: string[];
  missingMaterial?: string[];
  measurementType: string;
  completeness: number;
  healthStatus: string;
  latestStep: GoalStep | null;
  proposedPlan: GoalPlan | null;
  approvedPlan: GoalPlan | null;
  activePlanVersion: number;
};

export type GoalJob = {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'ready' | 'failed' | string;
  error: string;
};

export type GoalSetup = {
  goal: GoalRecord;
  job: GoalJob | null;
  spaces: Array<{ id: string; name: string }>;
};

export type GoalDashboard = {
  goalId: string;
  title: string;
  status: string;
  healthStatus: string;
  statement: string;
  timeframe: string;
  deadlineLabel: string;
  successCriteria: string;
  outcomeLabel: string;
  outcomeProgress: number | null;
  workCompleted: number;
  workTotal: number;
  taskProgress?: {
    completed: number;
    total: number;
    checklistCompleted: number;
    checklistTotal: number;
  };
  chart: { points: Array<{ label: string; target: number | null; actual: number | null }> };
  milestones: Array<{
    title: string;
    dueLabel: string;
    successCriteria: string[];
    status: string;
  }>;
  mission?: string;
  recommendation?: string;
  positioningHeadline?: string;
  positioningBody?: string;
  immediateNextStep?: string;
  funnelTargets?: string[];
  successDefinition?: GoalSuccessDefinition;
  phases?: Array<{ id?: string; title: string; windowLabel?: string; outcome?: string }>;
  days?: GoalPlanDay[];
  strategies?: GoalPlanStrategy[];
  checklists?: GoalPlanChecklist[];
  scorecard?: Array<{ area: string; criteria: string }>;
  assumptions?: string[];
  recommendations: Array<{
    id: string;
    title: string;
    reason: string;
    priority: string;
    milestoneTitle: string;
    suggestedDurationMinutes: number;
    howSteps?: string[];
    measurableGoal?: string;
    relatedStrategyId?: string;
    source?: string;
  }>;
  evidence: Array<{
    id: string;
    text: string;
    category: string;
    verification: string;
    sourceType: string;
  }>;
  latestReview: { summary: string; periodType: string; focus: string } | null;
  workspace?: GoalWorkspace | null;
  proposedRevision: { version: number; summary: string } | null;
  planSummary: string;
  progress?: {
    execution?: { completed?: number; total?: number; ratio?: number | null };
    readiness?: { milestonesDone?: number; milestonesTotal?: number };
    achievement?: { achieved?: boolean; label?: string };
  };
};

export type GoalWorkspaceStep = {
  id: string;
  dayIndex: number;
  date: string;
  dateLabel: string;
  title: string;
  category: string;
  minutes: number;
  example?: boolean;
  status: 'open' | 'done' | 'skipped' | 'today' | 'overdue' | string;
  checklist: Array<{ id: string; text: string; done: boolean; why?: string; definitionOfDone?: string }>;
  checklistDone: number;
  checklistTotal: number;
  why: string;
  outcome: string;
  doneWhen: string;
  notes: string;
  partOf: string;
  overdueDays: number;
};

export type GoalWorkspace = {
  title: string;
  status: string;
  startedOn: string;
  startedLabel: string;
  endsOn: string;
  endsLabel: string;
  dayNumber: number;
  horizonDays: number;
  stepsDone: number;
  stepsTotal: number;
  daysLeft: number;
  progressPercent: number;
  pace: 'on_track' | 'at_risk' | 'achieved' | string;
  paceLabel: string;
  achieved: boolean;
  finishedEarlyDays: number | null;
  today: string;
  metric: {
    label: string;
    current: number | null;
    target: number | null;
    todayTarget: number | null;
    lastLogged: number | null;
    lastLoggedOn: string | null;
    lastLoggedLabel: string;
    streak: number;
  };
  chart: Array<{ day: number; label: string; date: string; real: number | null; target: number | null }>;
  coach: {
    status: 'ready' | 'thinking' | string;
    text: string;
    evidence: Array<{ id: string; label: string; kind: string; dateLabel: string; example?: boolean }>;
  };
  todayStep: GoalWorkspaceStep | null;
  attention: GoalWorkspaceStep[];
  weeks: Array<{
    id: string;
    label: string;
    rangeLabel: string;
    flag: string;
    done: number;
    total: number;
    expanded: boolean;
    steps: GoalWorkspaceStep[];
  }>;
  strategies: Array<{
    id: string;
    title: string;
    body: string;
    overview: string;
    done: number;
    total: number;
    percent: number;
    active: boolean;
    windowLabel: string;
    linkedSteps: Array<{ id: string; title: string; dayLabel: string; done: boolean }>;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    reason: string;
    windowLabel: string;
    howSteps: string[];
    category: string;
    added: boolean;
    related: Array<{ id: string; label: string; done: boolean }>;
  }>;
  checkIn: {
    weekLabel: string;
    headline: string;
    stepsDone: number;
    stepsTotal: number;
    usersCurrent: number | null;
    usersTarget: number | null;
    pacePercent: number | null;
    notesAdded: number;
    completed: Array<{ id: string; title: string; doneOn: string; overdue: boolean; done: boolean }>;
    adjustments: Array<{ id: string; title: string; reason: string; selected: boolean; kind: string }>;
    reflection: string;
  } | null;
  recovery: {
    riskLabel: string;
    title: string;
    summary: string;
    actions: Array<{ id: string; title: string; detail: string; example?: boolean }>;
    projection: string;
  } | null;
};

export type GoalSummary = {
  id: string;
  title: string;
  description: string;
  status: string;
  completeness: number;
  healthStatus: string;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const unwrap = <T,>(response: Envelope<T>, fallback: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallback);
  }
  return response.data;
};

export const goalsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getGoals: builder.query<GoalSummary[], void>({
      query: () => 'goals',
      transformResponse: (response: Envelope<{ goals: GoalSummary[] }>) =>
        unwrap(response, 'Unable to load goals').goals ?? [],
      providesTags: [{ type: 'Goals', id: 'LIST' }],
    }),
    getGoal: builder.query<GoalRecord, string>({
      query: (goalId) => `goals/${goalId}`,
      transformResponse: (response: Envelope<{ goal: GoalRecord }>) =>
        unwrap(response, 'Unable to load this goal').goal,
      providesTags: (_result, _error, goalId) => [{ type: 'Goals', id: goalId }],
    }),
    getGoalSetup: builder.query<GoalSetup, string>({
      query: (goalId) => `goals/${goalId}/setup`,
      transformResponse: (response: Envelope<GoalSetup>) => unwrap(response, 'Unable to load this goal'),
      providesTags: (_result, _error, goalId) => [{ type: 'Goals', id: goalId }],
    }),
    createGoal: builder.mutation<{ goal: GoalRecord; job: GoalJob | null }, { statement: string }>({
      query: (body) => ({ url: 'goals', method: 'POST', body }),
      transformResponse: (response: Envelope<{ goal: GoalRecord; job: GoalJob | null }>) =>
        unwrap(response, 'Unable to start this goal'),
      invalidatesTags: [{ type: 'Goals', id: 'LIST' }],
    }),
    answerGoal: builder.mutation<
      { goalId: string; job: GoalJob | null },
      { goalId: string; stepId: string; value: string | string[] }
    >({
      query: ({ goalId, stepId, value }) => ({
        url: `goals/${goalId}/answers`,
        method: 'POST',
        body: { stepId, value },
      }),
      transformResponse: (response: Envelope<{ goalId: string; job: GoalJob | null }>) =>
        unwrap(response, 'Unable to save that answer'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }],
    }),
    setGoalSpaces: builder.mutation<GoalSetup, { goalId: string; spaceIds: string[] }>({
      query: ({ goalId, spaceIds }) => ({
        url: `goals/${goalId}/spaces`,
        method: 'PUT',
        body: { spaceIds },
      }),
      transformResponse: (response: Envelope<GoalSetup>) => unwrap(response, 'Unable to save Spaces'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }],
    }),
    activateGoal: builder.mutation<{ goal: GoalRecord }, string>({
      query: (goalId) => ({ url: `goals/${goalId}/activate`, method: 'POST' }),
      transformResponse: (response: Envelope<{ goal: GoalRecord }>) => unwrap(response, 'Unable to approve this plan'),
      invalidatesTags: (_result, _error, goalId) => [
        { type: 'Goals', id: goalId },
        { type: 'Goals', id: 'LIST' },
      ],
    }),
    retryGoalJob: builder.mutation<{ job: GoalJob }, { goalId: string; jobId: string }>({
      query: ({ goalId, jobId }) => ({
        url: `goals/${goalId}/jobs/${jobId}/retry`,
        method: 'POST',
      }),
      transformResponse: (response: Envelope<{ job: GoalJob }>) => unwrap(response, 'Unable to retry this step'),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }],
    }),
    getGoalDashboard: builder.query<GoalDashboard, string>({
      query: (goalId) => `goals/${goalId}/dashboard`,
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to load this goal').dashboard,
      providesTags: (_result, _error, goalId) => [{ type: 'Goals', id: goalId }],
    }),
    checkInGoal: builder.mutation<GoalDashboard, { goalId: string; value: number; note?: string }>({
      query: ({ goalId, value, note }) => ({
        url: `goals/${goalId}/checkins`,
        method: 'POST',
        body: { value, note },
      }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to save that check-in').dashboard,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }, { type: 'Goals', id: 'LIST' }],
    }),
    feedbackGoal: builder.mutation<GoalDashboard, { goalId: string; recommendationId: string; reaction: string }>({
      query: ({ goalId, recommendationId, reaction }) => ({
        url: `goals/${goalId}/recommendations/${recommendationId}/feedback`,
        method: 'POST',
        body: { reaction },
      }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to save that response').dashboard,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }],
    }),
    pauseGoal: builder.mutation<GoalDashboard, string>({
      query: (goalId) => ({ url: `goals/${goalId}/pause`, method: 'POST' }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to update this goal').dashboard,
      invalidatesTags: (_result, _error, goalId) => [{ type: 'Goals', id: goalId }, { type: 'Goals', id: 'LIST' }],
    }),
    approveGoalRevision: builder.mutation<GoalDashboard, string>({
      query: (goalId) => ({ url: `goals/${goalId}/plan/approve`, method: 'POST' }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to approve that plan').dashboard,
      invalidatesTags: (_result, _error, goalId) => [{ type: 'Goals', id: goalId }],
    }),
    deleteGoal: builder.mutation<{ goalId: string }, string>({
      query: (goalId) => ({ url: `goals/${goalId}`, method: 'DELETE' }),
      transformResponse: (response: Envelope<{ goalId: string }>) =>
        unwrap(response, 'Unable to delete this goal'),
      invalidatesTags: (_result, _error, goalId) => [
        { type: 'Goals', id: goalId },
        { type: 'Goals', id: 'LIST' },
      ],
    }),
    goalWorkspaceAction: builder.mutation<
      GoalDashboard,
      {
        goalId: string;
        action: 'complete' | 'reopen' | 'note' | 'reschedule' | 'apply_recommendation' | 'apply_checkin';
        stepId?: string;
        date?: string;
        note?: string;
        mode?: 'move' | 'skip' | 'split' | string;
        recommendationId?: string;
        adjustmentIds?: string[];
        reflection?: string;
      }
    >({
      query: ({ goalId, ...body }) => ({
        url: `goals/${goalId}/workspace/actions`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to update this goal').dashboard,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }, { type: 'Goals', id: 'LIST' }],
    }),
    toggleGoalPlanItem: builder.mutation<
      GoalDashboard,
      {
        goalId: string;
        kind: 'day_task' | 'checklist_item';
        itemId: string;
        done?: boolean;
        note?: string;
      }
    >({
      query: ({ goalId, kind, itemId, done, note }) => ({
        url: `goals/${goalId}/plan/items/toggle`,
        method: 'POST',
        body: { kind, itemId, done, note },
      }),
      transformResponse: (response: Envelope<{ dashboard: GoalDashboard }>) =>
        unwrap(response, 'Unable to update that task').dashboard,
      invalidatesTags: (_result, _error, arg) => [{ type: 'Goals', id: arg.goalId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGoalsQuery,
  useGetGoalQuery,
  useGetGoalSetupQuery,
  useCreateGoalMutation,
  useAnswerGoalMutation,
  useSetGoalSpacesMutation,
  useActivateGoalMutation,
  useRetryGoalJobMutation,
  useGetGoalDashboardQuery,
  useCheckInGoalMutation,
  useFeedbackGoalMutation,
  usePauseGoalMutation,
  useApproveGoalRevisionMutation,
  useToggleGoalPlanItemMutation,
  useGoalWorkspaceActionMutation,
  useDeleteGoalMutation,
} = goalsApi;
