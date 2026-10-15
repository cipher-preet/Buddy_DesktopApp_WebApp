import { api } from '@/services/api';

export type DocumentPreview = {
  title?: string;
  subtitle?: string | null;
  excerpt?: string | null;
  sectionCount?: number;
  spaceName?: string;
};

export type DocumentTableContent = {
  headers?: string[];
  rows?: string[][];
};

export type DocumentSectionContent = {
  heading: string;
  body?: string | null;
  bullets?: string[];
  table?: DocumentTableContent | null;
};

export type DocumentBodyContent = {
  title?: string;
  subtitle?: string | null;
  meta?: Record<string, string>;
  sections?: DocumentSectionContent[];
};

export type SpaceDocument = {
  documentId: string;
  _id?: string;
  userId: string;
  spaceId: string;
  jobId?: string;
  templateCode?: string;
  templateTitle?: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  preview?: DocumentPreview;
  content?: DocumentBodyContent | null;
  sourceStats?: {
    taskCount?: number;
    noteCount?: number;
    transcriptCount?: number;
    meetingCount?: number;
    truncated?: boolean;
  };
  model?: string | null;
  version?: number;
  fileName?: string | null;
  hasDocx?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type GenerateDocumentResponse = {
  success: boolean;
  reused?: boolean;
  jobId: string;
  documentId: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  templateCode?: string;
  templateTitle?: string;
};

type DocumentEnvelope<T> = {
  success?: boolean;
  document?: T;
  documents?: T[];
  detail?: string;
  message?: string;
};

const unwrapDocument = <T,>(response: DocumentEnvelope<T>, fallback: string): T => {
  if (!response?.document) {
    throw new Error(response?.detail || response?.message || fallback);
  }
  return response.document;
};

export const documentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateDocument: builder.mutation<
      GenerateDocumentResponse,
      { userId: string; spaceId: string; templateCode: string }
    >({
      query: (body) => ({
        url: 'documents/generate',
        method: 'POST',
        body,
      }),
    }),
    listDocuments: builder.query<
      SpaceDocument[],
      { userId: string; spaceId: string; limit?: number }
    >({
      query: ({ userId, spaceId, limit = 24 }) => ({
        url: 'documents/list',
        params: { userId, spaceId, limit },
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'SpaceDocuments', id: `${arg.userId}:${arg.spaceId}` },
      ],
      transformResponse: (response: DocumentEnvelope<SpaceDocument>) => {
        if (!response?.success && !Array.isArray(response?.documents)) {
          throw new Error(response?.detail || response?.message || 'Unable to load documents.');
        }
        return response.documents ?? [];
      },
    }),
    getDocumentById: builder.query<SpaceDocument, string>({
      query: (documentId) => ({
        url: `documents/${documentId}`,
      }),
      transformResponse: (response: DocumentEnvelope<SpaceDocument>) =>
        unwrapDocument(response, 'Document not found.'),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGenerateDocumentMutation,
  useListDocumentsQuery,
  useGetDocumentByIdQuery,
  useLazyListDocumentsQuery,
} = documentsApi;

export const getDocumentDownloadUrl = (documentId: string) =>
  `documents/${encodeURIComponent(documentId)}/download`;
