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

export type RecordingStatus = 'idle' | 'starting' | 'recording' | 'paused' | 'stopping';

type RecordingContextValue = {
  status: RecordingStatus;
  elapsedSeconds: number;
  isVisible: boolean;
  isStarting: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isStopping: boolean;
  showBanner: boolean;
  selectedMic: string;
  selectedLanguage: string;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  dismissBanner: () => void;
  setSelectedMic: (mic: string) => void;
  setSelectedLanguage: (language: string) => void;
};

const RecordingContext = createContext<RecordingContextValue | null>(null);

const micOptions = ['Default microphone', 'System audio', 'External mic'];

const languageOptions = ['English', 'Hindi', 'Tamil', 'Telugu'];

const formatElapsed = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatRecordingTime = formatElapsed;

export const recordingMicOptions = micOptions;
export const recordingLanguageOptions = languageOptions;

export const RecordingProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [selectedMic, setSelectedMic] = useState(micOptions[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(languageOptions[0]);
  const startTimeoutRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (startTimeoutRef.current) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (status !== 'recording') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => clearTimers, [clearTimers]);

  const startRecording = useCallback(() => {
    if (status === 'starting' || status === 'recording' || status === 'paused') {
      return;
    }

    clearTimers();
    setElapsedSeconds(0);
    setShowBanner(true);
    setStatus('starting');

    startTimeoutRef.current = window.setTimeout(() => {
      setStatus('recording');
      startTimeoutRef.current = null;
    }, 900);
  }, [clearTimers, status]);

  const pauseRecording = useCallback(() => {
    if (status !== 'recording') {
      return;
    }

    setStatus('paused');
  }, [status]);

  const resumeRecording = useCallback(() => {
    if (status !== 'paused') {
      return;
    }

    setStatus('recording');
  }, [status]);

  const stopRecording = useCallback(() => {
    if (status === 'idle' || status === 'stopping') {
      return;
    }

    clearTimers();
    setStatus('stopping');

    stopTimeoutRef.current = window.setTimeout(() => {
      setStatus('idle');
      setElapsedSeconds(0);
      stopTimeoutRef.current = null;
    }, 420);
  }, [clearTimers, status]);

  const value = useMemo(
    () => ({
      status,
      elapsedSeconds,
      isVisible: status !== 'idle',
      isStarting: status === 'starting',
      isRecording: status === 'recording',
      isPaused: status === 'paused',
      isStopping: status === 'stopping',
      showBanner,
      selectedMic,
      selectedLanguage,
      startRecording,
      pauseRecording,
      resumeRecording,
      stopRecording,
      dismissBanner: () => setShowBanner(false),
      setSelectedMic,
      setSelectedLanguage,
    }),
    [
      elapsedSeconds,
      pauseRecording,
      resumeRecording,
      selectedLanguage,
      selectedMic,
      showBanner,
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
