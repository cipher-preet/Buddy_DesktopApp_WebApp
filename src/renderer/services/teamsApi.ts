import { api } from '@/services/api';

export type TeamPerson = {
  id: string;
  name: string;
  email: string;
  permission: 'Owner' | 'Can view';
  spaceIds: string[];
  spaceNames: string[];
};

export type SpaceInvitation = {
  id: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked' | string;
  expiresAt?: string;
  inviteeEmail: string;
  inviter: {
    id: string;
    name: string;
    email: string;
  };
  spaces: Array<{ id: string; name: string }>;
};

type Envelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const unwrap = <T>(response: Envelope<T>, fallback: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallback);
  }
  return response.data;
};

export const teamsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listTeamPeople: builder.query<TeamPerson[], void>({
      query: () => 'teams/people',
      transformResponse: (response: Envelope<{ people: TeamPerson[] }>) =>
        unwrap(response, 'Unable to load people').people,
      providesTags: ['TeamPeople'],
    }),
    listInvitations: builder.query<SpaceInvitation[], void>({
      query: () => 'teams/invitations',
      transformResponse: (response: Envelope<{ invitations: SpaceInvitation[] }>) =>
        unwrap(response, 'Unable to load invitations').invitations,
      providesTags: ['TeamInvitations'],
    }),
    listSentInvitations: builder.query<SpaceInvitation[], void>({
      query: () => 'teams/invitations/sent',
      transformResponse: (response: Envelope<{ invitations: SpaceInvitation[] }>) =>
        unwrap(response, 'Unable to load sent invitations').invitations,
      providesTags: ['TeamInvitations'],
    }),
    previewInvitation: builder.query<SpaceInvitation, string>({
      query: (token) => `teams/invitations/${encodeURIComponent(token)}`,
      transformResponse: (response: Envelope<SpaceInvitation>) =>
        unwrap(response, 'Unable to open this invitation'),
    }),
    sendInvitation: builder.mutation<SpaceInvitation, { email: string; spaceIds: string[] }>({
      query: (body) => ({
        url: 'teams/invitations',
        method: 'POST',
        body,
      }),
      transformResponse: (response: Envelope<SpaceInvitation>) =>
        unwrap(response, 'Unable to send the invitation'),
      invalidatesTags: ['TeamInvitations'],
    }),
    acceptInvitation: builder.mutation<
      { alreadyAccepted: boolean; invitation: SpaceInvitation },
      string
    >({
      query: (token) => ({
        url: `teams/invitations/${encodeURIComponent(token)}/accept`,
        method: 'POST',
      }),
      transformResponse: (
        response: Envelope<{ alreadyAccepted: boolean; invitation: SpaceInvitation }>,
      ) => unwrap(response, 'Unable to accept this invitation'),
      invalidatesTags: ['TeamInvitations', 'TeamPeople', { type: 'Spaces', id: 'LIST' }, 'Meetings'],
    }),
    rejectInvitation: builder.mutation<
      { alreadyRejected: boolean; invitation: SpaceInvitation },
      string
    >({
      query: (token) => ({
        url: `teams/invitations/${encodeURIComponent(token)}/reject`,
        method: 'POST',
      }),
      transformResponse: (
        response: Envelope<{ alreadyRejected: boolean; invitation: SpaceInvitation }>,
      ) => unwrap(response, 'Unable to decline this invitation'),
      invalidatesTags: ['TeamInvitations'],
    }),
    revokeInvitation: builder.mutation<
      { alreadyRevoked: boolean; invitation: SpaceInvitation },
      string
    >({
      query: (invitationId) => ({
        url: `teams/invitations/${encodeURIComponent(invitationId)}/revoke`,
        method: 'POST',
      }),
      transformResponse: (
        response: Envelope<{ alreadyRevoked: boolean; invitation: SpaceInvitation }>,
      ) => unwrap(response, 'Unable to revoke this invitation'),
      invalidatesTags: ['TeamInvitations', 'TeamPeople', { type: 'Spaces', id: 'LIST' }, 'Meetings'],
    }),
    removeInvitationSpace: builder.mutation<
      { alreadyRevoked: boolean; removed: boolean; invitation: SpaceInvitation },
      { invitationId: string; spaceId: string }
    >({
      query: ({ invitationId, spaceId }) => ({
        url: `teams/invitations/${encodeURIComponent(invitationId)}/spaces/remove`,
        method: 'POST',
        body: { spaceId },
      }),
      transformResponse: (
        response: Envelope<{ alreadyRevoked: boolean; removed: boolean; invitation: SpaceInvitation }>,
      ) => unwrap(response, 'Unable to remove this space'),
      invalidatesTags: ['TeamInvitations', 'TeamPeople', { type: 'Spaces', id: 'LIST' }, 'Meetings'],
    }),
  }),
});

export const {
  useListTeamPeopleQuery,
  useListInvitationsQuery,
  useListSentInvitationsQuery,
  usePreviewInvitationQuery,
  useSendInvitationMutation,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useRemoveInvitationSpaceMutation,
  useRevokeInvitationMutation,
} = teamsApi;
