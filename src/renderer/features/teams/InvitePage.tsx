import { useState } from 'react';
import { FiFolder } from 'react-icons/fi';

import { BrandLogo } from '@/components/common/BrandLogo';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useAcceptInvitationMutation,
  usePreviewInvitationQuery,
  useRejectInvitationMutation,
} from '@/services/teamsApi';

import './teams.css';

type InvitePageProps = {
  token: string;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  onOpenDashboard: () => void;
};

const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || 'K';
};

export const InvitePage = ({
  token,
  isAuthenticated,
  onRequireAuth,
  onOpenDashboard,
}: InvitePageProps) => {
  const { data, isLoading, isError, error, refetch } = usePreviewInvitationQuery(token);
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptInvitationMutation();
  const [rejectInvitation, { isLoading: isRejecting }] = useRejectInvitationMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'accepted' | 'declined' | null>(null);
  const busy = isAccepting || isRejecting;

  const respond = async (action: 'accept' | 'reject') => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    setActionError(null);
    try {
      if (action === 'accept') {
        const result = await acceptInvitation(token).unwrap();
        if (result.alreadyAccepted) {
          setOutcome('accepted');
          return;
        }
        onOpenDashboard();
        return;
      }
      await rejectInvitation(token).unwrap();
      setOutcome('declined');
    } catch (actionFailure) {
      setActionError(getApiErrorMessage(actionFailure, 'Unable to respond to this invitation.'));
    }
  };

  const status = outcome ?? data?.status;
  const senderName = data?.inviter.name || 'Someone';
  const spaceNames = data?.spaces.map((space) => space.name) ?? [];

  return (
    <main className="invite-page">
      <header className="auth-topbar">
        <BrandLogo size="md" className="auth-brand" />
      </header>

      <div className="invite-stage">
        <section className="invite-card" aria-label="Space invitation">
          {isLoading ? <p className="invite-card__status">Loading invitation…</p> : null}

          {isError ? (
            <div className="invite-card__status">
              <p className="invite-card__kicker">Invitation</p>
              <h1>This link is not valid</h1>
              <p>{getApiErrorMessage(error, 'This invitation link is not valid.')}</p>
              <button type="button" className="invite-card__accept" onClick={() => void refetch()}>
                Try again
              </button>
            </div>
          ) : null}

          {data ? (
            <>
              <p className="invite-card__kicker">Space invitation</p>
              <div className="invite-card__person">
                <span className="invite-card__avatar" aria-hidden="true">
                  {initialsFor(senderName)}
                </span>
                <div>
                  <h1>{senderName}</h1>
                  {data.inviter.email ? <p className="invite-card__email">{data.inviter.email}</p> : null}
                </div>
              </div>

              {status === 'revoked' ? (
                <p className="invite-card__note">
                  This invitation was revoked. Those spaces are no longer shared with you.
                </p>
              ) : (
                <>
              <p className="invite-card__lead">
                {spaceNames.length > 0
                  ? `${senderName} invited you to view ${spaceNames.length === 1 ? 'a space' : 'spaces'} on KukuNotes. You can look through the work. You cannot edit or delete it.`
                  : 'The spaces in this invitation are no longer available.'}
              </p>

              {spaceNames.length > 0 ? (
                <ul className="invite-card__spaces">
                  {spaceNames.map((name, index) => (
                    <li key={`${name}-${index}`}>
                      <FiFolder aria-hidden="true" size={15} />
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
                </>
              )}
              {status === 'expired' ? (
                <p className="invite-card__note">This invitation expired. Ask {senderName} to send a new one.</p>
              ) : null}
              {status === 'rejected' || outcome === 'declined' ? (
                <p className="invite-card__note">You declined this invitation. A new invitation is required to join.</p>
              ) : null}
              {status === 'accepted' || outcome === 'accepted' ? (
                <div className="invite-card__note">
                  <p>You already accepted this invitation.</p>
                  <button type="button" className="invite-card__accept" onClick={onOpenDashboard}>
                    Open dashboard
                  </button>
                </div>
              ) : null}
              {status === 'pending' && outcome === null ? (
                <>
                  <p className="invite-card__fine">This invitation expires in 7 days. Sign in with the invited email before you accept.</p>
                  <div className="invite-card__actions">
                    <button
                      type="button"
                      className="invite-card__decline"
                      disabled={busy}
                      onClick={() => void respond('reject')}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className="invite-card__accept"
                      disabled={busy || spaceNames.length === 0}
                      onClick={() => void respond('accept')}
                    >
                      {isAccepting ? 'Accepting…' : 'Accept'}
                    </button>
                  </div>
                </>
              ) : null}
              {actionError ? (
                <p className="invite-card__error" role="alert">
                  {actionError}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
};
