import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiX } from 'react-icons/fi';

import { useToast } from '@/app/ToastProvider';
import { getApiErrorMessage } from '@/services/apiErrors';
import {
  useGetDocumentByIdQuery,
  type DocumentSectionContent,
  type SpaceDocument,
} from '@/services/documentsApi';

type DocumentPreviewModalProps = {
  documentId: string;
  fallback?: Pick<SpaceDocument, 'documentId' | 'fileName' | 'templateTitle' | 'preview'>;
  onClose: () => void;
  onDownload: (doc: SpaceDocument) => void | Promise<void>;
};

const formatMetaLine = (doc: SpaceDocument) => {
  const parts: string[] = [];
  const contentMeta = doc.content?.meta || {};
  const space = contentMeta.space || doc.preview?.spaceName;
  if (space) {
    parts.push(`Space: ${space}`);
  }
  if (doc.templateTitle) {
    parts.push(`Template: ${doc.templateTitle}`);
  }
  if (doc.version) {
    parts.push(`Version: v${doc.version}`);
  }
  if (doc.updatedAt || doc.createdAt) {
    const stamp = new Date(doc.updatedAt || doc.createdAt || '');
    if (!Number.isNaN(stamp.getTime())) {
      parts.push(
        stamp.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      );
    }
  }
  for (const [key, value] of Object.entries(contentMeta)) {
    if (!value || key.toLowerCase() === 'space' || key.toLowerCase() === 'template') {
      continue;
    }
    parts.push(`${key}: ${value}`);
  }
  return parts.join(' · ');
};

const SectionBlock = ({ section }: { section: DocumentSectionContent }) => {
  const headers = section.table?.headers ?? [];
  const rows = section.table?.rows ?? [];

  return (
    <section className="document-preview-section">
      <h2>{section.heading}</h2>
      {section.body ? <p>{section.body}</p> : null}
      {section.bullets?.length ? (
        <ul>
          {section.bullets.map((item, index) => (
            <li key={`${section.heading}-${index}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {headers.length > 0 ? (
        <div className="document-preview-table-wrap">
          <table className="document-preview-table">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length}>No rows</td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {headers.map((_, colIndex) => (
                      <td key={`cell-${rowIndex}-${colIndex}`}>{row[colIndex] || '—'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};

const stopHeaderBubble = (event: MouseEvent) => {
  event.stopPropagation();
};

export const DocumentPreviewModal = ({
  documentId,
  fallback,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) => {
  const { showToast } = useToast();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const {
    data: spaceDoc,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetDocumentByIdQuery(documentId);

  const fileName =
    spaceDoc?.fileName ||
    fallback?.fileName ||
    `${(spaceDoc?.preview?.title || fallback?.preview?.title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.docx`;

  const showLoader = isLoading || (isFetching && !spaceDoc);
  const errorMessage = getApiErrorMessage(error, 'Unable to open this document');
  const canDownload = Boolean(documentId) && !isDownloading;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const previouslyFocused = window.document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';

    return () => {
      window.document.removeEventListener('keydown', handleKeyDown, true);
      window.document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const handleDownloadClick = async (event: MouseEvent<HTMLButtonElement>) => {
    stopHeaderBubble(event);
    if (!canDownload) {
      return;
    }

    const payload: SpaceDocument = spaceDoc || {
      documentId,
      userId: '',
      spaceId: '',
      status: 'READY',
      fileName,
      templateTitle: fallback?.templateTitle,
      preview: fallback?.preview,
    };

    setIsDownloading(true);
    try {
      await onDownload(payload);
    } catch (downloadError) {
      showToast({
        message:
          downloadError instanceof Error ? downloadError.message : 'Unable to download document',
        type: 'error',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCloseClick = (event: MouseEvent<HTMLButtonElement>) => {
    stopHeaderBubble(event);
    onClose();
  };

  if (typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  return createPortal(
    <div
      className={`document-preview-backdrop${isVisible ? ' is-visible' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`document-preview-modal${isVisible ? ' is-visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="document-preview-modal__header">
          <div className="document-preview-modal__file">
            <span className="document-preview-modal__file-icon" aria-hidden="true">
              W
            </span>
            <strong id={titleId}>{fileName}</strong>
          </div>
          <div className="document-preview-modal__actions" role="toolbar" aria-label="Document actions">
            <button
              type="button"
              className="document-preview-modal__icon-btn"
              aria-label={isDownloading ? 'Downloading' : 'Download document'}
              title="Download"
              onMouseDown={stopHeaderBubble}
              onClick={(event) => void handleDownloadClick(event)}
              disabled={!canDownload}
            >
              <FiDownload size={16} aria-hidden="true" />
            </button>
            <button
              ref={closeRef}
              type="button"
              className="document-preview-modal__icon-btn"
              aria-label="Close"
              title="Close"
              onMouseDown={stopHeaderBubble}
              onClick={handleCloseClick}
            >
              <FiX size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="document-preview-modal__body">
          {showLoader ? (
            <div className="document-preview-modal__loader" aria-busy="true">
              <span className="document-preview-modal__spinner" />
              <p>Opening document…</p>
              <span>Preparing a readable preview</span>
            </div>
          ) : null}

          {isError && !showLoader ? (
            <div className="document-preview-modal__loader" role="alert">
              <p>{errorMessage}</p>
              <button type="button" className="home-retry-button" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {!showLoader && !isError && spaceDoc ? (
            <article className="document-preview-paper">
              <h1>
                {spaceDoc.content?.title ||
                  spaceDoc.preview?.title ||
                  spaceDoc.templateTitle ||
                  'Document'}
              </h1>
              {spaceDoc.content?.subtitle ? (
                <p className="document-preview-paper__subtitle">{spaceDoc.content.subtitle}</p>
              ) : null}
              {formatMetaLine(spaceDoc) ? (
                <p className="document-preview-paper__meta">{formatMetaLine(spaceDoc)}</p>
              ) : null}

              {(spaceDoc.content?.sections || []).map((section, index) => (
                <SectionBlock key={`${section.heading}-${index}`} section={section} />
              ))}

              {!spaceDoc.content?.sections?.length ? (
                <p className="document-preview-paper__empty">
                  Preview content is not available for this document yet. You can still download the
                  DOCX.
                </p>
              ) : null}
            </article>
          ) : null}
        </div>
      </div>
    </div>,
    window.document.body,
  );
};
