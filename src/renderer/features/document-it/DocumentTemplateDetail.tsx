import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiDownload,
  FiFolder,
  FiSearch,
  FiShare2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { getStoredAuthToken } from '@/features/auth/authStorage';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  subscribeToDocumentStatusEvents,
  type DocumentStatusEvent,
} from '@/services/documentStatusEvents';
import { documentsApi, useGenerateDocumentMutation } from '@/services/documentsApi';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

import type { DocumentTemplate } from './documentTemplates';

type DocumentTemplateDetailProps = {
  template: DocumentTemplate;
  Icon: IconType;
  onBack: () => void;
  /** When opened from a space Document tab, pre-select that space. */
  initialSpaceId?: string;
  initialSpaceName?: string;
};

type GenerationStatus = {
  jobId: string;
  documentId: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  fileName?: string | null;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

const downloadGeneratedDocx = async (documentId: string, fileName?: string | null) => {
  const token = getStoredAuthToken();
  const response = await fetch(`${apiBase}/documents/${encodeURIComponent(documentId)}/download`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    let detail = `Download failed (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string; message?: string };
      detail = payload.detail || payload.message || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName || 'document.docx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const DocumentTemplateDetail = ({
  template,
  Icon,
  onBack,
  initialSpaceId,
  initialSpaceName,
}: DocumentTemplateDetailProps) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.userId || '';
  const displayName = user?.name || user?.email || 'KukuNotes';
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [spaceQuery, setSpaceQuery] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(initialSpaceId || null);
  const [confirmedSpace, setConfirmedSpace] = useState<{ id: string; name: string } | null>(
    initialSpaceId && initialSpaceName ? { id: initialSpaceId, name: initialSpaceName } : null,
  );
  const [pickerStyle, setPickerStyle] = useState<CSSProperties>({});
  const [generation, setGeneration] = useState<GenerationStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [generateDocument, { isLoading: isStartingGenerate }] = useGenerateDocumentMutation();

  const {
    data: spacesData,
    isLoading: isSpacesLoading,
    isError: isSpacesError,
    refetch: refetchSpaces,
  } = useGetUserSpacesInfiniteQuery({ userId, limit: 40 }, { skip: !userId || !isPickerOpen });

  const spaces = useMemo(
    () => spacesData?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesData],
  );

  const filteredSpaces = useMemo(() => {
    const query = spaceQuery.trim().toLowerCase();
    if (!query) {
      return spaces;
    }
    return spaces.filter(
      (space) =>
        space.name.toLowerCase().includes(query) ||
        space.description.toLowerCase().includes(query),
    );
  }, [spaceQuery, spaces]);

  const hasConfirmedSpace = Boolean(confirmedSpace);
  const isGenerating =
    Boolean(generation) && generation?.status !== 'READY' && generation?.status !== 'FAILED';
  const generationFailed = generation?.status === 'FAILED';
  const generationReady = generation?.status === 'READY';
  const progress = Math.max(0, Math.min(100, generation?.progress ?? 0));

  const stopGenerationStream = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => () => stopGenerationStream(), [stopGenerationStream]);

  const updatePickerPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.min(280, window.innerWidth - 24);
    const gap = 8;
    const maxMenuHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(160, openUpward ? spaceAbove : spaceBelow);
    const menuHeight = Math.min(maxMenuHeight, availableHeight);

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - menuWidth - 12);
    }

    setPickerStyle({
      position: 'fixed',
      left,
      width: menuWidth,
      maxHeight: menuHeight,
      top: openUpward ? undefined : rect.bottom + gap,
      bottom: openUpward ? window.innerHeight - rect.top + gap : undefined,
      zIndex: 1200,
    });
  };

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    updatePickerPosition();

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsPickerOpen(false);
        setSpaceQuery('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
        setSpaceQuery('');
      }
    };

    const handleReposition = () => updatePickerPosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isPickerOpen, confirmedSpace?.id]);

  const togglePicker = () => {
    if (isGenerating) {
      return;
    }
    if (isPickerOpen) {
      setIsPickerOpen(false);
      setSpaceQuery('');
      return;
    }
    setSelectedSpaceId(confirmedSpace?.id ?? null);
    setSpaceQuery('');
    requestAnimationFrame(() => {
      updatePickerPosition();
      setIsPickerOpen(true);
    });
  };

  const handleConfirmSpace = () => {
    if (!selectedSpaceId) {
      showToast({ message: 'Select one space.', type: 'error' });
      return;
    }
    const match = spaces.find((space) => space.id === selectedSpaceId);
    const name = match?.name ?? confirmedSpace?.name ?? 'Selected space';
    setConfirmedSpace({ id: selectedSpaceId, name });
    setIsPickerOpen(false);
    setSpaceQuery('');
  };

  const clearConfirmedSpace = () => {
    if (isGenerating) {
      return;
    }
    setConfirmedSpace(null);
    setSelectedSpaceId(null);
  };

  const handleStatusEvent = useCallback(
    (event: DocumentStatusEvent) => {
      setGeneration((current) => {
        if (!current) {
          return current;
        }
        if (event.documentId && current.documentId && event.documentId !== current.documentId) {
          return current;
        }
        return {
          ...current,
          jobId: event.jobId || current.jobId,
          documentId: event.documentId || current.documentId,
          status: event.status || current.status,
          stage: event.stage || current.stage,
          progress: event.progress ?? current.progress,
          message: event.message || current.message,
          error: event.error ?? current.error,
        };
      });

      if (event.status === 'READY' && event.documentId && userId && confirmedSpace?.id) {
        dispatch(
          documentsApi.util.invalidateTags([
            { type: 'SpaceDocuments', id: `${userId}:${confirmedSpace.id}` },
          ]),
        );
        showToast({
          message: `${template.title} is ready. You can download the Word document.`,
          type: 'success',
        });
      }
    },
    [confirmedSpace?.id, dispatch, showToast, template.title, userId],
  );

  const handleDocumentIt = async () => {
    if (!userId) {
      showToast({ message: 'Sign in to generate a document.', type: 'error' });
      return;
    }
    if (!confirmedSpace) {
      showToast({ message: 'Select one space first.', type: 'error' });
      return;
    }
    if (isGenerating || isStartingGenerate) {
      return;
    }

    stopGenerationStream();
    setGeneration({
      jobId: '',
      documentId: '',
      status: 'QUEUED',
      stage: 'queued',
      progress: 5,
      message: 'Starting generation…',
    });

    try {
      const result = await generateDocument({
        userId,
        spaceId: confirmedSpace.id,
        templateCode: template.id,
      }).unwrap();

      setGeneration({
        jobId: result.jobId,
        documentId: result.documentId,
        status: result.status,
        stage: result.stage,
        progress: result.progress,
        message: result.message,
      });

      unsubscribeRef.current = subscribeToDocumentStatusEvents({
        userId,
        spaceId: confirmedSpace.id,
        jobId: result.jobId,
        documentId: result.documentId,
        token: getStoredAuthToken(),
        onStatusChange: handleStatusEvent,
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Status stream interrupted';
          setGeneration((current) =>
            current
              ? {
                  ...current,
                  status: current.status === 'READY' ? current.status : 'FAILED',
                  error: message,
                  message: current.status === 'READY' ? current.message : 'Generation failed',
                }
              : current,
          );
        },
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to start document generation');
      setGeneration({
        jobId: '',
        documentId: '',
        status: 'FAILED',
        message: 'Generation failed',
        error: message,
      });
      showToast({ message, type: 'error' });
    }
  };

  const handleDownload = async () => {
    if (!generation?.documentId) {
      return;
    }
    setIsDownloading(true);
    try {
      await downloadGeneratedDocx(generation.documentId, generation.fileName);
      showToast({ message: 'Download started.', type: 'success' });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to download document',
        type: 'error',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="document-detail">
      <button type="button" className="document-detail__back" onClick={onBack} disabled={isGenerating}>
        <FiArrowLeft aria-hidden="true" size={16} />
        Back to templates
      </button>

      <div className="document-detail__layout">
        <aside className="document-detail__aside">
          <div className="document-detail__author">
            <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
            <strong>{displayName}</strong>
          </div>

          <h1>{template.title}</h1>
          <p>{template.tagline}</p>

          <div className="document-detail__actions">
            {confirmedSpace ? (
              <div className="document-detail__selected-list">
                <span className="document-detail__tag">
                  {confirmedSpace.name}
                  {!isGenerating ? (
                    <button
                      type="button"
                      className="document-detail__tag-remove"
                      aria-label={`Remove ${confirmedSpace.name}`}
                      onClick={clearConfirmedSpace}
                    >
                      <FiX aria-hidden="true" size={12} />
                    </button>
                  ) : null}
                </span>
              </div>
            ) : null}

            {generation ? (
              <div className="document-generate-status" role="status" aria-live="polite">
                <p className="document-generate-status__label">
                  {generationFailed
                    ? 'Generation failed'
                    : generationReady
                      ? 'Document ready'
                      : generation.message || 'Generating document…'}
                </p>
                {!generationFailed && !generationReady ? (
                  <div className="document-generate-status__bar" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
                {generation.stage && !generationFailed && !generationReady ? (
                  <p className="document-generate-status__meta">
                    {generation.stage.replaceAll('_', ' ')} · {progress}%
                  </p>
                ) : null}
                {generationFailed && generation.error ? (
                  <p className="document-generate-status__error">{generation.error}</p>
                ) : null}
                {generationReady ? (
                  <button
                    type="button"
                    className="document-detail__primary document-detail__primary--brand"
                    onClick={() => void handleDownload()}
                    disabled={isDownloading}
                  >
                    <FiDownload aria-hidden="true" size={16} />
                    {isDownloading ? 'Downloading…' : 'Download DOCX'}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="document-detail__action-row">
              {hasConfirmedSpace && !isGenerating && !generationReady ? (
                <button
                  type="button"
                  className="document-detail__primary document-detail__primary--brand"
                  onClick={() => void handleDocumentIt()}
                  disabled={isStartingGenerate}
                >
                  <FiZap aria-hidden="true" size={16} />
                  {generationFailed ? 'Try again' : isStartingGenerate ? 'Starting…' : 'Document it'}
                </button>
              ) : null}

              <div className="document-space-picker-anchor" ref={pickerRef}>
                <button
                  ref={triggerRef}
                  type="button"
                  className={`document-detail__primary${hasConfirmedSpace ? ' document-detail__primary--ghost' : ''}${isPickerOpen ? ' is-open' : ''}`}
                  aria-expanded={isPickerOpen}
                  aria-haspopup="dialog"
                  onClick={togglePicker}
                  disabled={isGenerating}
                >
                  <FiFolder aria-hidden="true" size={16} />
                  {hasConfirmedSpace ? 'Change space' : 'Select Space'}
                  <FiChevronDown
                    aria-hidden="true"
                    size={14}
                    className={`document-space-picker-chevron${isPickerOpen ? ' is-open' : ''}`}
                  />
                </button>

                {isPickerOpen ? (
                  <div
                    className="document-space-picker"
                    role="dialog"
                    aria-label="Select one space"
                    style={pickerStyle}
                  >
                    <label className="document-space-picker__search">
                      <FiSearch aria-hidden="true" size={14} />
                      <input
                        type="search"
                        value={spaceQuery}
                        onChange={(event) => setSpaceQuery(event.target.value)}
                        placeholder="Search spaces"
                        autoFocus
                      />
                    </label>

                    <div className="document-space-picker__body">
                      {!userId ? (
                        <div className="document-space-picker__empty">
                          <p>Sign in to load spaces</p>
                        </div>
                      ) : null}

                      {userId && isSpacesLoading ? (
                        <div className="document-space-picker__empty" aria-busy="true">
                          <span className="home-spinner" />
                          <p>Loading spaces…</p>
                        </div>
                      ) : null}

                      {userId && isSpacesError && !isSpacesLoading ? (
                        <div className="document-space-picker__empty" role="alert">
                          <p>Unable to load spaces</p>
                          <button
                            type="button"
                            className="home-retry-button"
                            onClick={() => void refetchSpaces()}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}

                      {userId && !isSpacesLoading && !isSpacesError && filteredSpaces.length === 0 ? (
                        <div className="document-space-picker__empty">
                          <p>No spaces found</p>
                          <span>
                            {spaces.length === 0
                              ? 'Create a space on Home first.'
                              : 'Try another search term.'}
                          </span>
                        </div>
                      ) : null}

                      {userId && !isSpacesLoading && !isSpacesError && filteredSpaces.length > 0 ? (
                        <ul className="document-space-picker__list">
                          {filteredSpaces.map((space) => {
                            const selected = selectedSpaceId === space.id;
                            return (
                              <li key={space.id}>
                                <button
                                  type="button"
                                  className={`document-space-picker__item${selected ? ' is-selected' : ''}`}
                                  onClick={() => setSelectedSpaceId(space.id)}
                                  aria-pressed={selected}
                                >
                                  <span className="document-space-picker__check" aria-hidden="true">
                                    {selected ? <FiCheck size={12} /> : null}
                                  </span>
                                  <span className="document-space-picker__item-copy">
                                    <strong>{space.name}</strong>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>

                    <div className="document-space-picker__footer">
                      <span>{selectedSpaceId ? '1 selected' : 'Select one'}</span>
                      <button
                        type="button"
                        className="document-space-picker__confirm"
                        disabled={!selectedSpaceId}
                        onClick={handleConfirmSpace}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button type="button" className="document-detail__secondary" disabled={isGenerating}>
                Preview
              </button>
              <button
                type="button"
                className="document-detail__icon-btn"
                aria-label="Share template"
                disabled={isGenerating}
              >
                <FiShare2 aria-hidden="true" size={16} />
              </button>
            </div>
          </div>
        </aside>

        <div className="document-detail__stage">
          <article className="document-detail__card">
            <span className="document-detail__card-icon" aria-hidden="true">
              <Icon size={28} strokeWidth={1.5} />
            </span>
            <h2>{template.title}</h2>
            <p className="document-detail__card-copy">{template.description}</p>

            <ul className="document-detail__features">
              {template.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <section className="document-detail__block">
              <h3>What to Act On</h3>
              <p className="document-detail__hint">Define the exact scope:</p>
              <ul className="document-detail__scopes">
                {template.scopes.map((scope) => (
                  <li key={scope.label}>
                    <strong>{scope.label}</strong>
                    <span> — {scope.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="document-detail__footnote">Do not mix scopes. One space at a time.</p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};
