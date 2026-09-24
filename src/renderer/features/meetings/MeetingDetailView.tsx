import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMoreHorizontal,
  FiRefreshCw,
  FiShare2,
  FiVideo,
} from 'react-icons/fi';

import { AiChatView } from '@/features/ai-chat/AiChatView';
import { getStoredAuthToken } from '@/features/auth/authStorage';
import {
  useGetMeetingNotesQuery,
  useGetMeetingPlaybackQuery,
  useGetMeetingQuery,
  useGetMeetingSummaryQuery,
  useGetMeetingTasksQuery,
  useGetMeetingTranscriptQuery,
} from '@/services/meetingsApi';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

import type { MeetingListItem } from './meetingsApiTypes';
import type { MeetingTask } from './meetingsTypes';

/** Prefer same-origin stream; fall back to signed S3 URL if token missing. */
const buildPlaybackMediaUrl = (sessionId: string) => {
  const token = getStoredAuthToken();
  if (!token || !sessionId) {
    return '';
  }
  const base = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
  return `${base}/meeting-recordings/${encodeURIComponent(sessionId)}/playback/media?access_token=${encodeURIComponent(token)}`;
};

const mediaErrorMessage = (code: number) => {
  switch (code) {
    case 2:
      return 'Network error while loading the recording. Make sure the API server is running, then Retry.';
    case 3:
      return 'This recording looks incomplete or corrupted — often caused by missing upload chunks during save.';
    case 4:
      return 'This recording format could not be played in the app.';
    default:
      return 'This recording could not be played. Try Retry, or reopen the meeting.';
  }
};

type DetailTab = 'summary' | 'transcript' | 'tasks' | 'notes';

type MeetingDetailViewProps = {
  meetingId: string;
  preview?: MeetingListItem | null;
  onBack: () => void;
};

const TAB_OPTIONS: Array<{ id: DetailTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
];

const TASK_STATUS_LABEL: Record<MeetingTask['status'], string> = {
  open: 'Open',
  done: 'Done',
  blocked: 'Blocked',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback;
  }

  if (typeof error !== 'object') {
    return fallback;
  }

  if ('status' in error && (error as { status?: unknown }).status === 409) {
    return 'Recording is not ready yet.';
  }

  if ('data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (typeof data === 'object' && data && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
    const message = (error as { message: string }).message.trim();
    if (message) {
      return message;
    }
  }

  return fallback;
};

const isNotReadyError = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return false;
  }
  return (error as { status?: unknown }).status === 409;
};

const SectionState = ({
  title,
  message,
  onRetry,
  tone = 'muted',
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  tone?: 'muted' | 'error';
}) => (
  <div className={`meeting-doc-empty${tone === 'error' ? ' is-error' : ''}`}>
    <h3>{title}</h3>
    <p>{message}</p>
    {onRetry ? (
      <button type="button" className="home-retry-button" onClick={onRetry}>
        <FiRefreshCw aria-hidden="true" size={14} />
        Retry
      </button>
    ) : null}
  </div>
);

const SectionLoading = ({ label }: { label: string }) => (
  <div className="meeting-doc-loading" aria-busy="true">
    <span className="home-spinner" />
    <p>{label}</p>
  </div>
);

export const MeetingDetailView = ({ meetingId, preview, onBack }: MeetingDetailViewProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [shouldPoll, setShouldPoll] = useState(() => preview?.ready === false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const [isSeekBuffering, setIsSeekBuffering] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loadedUrlRef = useRef<string>('');
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const seekWatchdogRef = useRef<number | null>(null);
  const errorRetryRef = useRef(0);
  /** Prefer signed S3 (native Range seeking); switch to same-origin stream after one soft failure. */
  const sourceModeRef = useRef<'signed' | 'stream'>('signed');
  const lockedSrcRef = useRef('');
  const [mediaSrc, setMediaSrc] = useState('');

  useEffect(() => {
    setActiveTab('summary');
    setShouldPoll(preview?.ready === false);
    setMediaError(null);
    setActiveTranscriptId(null);
    setIsSeekBuffering(false);
    setLoadAttempt(0);
    loadedUrlRef.current = '';
    lockedSrcRef.current = '';
    sourceModeRef.current = 'signed';
    setMediaSrc('');
    pendingSeekSecondsRef.current = null;
    errorRetryRef.current = 0;
    if (seekWatchdogRef.current) {
      window.clearTimeout(seekWatchdogRef.current);
      seekWatchdogRef.current = null;
    }
  }, [meetingId, preview?.ready]);

  const {
    data: meeting,
    isLoading: isMeetingLoading,
    isFetching: isMeetingFetching,
    isError: isMeetingError,
    error: meetingError,
    refetch: refetchMeeting,
  } = useGetMeetingQuery(meetingId, {
    skip: !meetingId,
    refetchOnMountOrArgChange: true,
    pollingInterval: shouldPoll ? 12_000 : 0,
  });

  const shell = meeting ?? preview ?? null;

  useEffect(() => {
    if (!meeting) {
      return;
    }
    // Keep polling until both intelligence and recording are available.
    setShouldPoll(!(meeting.ready && meeting.recordingAvailable));
  }, [meeting]);

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetMeetingSummaryQuery(meetingId, {
    skip: !meetingId,
    pollingInterval: shouldPoll ? 12_000 : 0,
  });

  const {
    data: transcript,
    isLoading: isTranscriptLoading,
    isError: isTranscriptError,
    error: transcriptError,
    refetch: refetchTranscript,
  } = useGetMeetingTranscriptQuery(meetingId, {
    skip: !meetingId,
    pollingInterval: shouldPoll ? 12_000 : 0,
  });

  const {
    data: tasksData,
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
  } = useGetMeetingTasksQuery(meetingId, {
    skip: !meetingId,
    pollingInterval: shouldPoll ? 12_000 : 0,
  });

  const {
    data: notesData,
    isLoading: isNotesLoading,
    isError: isNotesError,
    error: notesError,
    refetch: refetchNotes,
  } = useGetMeetingNotesQuery(meetingId, {
    skip: !meetingId,
    pollingInterval: shouldPoll ? 12_000 : 0,
  });

  const [playbackUrlReady, setPlaybackUrlReady] = useState(false);

  const {
    data: playback,
    isLoading: isPlaybackLoading,
    isError: isPlaybackError,
    error: playbackError,
    refetch: refetchPlayback,
  } = useGetMeetingPlaybackQuery(meetingId, {
    skip: !meetingId,
    refetchOnMountOrArgChange: true,
    // Poll only while waiting for a playable URL — never once we have media (avoids remount/seek reset).
    pollingInterval:
      !playbackUrlReady && (shouldPoll || shell?.recordingAvailable === false) ? 12_000 : 0,
  });

  useEffect(() => {
    setPlaybackUrlReady(Boolean(playback?.url));
  }, [playback?.url]);

  useEffect(() => {
    setPlaybackUrlReady(false);
  }, [meetingId]);

  // When merge finishes, force a playback fetch even if an earlier 409 was cached.
  useEffect(() => {
    if (!shell?.recordingAvailable) {
      return;
    }
    void refetchPlayback();
  }, [shell?.recordingAvailable, meetingId, refetchPlayback]);

  const pickPlaybackSrc = (signedUrl: string, sessionId: string) => {
    const streamUrl = buildPlaybackMediaUrl(sessionId);
    if (sourceModeRef.current === 'stream') {
      return streamUrl || signedUrl;
    }
    // Signed S3 supports byte-range seeking natively (timeline scrub).
    return signedUrl || streamUrl;
  };

  // Lock one playable URL — do not churn on every /playback JSON refetch (that aborts the video).
  useEffect(() => {
    if (!playback?.url || !meetingId) {
      return;
    }
    const signed = playback.url.trim();
    if (!lockedSrcRef.current) {
      const next = pickPlaybackSrc(signed, meetingId);
      if (!next) {
        return;
      }
      lockedSrcRef.current = next;
      setMediaSrc(next);
      setMediaError(null);
      return;
    }

    // Near-expiry signed URL refresh only (keep position).
    if (sourceModeRef.current !== 'signed' || !playback.expiresAt) {
      return;
    }
    const expiresMs = Date.parse(playback.expiresAt);
    if (!Number.isFinite(expiresMs) || expiresMs - Date.now() > 120_000) {
      return;
    }
    if (signed && lockedSrcRef.current !== signed) {
      const video = videoRef.current;
      if (video && video.currentTime > 0.25) {
        pendingSeekSecondsRef.current = video.currentTime;
      }
      lockedSrcRef.current = signed;
      loadedUrlRef.current = '';
      setMediaSrc(signed);
    }
  }, [playback?.url, playback?.expiresAt, meetingId]);

  // Explicit Retry / soft remount: alternate signed ↔ stream and remount once.
  useEffect(() => {
    if (loadAttempt <= 0 || !playback?.url || !meetingId) {
      return;
    }
    sourceModeRef.current = sourceModeRef.current === 'signed' ? 'stream' : 'signed';
    const next = pickPlaybackSrc(playback.url.trim(), meetingId);
    if (!next) {
      return;
    }
    lockedSrcRef.current = next;
    loadedUrlRef.current = '';
    setMediaSrc(next);
  }, [loadAttempt, playback?.url, meetingId]);

  // Refresh signed URL before expiry without remounting until near expiry (effect above).
  useEffect(() => {
    if (!playback?.expiresAt || sourceModeRef.current !== 'signed') {
      return undefined;
    }
    const expiresMs = Date.parse(playback.expiresAt);
    if (!Number.isFinite(expiresMs)) {
      return undefined;
    }
    const refreshIn = Math.max(15_000, expiresMs - Date.now() - 120_000);
    const timer = window.setTimeout(() => {
      void refetchPlayback();
    }, refreshIn);
    return () => window.clearTimeout(timer);
  }, [playback?.expiresAt, refetchPlayback]);

  // Preserve scrub position when the locked src actually changes.
  useEffect(() => {
    const video = videoRef.current;
    const nextUrl = mediaSrc.trim();
    if (!video || !nextUrl) {
      return;
    }
    if (loadedUrlRef.current === nextUrl) {
      return;
    }

    const previousTime = video.currentTime;
    const wasPlaying = !video.paused && !video.ended && video.readyState > 0;
    loadedUrlRef.current = nextUrl;
    setMediaError(null);

    const restore = () => {
      const seekTo = pendingSeekSecondsRef.current ?? previousTime;
      pendingSeekSecondsRef.current = null;
      if (Number.isFinite(seekTo) && seekTo > 0.25) {
        try {
          video.currentTime = seekTo;
        } catch {
          // Some containers reject seek until more data buffers.
        }
      }
      if (wasPlaying) {
        void video.play().catch(() => undefined);
      }
    };

    video.addEventListener('loadedmetadata', restore, { once: true });
  }, [mediaSrc]);

  const clearSeekWatchdog = () => {
    if (seekWatchdogRef.current) {
      window.clearTimeout(seekWatchdogRef.current);
      seekWatchdogRef.current = null;
    }
  };

  const finishSeekBuffering = () => {
    clearSeekWatchdog();
    setIsSeekBuffering(false);
  };

  const beginSeekBuffering = () => {
    setIsSeekBuffering(true);
    clearSeekWatchdog();
    // Safety: never leave the spinner stuck if the media never fires seeked/canplay.
    seekWatchdogRef.current = window.setTimeout(() => {
      setIsSeekBuffering(false);
      seekWatchdogRef.current = null;
    }, 12_000);
  };

  const handlePlaybackMediaError = () => {
    const video = videoRef.current;
    const mediaCode = video?.error?.code ?? 0;
    // MEDIA_ERR_ABORTED (1) — remount / Range cancel. Never treat as a hard failure.
    if (mediaCode === 1) {
      return;
    }

    finishSeekBuffering();
    errorRetryRef.current += 1;

    // One automatic remount with the alternate source (signed ↔ stream). No retry-counter reset on canplay.
    if (errorRetryRef.current === 1) {
      beginSeekBuffering();
      window.setTimeout(() => {
        setLoadAttempt((value) => value + 1);
      }, 400);
      return;
    }

    setMediaError(mediaErrorMessage(mediaCode));
  };

  const retryPlayback = () => {
    errorRetryRef.current = 0;
    setMediaError(null);
    lockedSrcRef.current = '';
    loadedUrlRef.current = '';
    beginSeekBuffering();
    void refetchPlayback().finally(() => {
      setLoadAttempt((value) => value + 1);
    });
  };

  const seekToOffsetMs = (offsetMs: number | null | undefined, lineId?: string) => {
    if (offsetMs == null || !Number.isFinite(offsetMs) || offsetMs < 0) {
      return;
    }
    const seconds = offsetMs / 1000;
    if (lineId) {
      setActiveTranscriptId(lineId);
    }
    const video = videoRef.current;
    if (!video || !mediaSrc) {
      pendingSeekSecondsRef.current = seconds;
      beginSeekBuffering();
      return;
    }

    beginSeekBuffering();
    pendingSeekSecondsRef.current = seconds;

    const settle = () => {
      pendingSeekSecondsRef.current = null;
      // Wait until the player has buffered around the new position.
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        finishSeekBuffering();
        void video.play().catch(() => undefined);
        return;
      }

      const onReady = () => {
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('playing', onReady);
        finishSeekBuffering();
      };
      video.addEventListener('canplay', onReady, { once: true });
      video.addEventListener('playing', onReady, { once: true });
      void video.play().catch(() => undefined);
    };

    const applySeek = () => {
      try {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          settle();
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = seconds;
        // If the engine does not seek (cue-less media), clear buffering after a beat.
        window.setTimeout(() => {
          if (pendingSeekSecondsRef.current === seconds) {
            settle();
          }
        }, 1500);
      } catch {
        pendingSeekSecondsRef.current = seconds;
        finishSeekBuffering();
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      applySeek();
    } else {
      video.addEventListener('loadedmetadata', applySeek, { once: true });
    }
  };

  const tasks = tasksData?.items ?? [];
  const notes = notesData?.items ?? [];
  const transcriptLines = transcript?.segments ?? [];

  const openTaskCount = useMemo(
    () => tasks.filter((task) => task.status !== 'done').length,
    [tasks],
  );

  const meetingErrorMessage = getErrorMessage(meetingError, 'Unable to load this meeting');
  const summaryErrorMessage = getErrorMessage(summaryError, 'Unable to load summary');
  const transcriptErrorMessage = getErrorMessage(transcriptError, 'Unable to load transcript');
  const tasksErrorMessage = getErrorMessage(tasksError, 'Unable to load tasks');
  const notesErrorMessage = getErrorMessage(notesError, 'Unable to load notes');
  const playbackNotReady = isNotReadyError(playbackError) || (isPlaybackError && !shell?.recordingAvailable);
  const playbackErrorMessage = getErrorMessage(playbackError, 'Unable to load recording');
  const showPlaybackRetry = Boolean(isPlaybackError || mediaError || (playbackNotReady && shell?.recordingAvailable));

  if (isMeetingLoading && !shell) {
    return (
      <section className="meeting-detail" aria-label="Loading meeting" aria-busy="true">
        <div className="meeting-detail__main">
          <button type="button" className="meeting-detail__back" onClick={onBack}>
            <FiArrowLeft aria-hidden="true" size={16} />
            Back to meetings
          </button>
          <div className="meeting-player-wrap meeting-player-wrap--skeleton">
            <div className="meeting-player meeting-player--skeleton" />
          </div>
          <div className="meeting-detail__header-skeleton">
            <span className="meeting-card__skeleton-line is-title" />
            <span className="meeting-card__skeleton-line" />
          </div>
          <SectionLoading label="Loading meeting…" />
        </div>
        <aside className="meeting-ask" aria-label="AI Chat">
          <AiChatView compact />
        </aside>
      </section>
    );
  }

  if (isMeetingError && !shell) {
    return (
      <section className="meeting-detail" aria-label="Meeting unavailable">
        <div className="meeting-detail__main">
          <button type="button" className="meeting-detail__back" onClick={onBack}>
            <FiArrowLeft aria-hidden="true" size={16} />
            Back to meetings
          </button>
          <SectionState
            tone="error"
            title="Unable to open meeting"
            message={meetingErrorMessage}
            onRetry={() => void refetchMeeting()}
          />
        </div>
        <aside className="meeting-ask" aria-label="AI Chat">
          <AiChatView compact />
        </aside>
      </section>
    );
  }

  if (!shell) {
    return null;
  }

  return (
    <section className="meeting-detail" aria-label={shell.title}>
      <div className="meeting-detail__main">
        <button type="button" className="meeting-detail__back" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" size={16} />
          Back to meetings
        </button>

        <div className="meeting-player-wrap">
          {isPlaybackLoading && !mediaSrc ? (
            <div className={`meeting-player meeting-player--${shell.thumbnailTone} is-loading`} aria-busy="true">
              <span className="home-spinner" />
              <p>Loading recording…</p>
            </div>
          ) : mediaSrc ? (
            <div className={`meeting-player meeting-player--${shell.thumbnailTone} has-video`}>
              <video
                key={`${meetingId}:${loadAttempt}`}
                ref={videoRef}
                className="meeting-player__video"
                src={mediaSrc}
                controls
                playsInline
                preload="auto"
                controlsList="nodownload"
                onWaiting={() => setIsSeekBuffering(true)}
                onSeeking={(event) => {
                  const next = event.currentTarget.currentTime;
                  if (Number.isFinite(next) && next > 0.2) {
                    pendingSeekSecondsRef.current = next;
                  }
                  beginSeekBuffering();
                }}
                onSeeked={(event) => {
                  const video = event.currentTarget;
                  const intended = pendingSeekSecondsRef.current;
                  // If the engine snapped back to 0 (non-ranged stream), re-apply once.
                  if (
                    intended != null &&
                    intended > 1 &&
                    video.currentTime < 0.4 &&
                    Math.abs(intended - video.currentTime) > 0.75
                  ) {
                    try {
                      video.currentTime = intended;
                    } catch {
                      pendingSeekSecondsRef.current = null;
                      finishSeekBuffering();
                    }
                    return;
                  }
                  pendingSeekSecondsRef.current = null;
                  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    finishSeekBuffering();
                  }
                }}
                onLoadedData={() => {
                  finishSeekBuffering();
                }}
                onCanPlay={() => {
                  finishSeekBuffering();
                }}
                onPlaying={() => {
                  setMediaError(null);
                  finishSeekBuffering();
                }}
                onError={handlePlaybackMediaError}
              >
                Sorry, your browser cannot play this recording.
              </video>
              {isSeekBuffering && !mediaError ? (
                <div className="meeting-player__buffering" role="status" aria-live="polite">
                  <span className="home-spinner" />
                  <span>Buffering…</span>
                </div>
              ) : null}
              {mediaError ? (
                <div className="meeting-player__overlay meeting-player__overlay--soft">
                  <FiVideo aria-hidden="true" size={22} />
                  <strong>Unable to play</strong>
                  <p>{mediaError}</p>
                  <button type="button" className="home-retry-button" onClick={retryPlayback}>
                    <FiRefreshCw aria-hidden="true" size={14} />
                    Retry
                  </button>
                </div>
              ) : shell.recordingPartial ? (
                <div className="meeting-player__partial" role="status">
                  Some segments were missing during upload — playing the available recording.
                </div>
              ) : null}
            </div>
          ) : (
            <div className={`meeting-player meeting-player--${shell.thumbnailTone} is-empty`}>
              {shell.coverImage ? <img src={shell.coverImage} alt="" className="meeting-player__image" /> : null}
              <div className="meeting-player__overlay">
                <FiVideo aria-hidden="true" size={22} />
                <strong>{playbackNotReady ? 'Recording not ready' : 'Recording unavailable'}</strong>
                <p>
                  {playbackNotReady
                    ? `Status: ${shell.statusLabel}. The video will appear here when processing finishes.`
                    : playbackErrorMessage}
                </p>
                {showPlaybackRetry ? (
                  <button type="button" className="home-retry-button" onClick={retryPlayback}>
                    <FiRefreshCw aria-hidden="true" size={14} />
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <header className="meeting-detail__header">
          <div className="meeting-detail__heading">
            <h1>{shell.title}</h1>
            <div className="meeting-detail__meta">
              <span>
                <FiCalendar aria-hidden="true" size={14} />
                {shell.dateLabel}
              </span>
              <span>
                <FiClock aria-hidden="true" size={14} />
                {shell.startLabel}
                {shell.endLabel !== '—' ? ` – ${shell.endLabel}` : ''}
                {shell.durationLabel !== '—' ? ` · ${shell.durationLabel}` : ''}
              </span>
              <span>
                <FiVideo aria-hidden="true" size={14} />
                {shell.providerLabel}
              </span>
              {!shell.ready || !shell.recordingAvailable || shell.recordingPartial ? (
                <span className="meeting-detail__status">
                  {isMeetingFetching
                    ? 'Updating…'
                    : !shell.recordingAvailable
                      ? 'Processing video…'
                      : shell.recordingPartial
                        ? 'Partial recording (some chunks were skipped)'
                        : shell.statusLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="meeting-detail__actions">
            <button type="button" className="meeting-detail__share">
              <FiShare2 aria-hidden="true" size={15} />
              Share
            </button>
            <button type="button" className="meeting-detail__more" aria-label="More actions">
              <FiMoreHorizontal size={18} />
            </button>
          </div>
        </header>

        <div className="meeting-detail__content">
          <div className="meeting-detail__tabs" role="tablist" aria-label="Meeting content">
            {TAB_OPTIONS.map((tab) => {
              const count =
                tab.id === 'tasks' ? openTaskCount : tab.id === 'notes' ? notes.length : 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`meeting-detail__tab${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {count > 0 ? <em>{count}</em> : null}
                </button>
              );
            })}
          </div>

          <div className="meeting-detail__panel" role="tabpanel">
            <div key={activeTab} className="meeting-doc">
              {activeTab === 'summary' ? (
                <div className="meeting-doc__body">
                  {isSummaryLoading && !summary ? <SectionLoading label="Loading summary…" /> : null}

                  {isSummaryError ? (
                    <SectionState
                      tone="error"
                      title="Unable to load summary"
                      message={summaryErrorMessage}
                      onRetry={() => void refetchSummary()}
                    />
                  ) : null}

                  {!isSummaryLoading && !isSummaryError && summary && !summary.available ? (
                    <SectionState
                      title="Summary not ready"
                      message={
                        shell.ready
                          ? 'No summary was generated for this meeting yet.'
                          : `This meeting is still ${shell.statusLabel.toLowerCase()}. Summary will appear when processing finishes.`
                      }
                    />
                  ) : null}

                  {!isSummaryError && summary?.available ? (
                    <>
                      {summary.summaryIntro ? (
                        <section className="meeting-doc__block">
                          <p className="meeting-doc__prose">{summary.summaryIntro}</p>
                        </section>
                      ) : null}

                      {summary.takeaways.length > 0 ? (
                        <section className="meeting-doc__block">
                          <h3>Key takeaways</h3>
                          <ul className="meeting-doc__list">
                            {summary.takeaways.map((item) => (
                              <li key={`${item.title}-${item.detail}`}>
                                <strong>{item.title}</strong>
                                {item.detail ? ` ${item.detail}` : null}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {!summary.summaryIntro && summary.takeaways.length === 0 ? (
                        <SectionState
                          title="Summary is empty"
                          message="This meeting has a summary record, but no overview or takeaways were captured."
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'transcript' ? (
                <div className="meeting-doc__body">
                  {isTranscriptLoading && transcriptLines.length === 0 ? (
                    <SectionLoading label="Loading transcript…" />
                  ) : null}

                  {isTranscriptError ? (
                    <SectionState
                      tone="error"
                      title="Unable to load transcript"
                      message={transcriptErrorMessage}
                      onRetry={() => void refetchTranscript()}
                    />
                  ) : null}

                  {!isTranscriptLoading && !isTranscriptError && transcriptLines.length === 0 ? (
                    <SectionState
                      title="Transcript not ready"
                      message={
                        shell.ready
                          ? 'No transcript segments are available for this meeting.'
                          : `Transcription is still in progress (${shell.statusLabel}).`
                      }
                    />
                  ) : null}

                  {!isTranscriptError && transcriptLines.length > 0 ? (
                    <section className="meeting-doc__block">
                      <h3>Transcript</h3>
                      <p className="meeting-doc__hint">Click a line to jump to that moment in the recording.</p>
                      <div className="meeting-doc__transcript">
                        {transcriptLines.map((line) => (
                          <button
                            key={line.id}
                            type="button"
                            className={`meeting-doc__turn${activeTranscriptId === line.id ? ' is-active' : ''}${
                              line.startOffsetMs != null ? ' is-seekable' : ''
                            }`}
                            onClick={() => seekToOffsetMs(line.startOffsetMs, line.id)}
                            disabled={line.startOffsetMs == null || !mediaSrc}
                          >
                            <header>
                              <strong>{line.speaker}</strong>
                              <time>{line.timeLabel}</time>
                            </header>
                            <p>{line.text}</p>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'tasks' ? (
                <div className="meeting-doc__body">
                  {isTasksLoading && tasks.length === 0 ? <SectionLoading label="Loading tasks…" /> : null}

                  {isTasksError ? (
                    <SectionState
                      tone="error"
                      title="Unable to load tasks"
                      message={tasksErrorMessage}
                      onRetry={() => void refetchTasks()}
                    />
                  ) : null}

                  {!isTasksLoading && !isTasksError && tasks.length === 0 ? (
                    <SectionState
                      title="No action items"
                      message={
                        shell.ready
                          ? 'No tasks were extracted from this meeting.'
                          : 'Tasks will show up here after the meeting is processed.'
                      }
                    />
                  ) : null}

                  {!isTasksError && tasks.length > 0 ? (
                    <section className="meeting-doc__block">
                      <h3>Action items</h3>
                      <ul className="meeting-doc__list meeting-doc__list--tasks">
                        {tasks.map((task) => (
                          <li key={task.id} className={`is-${task.status}`}>
                            <div className="meeting-doc__task-main">
                              <strong>{task.title}</strong>
                              {task.body ? <p>{task.body}</p> : null}
                              <span>
                                {task.owner} · {task.dueLabel} · {TASK_STATUS_LABEL[task.status]}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'notes' ? (
                <div className="meeting-doc__body">
                  {isNotesLoading && notes.length === 0 ? <SectionLoading label="Loading notes…" /> : null}

                  {isNotesError ? (
                    <SectionState
                      tone="error"
                      title="Unable to load notes"
                      message={notesErrorMessage}
                      onRetry={() => void refetchNotes()}
                    />
                  ) : null}

                  {!isNotesLoading && !isNotesError && notes.length === 0 ? (
                    <SectionState
                      title="No notes"
                      message={
                        shell.ready
                          ? 'No notes were extracted from this meeting.'
                          : 'Notes will show up here after the meeting is processed.'
                      }
                    />
                  ) : null}

                  {!isNotesError && notes.length > 0 ? (
                    <section className="meeting-doc__block">
                      <h3>Notes</h3>
                      <ul className="meeting-doc__list meeting-doc__list--notes">
                        {notes.map((note) => (
                          <li key={note.id}>
                            <strong>{note.title}</strong>
                            {note.body ? <p>{note.body}</p> : null}
                            <span>{note.timeLabel}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <aside className="meeting-ask" aria-label="AI Chat">
        <AiChatView compact />
      </aside>
    </section>
  );
};
