import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { getApiErrorMessage } from '@/features/settings/planCatalog';
import { getPlanRestriction } from '@/features/settings/planRestriction';
import { usePlanGate } from '@/features/settings/PlanGateProvider';
import { subscribeToConversationStatusEvents } from '@/services/conversationStatusEvents';
import { DesktopVoiceRecorder } from '@/services/desktopVoiceRecorder';
import { homeApi } from '@/services/homeApi';
import { plansApi } from '@/services/plansApi';
import {
  endSpeechListeningSession,
  startSpeechListeningSession,
  uploadVoiceChunk,
  type VoiceChunk,
} from '@/services/speechListeningApi';

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'paused' | 'stopping';

export type ListeningSessionInfo = {
  spaceId: string;
  spaceName: string;
  conversationId?: string | null;
  conversationStatus?: string | null;
};

type StartListeningArgs = {
  spaceId: string;
  spaceName: string;
};

type RecordingContextValue = {
  status: RecordingStatus;
  elapsedSeconds: number;
  isVisible: boolean;
  isStarting: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isStopping: boolean;
  isUploading: boolean;
  pendingUploads: number;
  selectedMic: string;
  selectedLanguage: string;
  session: ListeningSessionInfo | null;
  lastError: string;
  startListening: (args: StartListeningArgs) => Promise<void>;
  /** @deprecated Use startListening with a space */
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  dismissBanner: () => void;
  setSelectedMic: (mic: string) => void;
  setSelectedLanguage: (language: string) => void;
  showBanner: boolean;
};

const RecordingContext = createContext<RecordingContextValue | null>(null);

const micOptions = ['Default microphone'];
const languageOptions = ['English'];

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatRecordingTime = formatElapsed;
export const recordingMicOptions = micOptions;
export const recordingLanguageOptions = languageOptions;

const TERMINAL_STATUSES = new Set([
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'PUBLISHED',
]);

export const RecordingProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { handleApiError, promptPlanUpgrade } = usePlanGate();
  const userId = useAppSelector((state) => state.auth.user?.userId || '');
  const authToken = useAppSelector((state) => state.auth.token);

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [selectedMic, setSelectedMic] = useState(micOptions[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);
  const [session, setSession] = useState<ListeningSessionInfo | null>(null);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [lastError, setLastError] = useState('');

  const recorderRef = useRef(new DesktopVoiceRecorder());
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef<ListeningSessionInfo | null>(null);
  const statusRef = useRef<RecordingStatus>('idle');
  const unsubscribeSseRef = useRef<(() => void) | null>(null);
  const forceStopRef = useRef(false);

  const updatePendingUploads = useCallback((delta: number) => {
    setPendingUploads((current) => Math.max(0, current + delta));
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (status !== 'recording') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  const invalidateListeningQueries = useCallback(() => {
    dispatch(homeApi.util.invalidateTags([{ type: 'Spaces', id: 'LIST' }]));
    dispatch(plansApi.util.invalidateTags(['Plans']));
  }, [dispatch]);

  const enqueueUpload = useCallback(
    (chunk: VoiceChunk) => {
      const active = sessionRef.current;
      if (!userId || !active?.spaceId) {
        return Promise.resolve();
      }

      updatePendingUploads(1);
      const task = uploadQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await uploadVoiceChunk({
              userId,
              spaceId: active.spaceId,
              chunk,
            });
          } catch (error) {
            const message = getApiErrorMessage(error, 'Voice upload failed. Try again.');
            setLastError(message);
            showToast({ message, type: 'error' });
          } finally {
            updatePendingUploads(-1);
          }
        });

      uploadQueueRef.current = task;
      return task;
    },
    [showToast, updatePendingUploads, userId],
  );

  const clearSse = useCallback(() => {
    unsubscribeSseRef.current?.();
    unsubscribeSseRef.current = null;
  }, []);

  const compensateFailedStart = useCallback(
    async (spaceId: string) => {
      try {
        await endSpeechListeningSession({ userId, spaceId });
      } catch {
        // best effort
      }

      try {
        await dispatch(
          homeApi.endpoints.startListening.initiate({ spaceId, isListning: false }),
        ).unwrap();
      } catch {
        // best effort
      }
    },
    [dispatch, userId],
  );

  const startListening = useCallback(
    async ({ spaceId, spaceName }: StartListeningArgs) => {
      if (!userId) {
        throw new Error('Please sign in again to start listening.');
      }

      if (statusRef.current !== 'idle') {
        throw new Error('A listening session is already running.');
      }

      forceStopRef.current = false;
      setLastError('');
      setStatus('starting');
      setElapsedSeconds(0);
      setSession({ spaceId, spaceName });

      try {
        await dispatch(
          homeApi.endpoints.startListening.initiate({ spaceId, isListning: true }),
        ).unwrap();

        const speechSession = await startSpeechListeningSession({ userId, spaceId });

        setSession({
          spaceId,
          spaceName,
          conversationId: speechSession.conversation_id ?? null,
          conversationStatus: speechSession.status ?? 'RECORDING',
        });

        await recorderRef.current.start({
          onSegmentReady: async (chunk) => {
            await enqueueUpload(chunk);
          },
          onError: (error) => {
            setLastError(error.message);
            showToast({ message: error.message, type: 'error' });
          },
        });

        clearSse();
        unsubscribeSseRef.current = subscribeToConversationStatusEvents({
          userId,
          spaceId,
          token: authToken,
          onStatusChange: (event) => {
            setSession((current) => {
              if (!current || current.spaceId !== event.spaceId) {
                return current;
              }
              return {
                ...current,
                conversationId: event.conversationId || current.conversationId,
                conversationStatus: event.status || event.extractionRunStatus || current.conversationStatus,
              };
            });

            if (event.status && TERMINAL_STATUSES.has(event.status)) {
              showToast({
                message:
                  event.status === 'FAILED'
                    ? 'Listening finished with errors'
                    : 'Listening processed',
                description: `Status: ${event.status}`,
                type: event.status === 'FAILED' ? 'error' : 'success',
              });
              invalidateListeningQueries();
            }
          },
          onError: () => {
            // Keep recording; SSE is informational.
          },
        });

        setStatus('recording');
        invalidateListeningQueries();
        showToast({
          message: 'Listening started',
          description: `Recording into ${spaceName}`,
          type: 'success',
        });
      } catch (error) {
        await recorderRef.current.stop().catch(() => null);
        clearSse();
        setStatus('idle');
        setSession(null);
        setElapsedSeconds(0);

        const restriction = getPlanRestriction(error);
        if (restriction) {
          promptPlanUpgrade(restriction);
          await compensateFailedStart(spaceId);
          throw error;
        }

        if (handleApiError(error)) {
          await compensateFailedStart(spaceId);
          throw error;
        }

        await compensateFailedStart(spaceId);
        const message = getApiErrorMessage(error, 'Unable to start listening');
        setLastError(message);
        throw new Error(message);
      }
    },
    [
      authToken,
      clearSse,
      compensateFailedStart,
      dispatch,
      enqueueUpload,
      handleApiError,
      invalidateListeningQueries,
      promptPlanUpgrade,
      showToast,
      userId,
    ],
  );

  const startRecording = useCallback(() => {
    showToast({
      message: 'Select a space first',
      description: 'Choose a space in the listening popup to start recording.',
      type: 'info',
    });
  }, [showToast]);

  const pauseRecording = useCallback(() => {
    if (statusRef.current !== 'recording') {
      return;
    }
    recorderRef.current.pause();
    setStatus('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    if (statusRef.current !== 'paused') {
      return;
    }
    recorderRef.current.resume();
    setStatus('recording');
  }, []);

  const stopRecording = useCallback(async () => {
    if (statusRef.current === 'idle' || statusRef.current === 'stopping') {
      return;
    }

    const active = sessionRef.current;
    setStatus('stopping');
    setLastError('');

    try {
      const finalChunk = await recorderRef.current.stop();
      if (finalChunk) {
        await enqueueUpload(finalChunk);
      }

      await uploadQueueRef.current.catch(() => undefined);

      if (userId && active?.spaceId) {
        try {
          await endSpeechListeningSession({ userId, spaceId: active.spaceId });
        } catch (error) {
          const message = getApiErrorMessage(error, 'Unable to end listening session');
          setLastError(message);
          showToast({ message, type: 'error' });
        }

        try {
          await dispatch(
            homeApi.endpoints.startListening.initiate({
              spaceId: active.spaceId,
              isListning: false,
            }),
          ).unwrap();
        } catch (error) {
          if (!handleApiError(error)) {
            const message = getApiErrorMessage(error, 'Unable to update listening state');
            setLastError(message);
            showToast({ message, type: 'error' });
          }
        }
      }

      showToast({
        message: 'Listening stopped',
        description: active?.spaceName
          ? `${active.spaceName} is processing your session.`
          : 'Your session is processing.',
        type: 'success',
      });
    } finally {
      clearSse();
      setStatus('idle');
      setElapsedSeconds(0);
      setSession(null);
      invalidateListeningQueries();
    }
  }, [
    clearSse,
    dispatch,
    enqueueUpload,
    handleApiError,
    invalidateListeningQueries,
    showToast,
    userId,
  ]);

  // Soft quota poll while recording — mirrors mobile force-stop behavior.
  useEffect(() => {
    if (status !== 'recording' && status !== 'paused') {
      return undefined;
    }

    if (!userId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const planStatus = await dispatch(
            plansApi.endpoints.getPlanStatus.initiate({ userId }, { forceRefetch: true }),
          ).unwrap();
          const limit = planStatus.plan?.limits?.recordingHours;
          const usedMs = planStatus.usage?.recordingMs;
          if (typeof limit === 'number' && limit >= 0 && typeof usedMs === 'number') {
            const remainingMs = limit * 3_600_000 - usedMs;
            if (remainingMs <= 0 && !forceStopRef.current) {
              forceStopRef.current = true;
              promptPlanUpgrade({
                message: 'Recording time limit reached for your plan. Upgrade to continue recording.',
                resource: 'recordingHours',
                planCode: planStatus.plan?.code,
              });
              await stopRecording();
            }
          }
        } catch {
          // ignore transient plan status failures
        }
      })();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [dispatch, promptPlanUpgrade, status, stopRecording, userId]);

  useEffect(
    () => () => {
      clearSse();
      void recorderRef.current.stop();
    },
    [clearSse],
  );

  const value = useMemo(
    () => ({
      status,
      elapsedSeconds,
      isVisible: status !== 'idle',
      isStarting: status === 'starting',
      isRecording: status === 'recording',
      isPaused: status === 'paused',
      isStopping: status === 'stopping',
      isUploading: pendingUploads > 0,
      pendingUploads,
      selectedMic,
      selectedLanguage,
      session,
      lastError,
      startListening,
      startRecording,
      pauseRecording,
      resumeRecording,
      stopRecording,
      dismissBanner: () => setShowBanner(false),
      setSelectedMic,
      setSelectedLanguage,
      showBanner,
    }),
    [
      elapsedSeconds,
      lastError,
      pauseRecording,
      pendingUploads,
      resumeRecording,
      selectedLanguage,
      selectedMic,
      session,
      showBanner,
      startListening,
      startRecording,
      status,
      stopRecording,
    ],
  );

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
};

export const useRecording = () => {
  const context = useContext(RecordingContext);

  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }

  return context;
};
