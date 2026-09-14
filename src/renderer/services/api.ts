import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Health'],
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => '/health',
      providesTags: ['Health'],
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

export const { useGetHealthQuery, useRaiseSupportTicketMutation, useSubmitFeedbackMutation } = api;
