import { api } from '@/services/api';
import type { DocumentTemplate } from '@/features/document-it/documentTemplates';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type DocumentTemplatesListResponse = {
  templates: DocumentTemplate[];
};

export type DocumentTemplateDetailResponse = {
  template: DocumentTemplate;
};

const unwrapApiData = <T,>(response: ApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }

  return response.data;
};

const normalizeTemplate = (template: DocumentTemplate): DocumentTemplate => ({
  id: String(template.id || '').trim(),
  title: String(template.title || '').trim(),
  tagline: String(template.tagline || '').trim(),
  description: String(template.description || '').trim(),
  features: Array.isArray(template.features)
    ? template.features.map((item) => String(item)).filter(Boolean)
    : [],
  scopes: Array.isArray(template.scopes)
    ? template.scopes
        .map((scope) => ({
          label: String(scope?.label || '').trim(),
          detail: String(scope?.detail || '').trim(),
        }))
        .filter((scope) => scope.label)
    : [],
  exampleSections: Array.isArray(template.exampleSections)
    ? template.exampleSections
        .map((section) => ({
          heading: String(section?.heading || '').trim(),
          ...(section?.body ? { body: String(section.body) } : {}),
          ...(Array.isArray(section?.bullets) && section.bullets.length
            ? { bullets: section.bullets.map((item) => String(item)).filter(Boolean) }
            : {}),
        }))
        .filter((section) => section.heading)
    : [],
  ...(template.isNew ? { isNew: true } : {}),
});

export const documentTemplatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentTemplates: builder.query<DocumentTemplate[], void>({
      query: () => ({
        url: 'document-templates',
        method: 'GET',
      }),
      transformResponse: (response: ApiEnvelope<DocumentTemplatesListResponse>) => {
        const payload = unwrapApiData(response, 'Unable to load document templates');
        const templates = Array.isArray(payload.templates) ? payload.templates : [];
        return templates.map(normalizeTemplate).filter((template) => template.id && template.title);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((template) => ({ type: 'DocumentTemplates' as const, id: template.id })),
              { type: 'DocumentTemplates', id: 'LIST' },
            ]
          : [{ type: 'DocumentTemplates', id: 'LIST' }],
      keepUnusedDataFor: 300,
    }),
    getDocumentTemplate: builder.query<DocumentTemplate, string>({
      query: (id) => ({
        url: `document-templates/${encodeURIComponent(id)}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiEnvelope<DocumentTemplateDetailResponse>) => {
        const payload = unwrapApiData(response, 'Unable to load document template');
        if (!payload.template) {
          throw new Error('Document template not found');
        }
        return normalizeTemplate(payload.template);
      },
      providesTags: (_result, _error, id) => [{ type: 'DocumentTemplates', id }],
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const { useGetDocumentTemplatesQuery, useGetDocumentTemplateQuery } = documentTemplatesApi;
