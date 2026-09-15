import { useEffect, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiClock,
  FiGlobe,
  FiImage,
  FiMessageSquare,
  FiMic,
  FiX,
} from 'react-icons/fi';
import { HiOutlinePencilAlt } from 'react-icons/hi';

import {
  formatRecordingTime,
  recordingLanguageOptions,
  recordingMicOptions,
  useRecording,
} from '@/app/RecordingProvider';

export const GlobalRecordingBar = () => {
  const {
    elapsedSeconds,
    isVisible,
    isStarting,
    isRecording,
    isPaused,
    isStopping,
    showBanner,
    selectedMic,
    selectedLanguage,
    pauseRecording,
    resumeRecording,
    stopRecording,
    dismissBanner,
    setSelectedMic,
    setSelectedLanguage,
  } = useRecording();

  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setIsMicOpen(false);
      setIsLanguageOpen(false);
    }
  }, [isVisible]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setIsMicOpen(false);
        setIsLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="global-recording-layer" aria-live="polite">
      {showBanner ? (
        <div className="global-recording-banner">
          <span className="global-recording-banner__content">
            <FiClock aria-hidden="true" size={14} />
            <span>
              You can view up to 30 minutes of transcription per conversation.{' '}
              <button type="button" className="global-recording-banner__link">
                View plans
              </button>
            </span>
          </span>
          <button type="button" className="global-recording-banner__close" onClick={dismissBanner} aria-label="Dismiss">
            <FiX aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}

      <div
        ref={barRef}
        className={`global-recording-bar${isStarting ? ' is-starting' : ''}${isRecording ? ' is-recording' : ''}${isPaused ? ' is-paused' : ''}${isStopping ? ' is-stopping' : ''}`}
        role="region"
        aria-label="Recording controls"
      >
        <div className="global-recording-bar__wave" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 45}ms` }} />
          ))}
        </div>

        <div className="global-recording-bar__controls">
          <div className="global-recording-bar__left">
            <div className={`global-recording-select${isMicOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="global-recording-select__trigger"
                aria-expanded={isMicOpen}
                onClick={() => {
                  setIsMicOpen((open) => !open);
                  setIsLanguageOpen(false);
                }}
              >
                <FiMic aria-hidden="true" size={13} />
                <span>{selectedMic}</span>
                <FiChevronDown aria-hidden="true" size={12} />
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

            <div className={`global-recording-select global-recording-select--language${isLanguageOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="global-recording-select__trigger"
                aria-expanded={isLanguageOpen}
                onClick={() => {
                  setIsLanguageOpen((open) => !open);
                  setIsMicOpen(false);
                }}
              >
                <FiGlobe aria-hidden="true" size={13} />
                <span>{selectedLanguage}</span>
                <FiChevronDown aria-hidden="true" size={12} />
              </button>
              {isLanguageOpen ? (
                <div className="global-recording-select__menu" role="listbox">
                  {recordingLanguageOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={option === selectedLanguage}
                      className={option === selectedLanguage ? 'is-selected' : undefined}
                      onClick={() => {
                        setSelectedLanguage(option);
                        setIsLanguageOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="global-recording-bar__center">
            {isStarting ? (
              <div className="global-recording-bar__starting">
                <span className="global-recording-bar__spinner" aria-hidden="true" />
                <span>Starting microphone...</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="global-recording-bar__pause"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <strong className="global-recording-bar__timer">{formatRecordingTime(elapsedSeconds)}</strong>
                <button type="button" className="global-recording-bar__stop" onClick={stopRecording}>
                  Stop
                </button>
              </>
            )}
          </div>

          <div className="global-recording-bar__tools">
            <button type="button" aria-label="Highlight transcript">
              <HiOutlinePencilAlt aria-hidden="true" size={17} />
            </button>
            <button type="button" aria-label="Add comment">
              <FiMessageSquare aria-hidden="true" size={17} />
            </button>
            <button type="button" aria-label="Attach image">
              <FiImage aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
