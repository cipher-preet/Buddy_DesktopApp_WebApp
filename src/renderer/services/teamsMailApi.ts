import { api } from '@/services/api';

type SendCheckRecipient = {
  email: string;
  name: string;
  spaces: string[];
};

type SendCheckResponse = {
  success: boolean;
  data?: {
    sentCount: number;
  };
  message?: string;
};

export const teamsMailApi = api.injectEndpoints({
  endpoints: (builder) => ({
    sendTeamMailCheck: builder.mutation<SendCheckResponse, { recipients: SendCheckRecipient[] }>({
      query: (body) => ({
        url: 'mail/send-check',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSendTeamMailCheckMutation } = teamsMailApi;
