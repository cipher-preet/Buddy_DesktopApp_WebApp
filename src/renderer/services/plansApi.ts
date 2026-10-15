import { api } from '@/services/api';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type PlanCode = 'free' | 'pro' | 'business';
export type PlanInterval = 'forever' | 'monthly' | 'yearly';
export type MarketplaceAccess = 'none' | 'limited' | 'full';

export type PlanLimits = {
  notesRecordingHours?: number;
  meetingRecordingHours?: number;
  mindmaps?: number;
  documents?: number;
  goals?: number;
  marketplaceAccess?: MarketplaceAccess;
  notesRecordingMs?: number;
  meetingRecordingMs?: number;
  /** @deprecated Prefer notesRecordingHours */
  recordingHours?: number;
  /** @deprecated Prefer notesRecordingMs */
  recordingMs?: number;
};

export type Plan = {
  _id: string;
  code: PlanCode;
  name: string;
  description: string;
  amount: number;
  yearlyAmount?: number;
  currency: string;
  interval: PlanInterval;
  limits: PlanLimits;
  languages?: string[];
  features: string[];
  isActive: boolean;
  sortOrder?: number;
};

export type PlanEntitlement = {
  planCode?: PlanCode | string;
  status?: string;
  currentPeriodEnd?: string | null;
  notesRemainingMs?: number;
  meetingRemainingMs?: number;
  isListeningActive?: boolean;
};

export type PlanStatus = {
  subscription: {
    _id: string;
    planCode: PlanCode;
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  };
  plan: Plan;
  usage: PlanLimits & {
    notesRecordingMsPersisted?: number;
    notesRecordingMsLiveUnreported?: number;
  };
  entitlement?: PlanEntitlement;
};

export type PaymentOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan: Plan;
  interval?: 'monthly' | 'yearly';
  paymentId: string;
  requiresPayment: boolean;
  message?: string;
  subscription?: {
    planCode?: PlanCode;
    status?: string;
  };
};

export type VerifiedPayment = {
  message?: string;
  subscription?: {
    planCode?: PlanCode;
    status?: string;
  };
};

export type PaymentStatus = {
  paid: boolean;
  status: string;
  planCode?: PlanCode | string;
  message?: string;
  paymentId?: string;
};

export type PaymentLink = {
  paymentId: string;
  paymentLinkId: string;
  paymentLinkUrl: string;
  plan: Plan;
  requiresPayment: boolean;
  message?: string;
};

const unwrapApiData = <T,>(response: ApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

export const plansApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query<{ plans: Plan[] }, void>({
      query: () => ({
        url: 'plans',
        method: 'GET',
      }),
      transformResponse: (response: ApiEnvelope<{ plans: Plan[] }>) =>
        unwrapApiData(response, 'Unable to load plans'),
      providesTags: ['Plans'],
    }),
    getPlanStatus: builder.query<PlanStatus, { userId: string }>({
      query: ({ userId }) => ({
        url: 'plans/status',
        method: 'GET',
        params: { userId },
      }),
      transformResponse: (response: ApiEnvelope<PlanStatus>) =>
        unwrapApiData(response, 'Unable to load plan status'),
      keepUnusedDataFor: 120,
      providesTags: ['Plans'],
    }),
    activateFreePlan: builder.mutation<{ message?: string }, { userId: string }>({
      query: (body) => ({
        url: 'plans/free',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<{ message?: string }>) =>
        unwrapApiData(response, 'Unable to switch to Free plan'),
      invalidatesTags: ['Plans'],
    }),
    validatePlanLimit: builder.mutation<
      {
        resource: string;
        limit: number;
        used: number;
        planCode?: string;
        remainingMs?: number;
      },
      {
        userId: string;
        resource:
          | 'notesRecordingHours'
          | 'meetingRecordingHours'
          | 'mindmaps'
          | 'documents'
          | 'goals';
        nextCount?: number;
      }
    >({
      query: (body) => ({
        url: 'plans/validate-limit',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: ApiEnvelope<{
          resource: string;
          limit: number;
          used: number;
          planCode?: string;
          remainingMs?: number;
        }>,
      ) => unwrapApiData(response, 'Unable to validate plan limit'),
    }),
    reportListeningUsage: builder.mutation<
      {
        resource?: string;
        remainingMs?: number;
        forceStop?: boolean;
        planCode?: string;
        active?: boolean;
        addedMs?: number;
        usedMs?: number;
      },
      { userId: string }
    >({
      query: (body) => ({
        url: 'plans/report-listening',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: ApiEnvelope<{
          resource?: string;
          remainingMs?: number;
          forceStop?: boolean;
          planCode?: string;
          active?: boolean;
          addedMs?: number;
          usedMs?: number;
        }>,
      ) => unwrapApiData(response, 'Unable to report listening usage'),
    }),
    createPaymentOrder: builder.mutation<
      PaymentOrder,
      {
        userId: string;
        planCode: PlanCode;
        interval?: 'monthly' | 'yearly';
      }
    >({
      query: (body) => ({
        url: 'payments/order',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<PaymentOrder>) =>
        unwrapApiData(response, 'Unable to start checkout'),
    }),
    verifyPayment: builder.mutation<
      VerifiedPayment,
      {
        userId: string;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }
    >({
      query: (body) => ({
        url: 'payments/verify',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<VerifiedPayment>) =>
        unwrapApiData(response, 'Unable to confirm payment'),
      invalidatesTags: ['Plans'],
    }),
    getPaymentStatus: builder.query<
      PaymentStatus,
      {
        userId: string;
        orderId: string;
      }
    >({
      query: ({ userId, orderId }) => ({
        url: 'payments/status',
        method: 'GET',
        params: { userId, orderId },
      }),
      transformResponse: (response: ApiEnvelope<PaymentStatus>) =>
        unwrapApiData(response, 'Unable to check payment status'),
    }),
    createPaymentLink: builder.mutation<
      PaymentLink,
      {
        userId: string;
        planCode: PlanCode;
        interval?: 'monthly' | 'yearly';
        name?: string | null;
        email?: string | null;
        phone?: string | number | null;
      }
    >({
      query: (body) => ({
        url: 'payments/payment-link',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiEnvelope<PaymentLink>) =>
        unwrapApiData(response, 'Unable to start checkout'),
      invalidatesTags: ['Plans'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlansQuery,
  useGetPlanStatusQuery,
  useActivateFreePlanMutation,
  useValidatePlanLimitMutation,
  useReportListeningUsageMutation,
  useCreatePaymentOrderMutation,
  useVerifyPaymentMutation,
  useLazyGetPaymentStatusQuery,
  useCreatePaymentLinkMutation,
} = plansApi;
