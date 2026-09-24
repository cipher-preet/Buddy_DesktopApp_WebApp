import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiMic } from 'react-icons/fi';

import {
  formatRecordingTime,
  recordingMicOptions,
  useRecording,
} from '@/app/RecordingProvider';

export const GlobalRecordingBar = ({ onOpenPlans: _onOpenPlans }: { onOpenPlans?: () => void }) => {
  const {
    elapsedSeconds,
    isVisible,
    isStarting,
    isRecording,
    isPaused,
    isStopping,
    isUploading,
    pendingUploads,
    selectedMic,
    session,
    lastError,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setSelectedMic,
  } = useRecording();

  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isStopPending, setIsStopPending] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setIsMicOpen(false);
      setIsStopPending(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setIsMicOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (!isVisible) {
    return null;
  }

  const stateLabel = isStarting
    ? 'Starting'
    : isStopping || isStopPending
      ? 'Stopping'
      : isUploading
        ? 'Uploading'
        : isPaused
          ? 'Paused'
          : 'Listening';

  const detailLabel = isUploading
    ? `${pendingUploads} chunk${pendingUploads === 1 ? '' : 's'}`
    : session?.spaceName || 'Buddy';

  return (
    <div className="global-recording-layer" aria-live="polite">
      <div
        ref={barRef}
        className={`global-recording-bar global-recording-bar--compact${isStarting ? ' is-starting' : ''}${isRecording ? ' is-recording' : ''}${isPaused ? ' is-paused' : ''}${isStopping || isStopPending ? ' is-stopping' : ''}${isUploading ? ' is-uploading' : ''}`}
        role="region"
        aria-label="Recording controls"
      >
        <div className="global-recording-bar__controls">
          <div className="global-recording-bar__left">
            <div className={`global-recording-select${isMicOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="global-recording-select__trigger global-recording-select__trigger--icon"
                aria-expanded={isMicOpen}
                aria-label={`Microphone: ${selectedMic}`}
                disabled={isStarting || isStopping || isStopPending}
                onClick={() => setIsMicOpen((open) => !open)}
              >
                <FiMic aria-hidden="true" size={14} />
                <FiChevronDown aria-hidden="true" size={11} />
              </button>
              {isMicOpen ? (
                <div className="global-recording-select__menu" role="listbox">
                  {recordingMicOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={option === selectedMic}
                      className={option === selectedMic ? 'is-selected' : undefined}
                      onClick={() => {
                        setSelectedMic(option);
                        setIsMicOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="global-recording-bar__status" title={`${stateLabel} · ${detailLabel}`}>
              <span
                className={`global-recording-bar__live${isPaused || isStarting ? ' is-idle' : ''}`}
                aria-hidden="true"
              />
              <span className="global-recording-bar__status-copy">
                <strong>{stateLabel}</strong>
                <em>{detailLabel}</em>
              </span>
            </div>
          </div>

          <div className="global-recording-bar__wave" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => (
              <span key={index} style={{ animationDelay: `${index * 45}ms` }} />
            ))}
          </div>

          <div className="global-recording-bar__center">
            {isStarting ? (
              <div className="global-recording-bar__starting">
                <span className="global-recording-bar__spinner" aria-hidden="true" />
                <span>Starting…</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="global-recording-bar__pause"
                  disabled={isStopping || isStopPending}
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <strong className="global-recording-bar__timer">{formatRecordingTime(elapsedSeconds)}</strong>
                <button
                  type="button"
                  className="global-recording-bar__stop"
                  disabled={isStopping || isStopPending}
                  onClick={() => {
                    setIsStopPending(true);
                    void stopRecording().finally(() => setIsStopPending(false));
                  }}
                >
                  {isStopping || isStopPending ? 'Stopping…' : 'Stop'}
                </button>
              </>
            )}
          </div>
        </div>
        {lastError ? <p className="global-recording-bar__error">{lastError}</p> : null}
      </div>
    </div>
  );
};
