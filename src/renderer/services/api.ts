import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { setUnauthenticated } from '@/features/auth/authSlice';
import { getStoredAuthToken } from '@/features/auth/authStorage';
import type {
  AuthApiEnvelope,
  AuthPayload,
  CheckAuthData,
  CheckPhoneData,
  LogoutData,
  SendOtpData,
} from '@/features/auth/authTypes';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export type HealthResponse = {
  status: string;
  service?: string;
};

export type SubmitFeedbackRequest = {
  topicId: string;
  topicLabel: string;
  message: string;
};

export type SubmitFeedbackResponse = {
  success: boolean;
  data?: {
    message?: string;
    feedbackId?: string;
  };
  message?: string;
};

export type RaiseSupportTicketRequest = {
  categoryId: string;
  categoryLabel: string;
  subject: string;
  message: string;
};

export type RaiseSupportTicketResponse = {
  success: boolean;
  data?: {
    message?: string;
    ticketId?: string;
    status?: string;
  };
  message?: string;
};

export type SendOtpRequest = {
  phone: string;
};

export type CheckPhoneRequest = {
  phone: string;
};

export type VerifyOtpRequest = {
  phone: string;
  otp: string;
  username?: string;
  platform?: 'web' | 'android' | 'ios';
};

export type GoogleLoginRequest = {
  idToken: string;
  platform?: 'web' | 'android' | 'ios';
};

export type DeleteAccountRequest = {
  confirmation: 'DELETE';
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    headers.set('Accept', 'application/json');

    const stateToken = (getState() as { auth?: { token?: string | null } }).auth?.token;
    const token = stateToken || getStoredAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const PUBLIC_AUTH_PATHS = ['auth/send-otp', 'auth/check-phone', 'auth/verify-otp', 'auth/google', 'auth/login'];

const isPublicAuthRequest = (args: string | FetchArgs) => {
  const url = typeof args === 'string' ? args : args.url;
  return PUBLIC_AUTH_PATHS.some((path) => url === path || url.startsWith(`${path}?`));
};

const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const requestUrl = typeof args === 'string' ? args : args.url;

  // Don't wipe the local session on checkauth failures here — App.tsx decides
  // whether a 401 should logout. Still logout on 401 for other protected APIs.
  if (
    result.error?.status === 401 &&
    !isPublicAuthRequest(args) &&
    requestUrl !== 'auth/checkauth'
  ) {
    api.dispatch(setUnauthenticated());
  }

  return result;
};

const unwrapAuthData = <T,>(response: AuthApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Health',
    'Auth',
    'Spaces',
    'SpaceTasks',
    'SpaceNotes',
    'ChatSessions',
    'ChatMessages',
    'CalendarFeed',
  ],
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => '/health',
      providesTags: ['Health'],
    }),
    sendOtp: builder.mutation<SendOtpData, SendOtpRequest>({
      query: (body) => ({
        url: 'auth/send-otp',
        method: 'POST',
        body,
      }),
      transformResponse: (response: AuthApiEnvelope<SendOtpData>) =>
        unwrapAuthData(response, 'Unable to send verification code'),
    }),
    checkPhone: builder.mutation<CheckPhoneData, CheckPhoneRequest>({
      query: (body) => ({
        url: 'auth/check-phone',
        method: 'POST',
        body,
      }),
      transformResponse: (response: AuthApiEnvelope<CheckPhoneData>) =>
        unwrapAuthData(response, 'Unable to verify mobile number'),
    }),
    verifyOtp: builder.mutation<AuthPayload, VerifyOtpRequest>({
      query: (body) => ({
        url: 'auth/verify-otp',
        method: 'POST',
        body: {
          ...body,
          platform: body.platform ?? 'web',
        },
      }),
      transformResponse: (response: AuthApiEnvelope<AuthPayload>) =>
        unwrapAuthData(response, 'Unable to verify OTP'),
    }),
    googleLogin: builder.mutation<AuthPayload, GoogleLoginRequest>({
      query: (body) => ({
        url: 'auth/google',
        method: 'POST',
        body: {
          ...body,
          platform: body.platform ?? 'web',
        },
      }),
      transformResponse: (response: AuthApiEnvelope<AuthPayload>) =>
        unwrapAuthData(response, 'Google sign-in failed'),
    }),
    checkAuth: builder.query<CheckAuthData, void>({
      query: () => ({
        url: 'auth/checkauth',
        method: 'GET',
      }),
      transformResponse: (response: AuthApiEnvelope<CheckAuthData>) =>
        unwrapAuthData(response, 'Session is not active'),
      providesTags: ['Auth'],
    }),
    logout: builder.mutation<LogoutData, void>({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      transformResponse: (response: AuthApiEnvelope<LogoutData>) =>
        unwrapAuthData(response, 'Logout failed'),
      invalidatesTags: ['Auth'],
    }),
    deleteAccount: builder.mutation<{ message?: string }, DeleteAccountRequest>({
      query: (body) => ({
        url: 'auth/me',
        method: 'DELETE',
        body,
      }),
      transformResponse: (response: AuthApiEnvelope<{ message?: string }>) =>
        unwrapAuthData(response, 'Unable to delete account'),
      invalidatesTags: ['Auth'],
    }),
    submitFeedback: builder.mutation<SubmitFeedbackResponse, SubmitFeedbackRequest>({
      query: (body) => ({
        url: 'home/submit-feedback',
        method: 'POST',
        body,
      }),
    }),
    raiseSupportTicket: builder.mutation<RaiseSupportTicketResponse, RaiseSupportTicketRequest>({
      query: (body) => ({
        url: 'home/raise-support-ticket',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetHealthQuery,
  useSendOtpMutation,
  useCheckPhoneMutation,
  useVerifyOtpMutation,
  useGoogleLoginMutation,
  useLazyCheckAuthQuery,
  useLogoutMutation,
  useDeleteAccountMutation,
  useRaiseSupportTicketMutation,
  useSubmitFeedbackMutation,
} = api;
