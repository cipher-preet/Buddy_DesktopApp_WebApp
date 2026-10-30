import { useMemo, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiUser, FiX } from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getApiErrorMessage } from '@/services/apiErrors';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';
import {
  useAcceptInvitationMutation,
  useListInvitationsQuery,
  useListSentInvitationsQuery,
  useListTeamPeopleQuery,
  useRejectInvitationMutation,
  useRemoveInvitationSpaceMutation,
  useRevokeInvitationMutation,
  useSendInvitationMutation,
  type SpaceInvitation,
} from '@/services/teamsApi';

import { AddPeopleModal, type AddedPerson } from './AddPeopleModal';
import { MemberProfile } from './MemberProfile';

import './teams.css';

type TeamsView = 'people' | 'everyone' | 'invitations';

export const TeamsPage = () => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId || '');
  const [sendInvitation] = useSendInvitationMutation();
  const [acceptInvitationRequest] = useAcceptInvitationMutation();
  const [rejectInvitationRequest] = useRejectInvitationMutation();
  const [revokeInvitationRequest, { isLoading: isRevoking }] = useRevokeInvitationMutation();
  const [removeInvitationSpaceRequest, { isLoading: isRemovingSpace }] = useRemoveInvitationSpaceMutation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [view, setView] = useState<TeamsView>('people');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SpaceInvitation | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    invitation: SpaceInvitation;
    spaceId: string;
    spaceName: string;
  } | null>(null);

  const { data, isLoading, isError, error, refetch } = useGetUserSpacesInfiniteQuery(
    { userId, limit: 50, counts: 'none' },
    { skip: !userId },
  );
  const {
    data: people = [],
    isLoading: isPeopleLoading,
    isError: isPeopleError,
    error: peopleError,
  } = useListTeamPeopleQuery();
  const {
    data: invitations = [],
    isLoading: isInvitationsLoading,
    isError: isInvitationsError,
    error: invitationsError,
  } = useListInvitationsQuery();
  const {
    data: sentInvitations = [],
    isLoading: isSentLoading,
    isError: isSentError,
    error: sentError,
  } = useListSentInvitationsQuery();

  const invitationCount =
    invitations.length + sentInvitations.filter((invitation) => invitation.status === 'pending').length;

  const spaces = useMemo(
    () => (data?.pages.flatMap((page) => page.spaces) ?? []).filter((space) => !space.shared),
    [data],
  );
  const spacesError = isError ? getApiErrorMessage(error, 'Unable to load spaces') : null;

  const grouped = useMemo(() => {
    const bySpace = new Map<string, { spaceId: string; spaceName: string; people: AddedPerson[] }>();
    for (const person of people) {
      person.spaceIds.forEach((spaceId, index) => {
        const spaceName = person.spaceNames[index] ?? 'Space';
        const group = bySpace.get(spaceId) ?? { spaceId, spaceName, people: [] };
        group.people.push(person);
        bySpace.set(spaceId, group);
      });
    }
    return [...bySpace.values()];
  }, [people]);

  const addPeople = async (incoming: AddedPerson[]) => {
    const recipients = incoming.filter((person) => person.email.includes('@'));
    if (recipients.length === 0) {
      throw new Error('Enter a valid email address.');
    }

    try {
      for (const person of recipients) {
        await sendInvitation({ email: person.email, spaceIds: person.spaceIds }).unwrap();
      }
    } catch (sendError) {
      throw new Error(getApiErrorMessage(sendError, 'Unable to send the invitation.'));
    }

    setIsAddOpen(false);
    setView('invitations');
    showToast({
      message: 'Invitation sent',
      description: `Sent to ${recipients.map((person) => person.email).join(', ')}`,
      type: 'success',
    });
  };

  const shareSpaces = async (personId: string, spaceIds: string[]) => {
    const person = people.find((item) => item.id === personId);
    if (!person?.email) {
      showToast({
        message: 'No email on this account',
        description: 'An invitation needs an email address.',
        type: 'error',
      });
      return;
    }
    try {
      await sendInvitation({ email: person.email, spaceIds }).unwrap();
      showToast({
        message: 'Invitation sent',
        description: `${person.name} can accept the new spaces from their invitation.`,
        type: 'success',
      });
    } catch (sendError) {
      showToast({
        message: 'Unable to share spaces',
        description: getApiErrorMessage(sendError, 'The invitation was not sent.'),
        type: 'error',
      });
      throw sendError;
    }
  };

  const acceptInvitation = async (invitation: SpaceInvitation) => {
    setPendingInviteId(invitation.id);
    try {
      await acceptInvitationRequest(invitation.token).unwrap();
      showToast({
        message: 'Invitation accepted',
        description: `${invitation.inviter.name} is now in People you work with.`,
        type: 'success',
      });
    } catch (acceptError) {
      showToast({
        message: 'Unable to accept',
        description: getApiErrorMessage(acceptError, 'This invitation could not be accepted.'),
        type: 'error',
      });
    } finally {
      setPendingInviteId(null);
    }
  };

  const rejectInvitation = async (invitation: SpaceInvitation) => {
    setPendingInviteId(invitation.id);
    try {
      await rejectInvitationRequest(invitation.token).unwrap();
      showToast({
        message: 'Invitation declined',
        description: `You declined ${invitation.inviter.name}.`,
        type: 'info',
      });
    } catch (rejectError) {
      showToast({
        message: 'Unable to decline',
        description: getApiErrorMessage(rejectError, 'This invitation could not be declined.'),
        type: 'error',
      });
    } finally {
      setPendingInviteId(null);
    }
  };

  const revokeInvitation = async () => {
    if (!revokeTarget) {
      return;
    }
    try {
      const result = await revokeInvitationRequest(revokeTarget.id).unwrap();
      showToast({
        message: result.alreadyRevoked ? 'Already revoked' : 'Invitation revoked',
        description: result.alreadyRevoked
          ? `${revokeTarget.inviteeEmail} no longer has this invitation.`
          : `${revokeTarget.inviteeEmail} can no longer open these spaces.`,
        type: 'success',
      });
      setRevokeTarget(null);
    } catch (revokeError) {
      showToast({
        message: 'Unable to revoke',
        description: getApiErrorMessage(revokeError, 'This invitation could not be revoked.'),
        type: 'error',
      });
    }
  };

  const removeInvitationSpace = async () => {
    if (!removeTarget) {
      return;
    }
    try {
      const result = await removeInvitationSpaceRequest({
        invitationId: removeTarget.invitation.id,
        spaceId: removeTarget.spaceId,
      }).unwrap();
      const closed = result.alreadyRevoked || result.invitation.status === 'revoked';
      showToast({
        message: closed ? 'Invitation revoked' : 'Space removed',
        description: closed
          ? 'That was the last space, so the invitation was revoked.'
          : `${removeTarget.spaceName} is no longer part of this invitation.`,
        type: 'success',
      });
      setRemoveTarget(null);
    } catch (removeError) {
      showToast({
        message: 'Unable to remove space',
        description: getApiErrorMessage(removeError, 'That space could not be removed.'),
        type: 'error',
      });
    }
  };

  const selectedPerson = people.find((person) => person.id === selectedPersonId) ?? null;

  if (selectedPerson) {
    return (
      <section className="teams-page" aria-label="Teams">
        <MemberProfile
          person={selectedPerson}
          people={people}
          spaces={spaces}
          onBack={() => setSelectedPersonId(null)}
          onShareSpaces={shareSpaces}
        />
      </section>
    );
  }

  return (
    <section className="teams-page" aria-label="Teams">
      <header className="teams-toolbar">
        <div className="teams-toolbar__lead">
          <h1>
            {view === 'invitations' ? 'Invitations' : view === 'everyone' ? 'Everyone' : 'People you work with'}
          </h1>
          <button type="button" className="teams-add" onClick={() => setIsAddOpen(true)}>
            Add people
          </button>
          <button
            type="button"
            className="teams-invites"
            aria-pressed={view === 'invitations'}
            onClick={() => setView((current) => (current === 'invitations' ? 'people' : 'invitations'))}
          >
            Invitations
            {invitationCount > 0 ? <span>{invitationCount}</span> : null}
          </button>
        </div>
        <button
          type="button"
          className="teams-browse"
          onClick={() => setView((current) => (current === 'everyone' ? 'people' : 'everyone'))}
        >
          {view === 'people' ? (
            <>
              Browse everyone
              <FiArrowRight aria-hidden="true" size={14} />
            </>
          ) : (
            <>
              <FiArrowLeft aria-hidden="true" size={14} />
              People you work with
            </>
          )}
        </button>
      </header>

      {view === 'invitations' ? (
        <InvitationPanel
          invitations={invitations}
          sentInvitations={sentInvitations}
          isReceivedLoading={isInvitationsLoading}
          isSentLoading={isSentLoading}
          receivedError={
            isInvitationsError ? getApiErrorMessage(invitationsError, 'Unable to load invitations') : null
          }
          sentError={isSentError ? getApiErrorMessage(sentError, 'Unable to load sent invitations') : null}
          pendingId={pendingInviteId}
          onAccept={(invitation) => void acceptInvitation(invitation)}
          onReject={(invitation) => void rejectInvitation(invitation)}
          onRevoke={setRevokeTarget}
          onRemoveSpace={(invitation, spaceId, spaceName) =>
            setRemoveTarget({ invitation, spaceId, spaceName })
          }
        />
      ) : isPeopleLoading ? (
        <div className="teams-empty">
          <p>Loading people…</p>
        </div>
      ) : isPeopleError ? (
        <div className="teams-empty">
          <p>{getApiErrorMessage(peopleError, 'Unable to load people')}</p>
        </div>
      ) : people.length === 0 ? (
        <div className="teams-empty">
          <p>No people yet. Add someone and choose the spaces they belong to.</p>
        </div>
      ) : view === 'everyone' ? (
        <div className="teams-directory">
          {grouped.map((group) => (
            <section key={group.spaceId} className="teams-directory__group" aria-label={group.spaceName}>
              <h2>{group.spaceName}</h2>
              <ul className="teams-people">
                {group.people.map((person) => (
                  <PersonCard key={person.id} person={person} onOpen={setSelectedPersonId} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="teams-people">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} onOpen={setSelectedPersonId} />
          ))}
        </ul>
      )}

      {isAddOpen ? (
        <AddPeopleModal
          spaces={spaces}
          isLoadingSpaces={isLoading}
          spacesError={spacesError}
          onRetrySpaces={() => void refetch()}
          onClose={() => setIsAddOpen(false)}
          onAdd={addPeople}
        />
      ) : null}

      {revokeTarget ? (
        <ConfirmDialog
          tone="danger"
          title="Revoke invitation"
          description={`${revokeTarget.inviteeEmail} will lose access to every space in this invitation. The invitation link will stop working.`}
          confirmLabel="Revoke invitation"
          pendingLabel="Revoking…"
          isPending={isRevoking}
          onCancel={() => {
            if (!isRevoking) {
              setRevokeTarget(null);
            }
          }}
          onConfirm={revokeInvitation}
        />
      ) : null}

      {removeTarget ? (
        <ConfirmDialog
          tone="danger"
          title="Remove space"
          description={
            removeTarget.invitation.spaces.length <= 1
              ? `${removeTarget.spaceName} is the last space. Removing it revokes the invitation for ${removeTarget.invitation.inviteeEmail}.`
              : `${removeTarget.invitation.inviteeEmail} will no longer see ${removeTarget.spaceName}.`
          }
          confirmLabel="Remove space"
          pendingLabel="Removing…"
          isPending={isRemovingSpace}
          onCancel={() => {
            if (!isRemovingSpace) {
              setRemoveTarget(null);
            }
          }}
          onConfirm={removeInvitationSpace}
        />
      ) : null}
    </section>
  );
};

const statusLabel = (status: string) => {
  if (status === 'accepted') {
    return 'Accepted';
  }
  if (status === 'rejected') {
    return 'Declined';
  }
  if (status === 'expired') {
    return 'Expired';
  }
  if (status === 'revoked') {
    return 'Revoked';
  }
  return 'Waiting';
};

const InvitationPanel = ({
  invitations,
  sentInvitations,
  isReceivedLoading,
  isSentLoading,
  receivedError,
  sentError,
  pendingId,
  onAccept,
  onReject,
  onRevoke,
  onRemoveSpace,
}: {
  invitations: SpaceInvitation[];
  sentInvitations: SpaceInvitation[];
  isReceivedLoading: boolean;
  isSentLoading: boolean;
  receivedError: string | null;
  sentError: string | null;
  pendingId: string | null;
  onAccept: (invitation: SpaceInvitation) => void;
  onReject: (invitation: SpaceInvitation) => void;
  onRevoke: (invitation: SpaceInvitation) => void;
  onRemoveSpace: (invitation: SpaceInvitation, spaceId: string, spaceName: string) => void;
}) => {
  const stillLoading = (isReceivedLoading && invitations.length === 0) || (isSentLoading && sentInvitations.length === 0);
  if (stillLoading && !receivedError && !sentError) {
    return (
      <div className="teams-empty">
        <p>Loading invitations…</p>
      </div>
    );
  }

  return (
    <div className="invite-panels">
      <section className="invite-section" aria-label="Sent invitations">
        <h2>Sent</h2>
        {isSentLoading && sentInvitations.length === 0 ? (
          <p className="invite-section__empty">Loading sent invitations…</p>
        ) : sentError ? (
          <p className="invite-section__empty">{sentError}</p>
        ) : sentInvitations.length === 0 ? (
          <p className="invite-section__empty">You have not sent an invitation yet.</p>
        ) : (
          <ul className="invite-list">
            {sentInvitations.map((invitation) => {
              const canManage =
                invitation.status === 'pending' ||
                invitation.status === 'accepted' ||
                invitation.status === 'expired';

              return (
              <li key={invitation.id}>
                <article className="invite-row invite-row--sent">
                  <span className="invite-row__avatar" aria-hidden="true">
                    <FiUser size={18} />
                  </span>
                  <div className="invite-row__copy">
                    <strong>{invitation.inviteeEmail}</strong>
                    {invitation.status === 'revoked' ? (
                      <p>Access removed</p>
                    ) : canManage && invitation.spaces.length > 0 ? (
                      <ul className="invite-space-chips">
                        {invitation.spaces.map((space) => (
                          <li key={space.id}>
                            <span>{space.name}</span>
                            <button
                              type="button"
                              aria-label={`Remove ${space.name}`}
                              onClick={() => onRemoveSpace(invitation, space.id, space.name)}
                            >
                              <FiX size={12} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        {invitation.spaces.length > 0
                          ? invitation.spaces.map((space) => space.name).join(', ')
                          : 'Spaces no longer available'}
                      </p>
                    )}
                  </div>
                  <div className="invite-row__side">
                    <span className={`invite-status invite-status--${invitation.status}`}>
                      {statusLabel(invitation.status)}
                    </span>
                    {canManage ? (
                      <button type="button" className="invite-row__reject" onClick={() => onRevoke(invitation)}>
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </article>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="invite-section" aria-label="Received invitations">
        <h2>Received</h2>
        {isReceivedLoading && invitations.length === 0 ? (
          <p className="invite-section__empty">Loading received invitations…</p>
        ) : receivedError ? (
          <p className="invite-section__empty">{receivedError}</p>
        ) : invitations.length === 0 ? (
          <p className="invite-section__empty">No invitations waiting for you.</p>
        ) : (
          <ul className="invite-list">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <article className="invite-row">
                  <span className="invite-row__avatar" aria-hidden="true">
                    <FiUser size={18} />
                  </span>
                  <div className="invite-row__copy">
                    <strong>{invitation.inviter.name}</strong>
                    <p>
                      Invited you to {invitation.spaces.map((space) => space.name).join(', ')}
                      <span>{invitation.inviter.email}</span>
                    </p>
                  </div>
                  <div className="invite-row__actions">
                    <button
                      type="button"
                      className="invite-row__reject"
                      disabled={pendingId === invitation.id}
                      onClick={() => onReject(invitation)}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="invite-row__accept"
                      disabled={pendingId === invitation.id}
                      onClick={() => onAccept(invitation)}
                    >
                      Accept
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const PersonCard = ({ person, onOpen }: { person: AddedPerson; onOpen: (personId: string) => void }) => (
  <li>
    <button type="button" className="teams-person" onClick={() => onOpen(person.id)}>
      <span className="teams-person__avatar" aria-hidden="true">
        <FiUser size={28} />
      </span>
      <strong>{person.name}</strong>
      <span>{person.permission}</span>
      <span>{person.spaceNames.join(', ')}</span>
    </button>
  </li>
);
