import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiCloud,
  FiExternalLink,
  FiLink2,
  FiMessageSquare,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import { SiDropbox, SiGooglecalendar, SiHubspot, SiZoom } from 'react-icons/si';
import { TbBrandOffice } from 'react-icons/tb';
import { useAppDispatch } from '@/app/hooks';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/app/ToastProvider';
import { getCalendarErrorMessage } from '@/features/calendar/calendarMappers';
import { api } from '@/services/api';
import {
  useDisconnectGoogleCalendarMutation,
  useGetGoogleCalendarStatusQuery,
  useStartGoogleCalendarConnectMutation,
  useSyncGoogleCalendarMutation,
} from '@/services/integrationsApi';

const CONNECT_TIMEOUT_MS = 5 * 60_000;
const POLL_MS = 2500;

const integrations = [
  {
    name: 'Microsoft Outlook Calendar',
    description: 'Connect Microsoft Outlook Calendar so KukuNotes can join and record your meetings.',
    icon: TbBrandOffice,
    tone: 'outlook',
  },
  {
    name: 'Zoom',
    description: 'Automatically capture and summarize your Zoom meetings with live transcripts and notes.',
    icon: SiZoom,
    tone: 'zoom',
  },
  {
    name: 'Slack',
    description: 'Automatically share meeting summaries and live notes directly into Slack.',
    icon: FiMessageSquare,
    tone: 'slack',
  },
  {
    name: 'Dropbox',
    description: 'Automatically transcribe Dropbox audio and video and save back to Dropbox.',
    icon: SiDropbox,
    tone: 'dropbox',
  },
  {
    name: 'Salesforce',
    description: 'Enrich Salesforce with your meeting notes automatically.',
    icon: FiCloud,
    tone: 'salesforce',
    badge: 'Pro',
  },
  {
    name: 'HubSpot',
    description: 'Sync meeting notes to HubSpot to improve follow-ups and pipeline visibility.',
    icon: SiHubspot,
    tone: 'hubspot',
    badge: 'Pro',
  },
];

const formatRelative = (iso: string | null) => {
  if (!iso) {
    return 'never';
  }
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) {
    return 'never';
  }
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const openInBrowser = async (url: string) => {
  if (window.electronApi?.openExternal) {
    await window.electronApi.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
};

const GoogleCalendarCard = () => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [waitStartedAt, setWaitStartedAt] = useState<number | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const wasSyncingRef = useRef(false);
  const connectSnapshotRef = useRef<{ connected: boolean; status: string | null }>({
    connected: false,
    status: null,
  });

  const isAwaiting = waitStartedAt !== null;

  const { data: current, isLoading, isError, error, refetch } = useGetGoogleCalendarStatusQuery();

  // A second subscription only exists to poll while waiting on Google or a running sync.
  const shouldPoll = isAwaiting || Boolean(current?.syncing);
  useGetGoogleCalendarStatusQuery(undefined, {
    pollingInterval: shouldPoll ? POLL_MS : 0,
    skip: !shouldPoll,
  });

  const [startConnect, { isLoading: isStarting }] = useStartGoogleCalendarConnectMutation();
  const [syncNow, { isLoading: isSyncing }] = useSyncGoogleCalendarMutation();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectGoogleCalendarMutation();

  useEffect(() => {
    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  useEffect(() => {
    if (!isAwaiting || !current) {
      return;
    }

    const before = connectSnapshotRef.current;
    const linked = before.connected
      ? before.status !== 'active' && current.connected && current.status === 'active'
      : current.connected;

    if (linked) {
      setWaitStartedAt(null);
      setConnectError(null);
      showToast({
        message: 'Google Calendar connected',
        description: current.accountEmail ? `Syncing events from ${current.accountEmail}` : 'Syncing your events…',
        type: 'success',
      });
      return;
    }

    if (
      current.connectError &&
      current.connectErrorAt &&
      waitStartedAt !== null &&
      new Date(current.connectErrorAt).getTime() >= waitStartedAt - 5_000
    ) {
      setWaitStartedAt(null);
      setConnectError(current.connectError);
    }
  }, [current, isAwaiting, showToast, waitStartedAt]);

  useEffect(() => {
    if (!isAwaiting) {
      return;
    }
    const timer = window.setTimeout(() => {
      setWaitStartedAt(null);
      setConnectError('Timed out waiting for Google. Try connecting again.');
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isAwaiting]);

  // Pull fresh calendar data once a background sync finishes.
  useEffect(() => {
    const syncing = Boolean(current?.syncing);
    if (wasSyncingRef.current && !syncing) {
      dispatch(api.util.invalidateTags([{ type: 'CalendarFeed', id: 'LIST' }]));
    }
    wasSyncingRef.current = syncing;
  }, [current?.syncing, dispatch]);

  const handleConnect = useCallback(async () => {
    setConnectError(null);
    try {
      const { url } = await startConnect().unwrap();
      connectSnapshotRef.current = {
        connected: Boolean(current?.connected),
        status: current?.status ?? null,
      };
      setWaitStartedAt(Date.now());
      await openInBrowser(url);
    } catch (connectFailure) {
      setWaitStartedAt(null);
      setConnectError(getCalendarErrorMessage(connectFailure, 'Unable to start Google Calendar connection.'));
    }
  }, [current?.connected, current?.status, startConnect]);

  const handleSync = async () => {
    try {
      const result = await syncNow().unwrap();
      showToast({
        message: 'Google Calendar synced',
        description: `${result.lastSyncEventCount} events from ${result.calendarCount} calendar${result.calendarCount === 1 ? '' : 's'}`,
        type: 'success',
      });
    } catch (syncFailure) {
      showToast({
        message: 'Sync failed',
        description: getCalendarErrorMessage(syncFailure, 'Google Calendar sync failed.'),
        type: 'error',
      });
      void refetch();
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect().unwrap();
      setIsConfirmOpen(false);
      showToast({ message: 'Google Calendar disconnected', type: 'success' });
    } catch (disconnectFailure) {
      showToast({
        message: 'Could not disconnect',
        description: getCalendarErrorMessage(disconnectFailure, 'Unable to disconnect Google Calendar.'),
        type: 'error',
      });
    }
  };

  const connected = Boolean(current?.connected);
  const hasSyncError = connected && current?.status === 'error';
  const syncingNow = isSyncing || Boolean(current?.syncing);

  let statusPill: { label: string; tone: 'ok' | 'warn' | 'muted' | 'busy' } = { label: 'Not connected', tone: 'muted' };
  if (isAwaiting) statusPill = { label: 'Waiting for Google', tone: 'busy' };
  else if (hasSyncError) statusPill = { label: 'Needs attention', tone: 'warn' };
  else if (syncingNow) statusPill = { label: 'Syncing', tone: 'busy' };
  else if (connected) statusPill = { label: 'Connected', tone: 'ok' };

  return (
    <section className="gcal-card" aria-label="Google Calendar integration">
      <header className="gcal-card__head">
        <span className="integration-icon integration-icon--google gcal-card__icon">
          <SiGooglecalendar aria-hidden="true" size={20} />
        </span>
        <div className="gcal-card__title">
          <strong>Google Calendar</strong>
          <small>
            {connected && current?.accountEmail
              ? current.accountEmail
              : 'Bring your Google events into the KukuNotes calendar.'}
          </small>
        </div>
        {!isLoading && !isError ? (
          <span className={`gcal-pill gcal-pill--${statusPill.tone}`}>
            {statusPill.tone === 'busy' ? <span className="gcal-pill__spinner" aria-hidden="true" /> : null}
            {statusPill.label}
          </span>
        ) : null}
      </header>

      {isLoading ? (
        <div className="gcal-card__state" aria-busy="true">
          <span className="home-spinner" />
          <p>Checking connection…</p>
        </div>
      ) : isError ? (
        <div className="gcal-card__notice gcal-card__notice--error" role="alert">
          <FiAlertCircle aria-hidden="true" size={16} />
          <p>{getCalendarErrorMessage(error, 'Unable to load Google Calendar status.')}</p>
          <button type="button" className="gcal-link-button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : current && !current.configured ? (
        <div className="gcal-card__notice" role="status">
          <FiAlertCircle aria-hidden="true" size={16} />
          <p>Google Calendar isn't set up on the server yet. Ask your admin to add the Google OAuth credentials.</p>
        </div>
      ) : (
        <>
          {connected ? (
            <dl className="gcal-stats">
              <div>
                <dt>Last synced</dt>
                <dd>{syncingNow && !current?.lastSyncedAt ? 'Syncing…' : formatRelative(current?.lastSyncedAt ?? null)}</dd>
              </div>
              <div>
                <dt>Events</dt>
                <dd>{current?.lastSyncEventCount ?? 0}</dd>
              </div>
              <div>
                <dt>Calendars</dt>
                <dd>{current?.calendarCount ?? 0}</dd>
              </div>
            </dl>
          ) : (
            <ul className="gcal-benefits">
              <li>
                <FiCalendar aria-hidden="true" size={14} />
                Meetings and events show up in your KukuNotes calendar
              </li>
              <li>
                <FiRefreshCw aria-hidden="true" size={14} />
                Stays up to date automatically every 15 minutes
              </li>
              <li>
                <FiCheckCircle aria-hidden="true" size={14} />
                Read-only — KukuNotes never changes your Google Calendar
              </li>
            </ul>
          )}

          {hasSyncError && current?.lastError ? (
            <div className="gcal-card__notice gcal-card__notice--warn" role="alert">
              <FiAlertCircle aria-hidden="true" size={16} />
              <p>{current.lastError}</p>
            </div>
          ) : null}

          {connectError ? (
            <div className="gcal-card__notice gcal-card__notice--error" role="alert">
              <FiAlertCircle aria-hidden="true" size={16} />
              <p>{connectError}</p>
              <button
                type="button"
                className="gcal-icon-button"
                aria-label="Dismiss"
                onClick={() => setConnectError(null)}
              >
                <FiX aria-hidden="true" size={14} />
              </button>
            </div>
          ) : null}

          {isAwaiting ? (
            <div className="gcal-card__notice gcal-card__notice--info" role="status">
              <span className="home-spinner" />
              <p>Finish signing in with Google in your browser. This page updates automatically.</p>
              <button type="button" className="gcal-link-button" onClick={() => setWaitStartedAt(null)}>
                Cancel
              </button>
            </div>
          ) : null}

          <div className="gcal-card__actions">
            {connected ? (
              <>
                <button
                  type="button"
                  className="gcal-button gcal-button--primary"
                  onClick={() => void handleSync()}
                  disabled={syncingNow || isDisconnecting}
                >
                  <FiRefreshCw aria-hidden="true" size={14} className={syncingNow ? 'is-spinning' : undefined} />
                  {syncingNow ? 'Syncing…' : 'Sync now'}
                </button>
                {hasSyncError ? (
                  <button
                    type="button"
                    className="gcal-button"
                    onClick={() => void handleConnect()}
                    disabled={isStarting || isAwaiting}
                  >
                    <FiLink2 aria-hidden="true" size={14} />
                    Reconnect
                  </button>
                ) : null}
                <button
                  type="button"
                  className="gcal-button gcal-button--ghost"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isDisconnecting}
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                className="gcal-button gcal-button--primary"
                onClick={() => void handleConnect()}
                disabled={isStarting || isAwaiting}
              >
                <FiExternalLink aria-hidden="true" size={14} />
                {isStarting ? 'Opening Google…' : isAwaiting ? 'Waiting…' : 'Connect Google Calendar'}
              </button>
            )}
          </div>
        </>
      )}

      {isConfirmOpen ? (
        <ConfirmDialog
          tone="danger"
          icon={<SiGooglecalendar />}
          title="Disconnect Google Calendar?"
          description="Synced Google events will be removed from your KukuNotes calendar and access will be revoked. Events you created in KukuNotes stay."
          confirmLabel="Disconnect"
          pendingLabel="Disconnecting…"
          isPending={isDisconnecting}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={handleDisconnect}
        />
      ) : null}
    </section>
  );
};

export const IntegrationsPage = () => {
  return (
    <section className="integrations-page" aria-label="Integrations">
      <div className="integrations-inner">
        <h1>My Integrations</h1>

        <GoogleCalendarCard />

        <h2>Discover</h2>

        <div className="integration-grid">
          {integrations.map((integration) => {
            const Icon = integration.icon;

            return (
              <article className="integration-card" key={integration.name}>
                <div className="integration-card__top">
                  <span className={`integration-icon integration-icon--${integration.tone}`}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span className="integration-card__soon">Coming soon</span>
                </div>
                <h3>
                  {integration.name}
                  {integration.badge ? <span>{integration.badge}</span> : null}
                </h3>
                <p>{integration.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
