import { useMemo, useState } from 'react';
import {
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiFileText,
  FiFlag,
  FiList,
  FiTarget,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { formatRelativeDate } from '@/features/dashboard/homeMappers';
import { getStoredAuthToken } from '@/features/auth/authStorage';
import { getApiErrorMessage } from '@/services/apiErrors';
import { useGetDocumentTemplatesQuery } from '@/services/documentTemplatesApi';
import { useListDocumentsQuery, type SpaceDocument } from '@/services/documentsApi';
import { DEFAULT_API_BASE_URL } from '@shared/constants/app';

import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentTemplateDetail } from './DocumentTemplateDetail';
import type { DocumentTemplate } from './documentTemplates';

import './document-it.css';

type DocumentItPageProps = {
  embedded?: boolean;
  spaceId?: string;
  spaceName?: string;
};

export const templateIcons: Record<string, IconType> = {
  'meeting-recap': FiClipboard,
  'meeting-prep': FiList,
  'weekly-task-planner': FiCheckSquare,
  'weekly-review': FiCalendar,
  'one-on-one-prep': FiUsers,
  'project-status': FiFlag,
  'client-meeting-recap': FiFileText,
  'daily-work-plan': FiTarget,
  'decision-log': FiClipboard,
  'action-item-tracker': FiCheckSquare,
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

const TemplateCard = ({
  template,
  onSelect,
}: {
  template: DocumentTemplate;
  onSelect: (template: DocumentTemplate) => void;
}) => {
  const Icon = templateIcons[template.id] ?? FiFileText;

  return (
    <button
      type="button"
      className="document-template-card"
      aria-label={`${template.title} template`}
      onClick={() => onSelect(template)}
    >
      <div className="document-template-card__preview">
        {template.isNew ? <span className="document-template-card__badge">New</span> : null}

        <span className="document-template-card__lead-icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.6} />
        </span>
        <h3>{template.title}</h3>

        <div className="document-template-card__sample">
          {template.exampleSections.map((section, index) => (
            <div key={`${template.id}-${section.heading ?? index}`} className="document-template-card__section">
              {section.heading ? <h4>{section.heading}</h4> : null}
              {section.body ? <p>{section.body}</p> : null}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="document-template-card__meta">
        <span className="document-template-card__meta-icon" aria-hidden="true">
          <Icon size={13} strokeWidth={1.7} />
        </span>
        <strong>{template.title}</strong>
        <span className="document-template-card__price">Free</span>
      </div>
    </button>
  );
};

const GeneratedDocumentCard = ({
  document,
  onOpen,
}: {
  document: SpaceDocument;
  onOpen: (document: SpaceDocument) => void;
}) => {
  const Icon = templateIcons[document.templateCode || ''] ?? FiFileText;
  const title = document.preview?.title || document.templateTitle || 'Document';
  const excerpt = document.preview?.excerpt;
  const updatedLabel = formatRelativeDate(document.updatedAt || document.createdAt);

  return (
    <article className="document-generated-card">
      <button
        type="button"
        className="document-generated-card__preview"
        aria-label={`Open ${title}`}
        onClick={() => onOpen(document)}
      >
        <span className="document-generated-card__lead-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={1.6} />
        </span>
        <h3>{title}</h3>
        {excerpt ? <p>{excerpt}</p> : null}
        <span className="document-generated-card__badge">DOCX</span>
      </button>
      <div className="document-generated-card__meta">
        <strong className="document-generated-card__meta-title">
          {document.templateTitle || 'Document'}
        </strong>
        <span className="document-generated-card__meta-date">
          {updatedLabel || 'Just now'}
        </span>
      </div>
    </article>
  );
};

export const DocumentItPage = ({ embedded = false, spaceId, spaceName }: DocumentItPageProps) => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId || '');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [previewDocument, setPreviewDocument] = useState<SpaceDocument | null>(null);
  const showTemplates = !embedded;
  const {
    data: templates = [],
    isLoading,
    isError,
    isFetching,
    refetch,
    error,
  } = useGetDocumentTemplatesQuery(undefined, { skip: !showTemplates });

  const {
    data: generatedDocuments = [],
    isLoading: isDocsLoading,
    isError: isDocsError,
    refetch: refetchDocs,
  } = useListDocumentsQuery(
    { userId, spaceId: spaceId || '', limit: 24 },
    { skip: !userId || !spaceId },
  );

  const readyDocuments = useMemo(
    () => generatedDocuments.filter((doc) => doc.status === 'READY'),
    [generatedDocuments],
  );

  if (selectedTemplate) {
    const Icon = templateIcons[selectedTemplate.id] ?? FiFileText;
    return (
      <section
        className={`document-it-page document-it-page--detail${embedded ? ' document-it-page--embedded' : ''}`}
        aria-label="Document template detail"
      >
        <DocumentTemplateDetail
          template={selectedTemplate}
          Icon={Icon}
          onBack={() => {
            setSelectedTemplate(null);
            if (userId && spaceId) {
              void refetchDocs();
            }
          }}
          initialSpaceId={spaceId}
          initialSpaceName={spaceName}
        />
      </section>
    );
  }

  const errorMessage = getApiErrorMessage(error, 'Unable to load templates');

  const handleDownload = async (doc: SpaceDocument) => {
    try {
      await downloadGeneratedDocx(doc.documentId, doc.fileName);
      showToast({ message: 'Download started.', type: 'success' });
    } catch (downloadError) {
      showToast({
        message:
          downloadError instanceof Error ? downloadError.message : 'Unable to download document',
        type: 'error',
      });
    }
  };

  return (
    <section
      className={`document-it-page${embedded ? ' document-it-page--embedded' : ''}`}
      aria-label="Document it"
    >
      {!embedded ? (
        <header className="document-it-hero">
          <h1>{spaceName ? `Templates for ${spaceName}` : 'Document it'}</h1>
        </header>
      ) : null}

      {spaceId ? (
        <div className="document-generated">
          {isDocsLoading ? (
            <div className="document-templates__state" aria-busy="true">
              <span className="home-spinner" />
              <p>Loading documents…</p>
            </div>
          ) : null}

          {isDocsError && !isDocsLoading ? (
            <div className="document-templates__state" role="alert">
              <p>Unable to load generated documents</p>
              <button type="button" className="home-retry-button" onClick={() => void refetchDocs()}>
                Retry
              </button>
            </div>
          ) : null}

          {!isDocsLoading && !isDocsError && readyDocuments.length === 0 ? (
            <div className="document-templates__state document-templates__state--compact">
              <p>No generated documents yet</p>
              <span>Open Document it, pick a template, then generate for this space.</span>
            </div>
          ) : null}

          {!isDocsLoading && !isDocsError && readyDocuments.length > 0 ? (
            <div className="document-generated__grid">
              {readyDocuments.map((doc) => (
                <GeneratedDocumentCard
                  key={doc.documentId}
                  document={doc}
                  onOpen={setPreviewDocument}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {previewDocument ? (
        <DocumentPreviewModal
          documentId={previewDocument.documentId}
          fallback={previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDownload={handleDownload}
        />
      ) : null}

      {showTemplates ? (
        <div className="document-templates">
          <div className="document-templates__header">
            <h2>
              <FiFileText aria-hidden="true" size={15} strokeWidth={1.7} />
              Popular templates
            </h2>
            <button type="button">Browse all</button>
          </div>

          {isLoading ? (
            <div className="document-templates__state" aria-busy="true">
              <span className="home-spinner" />
              <p>Loading templates…</p>
            </div>
          ) : null}

          {isError && !isLoading ? (
            <div className="document-templates__state" role="alert">
              <p>{errorMessage}</p>
              <button
                type="button"
                className="home-retry-button"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError && templates.length === 0 ? (
            <div className="document-templates__state">
              <p>No templates available yet</p>
            </div>
          ) : null}

          {!isLoading && !isError && templates.length > 0 ? (
            <div className="document-templates__grid">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} onSelect={setSelectedTemplate} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
