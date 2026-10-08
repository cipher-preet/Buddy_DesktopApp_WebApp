import type { Edge, Node } from '@xyflow/react';

import type { MindmapCardData } from '@/features/mindmap/mindmapTypes';
import { api } from '@/services/api';

export type MindmapGraphPayload = {
  nodes: Node<MindmapCardData>[];
  edges: Edge[];
};

export type MindmapPreviewNode = {
  id: string;
  kind: 'hub' | 'branch' | 'card';
  title: string;
  subtitle?: string | null;
  tone?: string | null;
  items?: string[];
  variant?: string | null;
};

export type MindmapPreview = {
  title: string;
  subtitle?: string | null;
  /** Small reference set of real canvas nodes (hub + a few branches/cards). */
  nodes?: MindmapPreviewNode[];
  nodeCount: number;
  edgeCount: number;
};

export type MindmapDocument = {
  mindmapId: string;
  _id?: string;
  userId: string;
  spaceId: string;
  jobId?: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  graph?: MindmapGraphPayload;
  preview?: MindmapPreview;
  sourceStats?: {
    taskCount?: number;
    noteCount?: number;
    transcriptCount?: number;
    meetingCount?: number;
    truncated?: boolean;
  };
  model?: string | null;
  version?: number;
  updatedAt?: string;
  createdAt?: string;
};

export type MindmapSummary = Omit<MindmapDocument, 'graph'> & {
  preview: MindmapPreview;
};

export type GenerateMindmapResponse = {
  success: boolean;
  reused?: boolean;
  jobId: string;
  mindmapId: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
};

type MindmapEnvelope<T> = {
  success?: boolean;
  mindmap?: T;
  mindmaps?: T[];
  detail?: string;
  message?: string;
};

const unwrapMindmap = <T,>(response: MindmapEnvelope<T>, fallback: string): T => {
  if (!response?.mindmap) {
    throw new Error(response?.detail || response?.message || fallback);
  }
  return response.mindmap;
};

export const mindmapApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateMindmap: builder.mutation<GenerateMindmapResponse, { userId: string; spaceId: string }>({
      query: (body) => ({
        url: 'mindmap/generate',
        method: 'POST',
        body,
      }),
    }),
    getLatestMindmap: builder.query<MindmapDocument, { userId: string; spaceId: string }>({
      query: ({ userId, spaceId }) => ({
        url: 'mindmap',
        params: { userId, spaceId },
      }),
      transformResponse: (response: MindmapEnvelope<MindmapDocument>) =>
        unwrapMindmap(response, 'Mind map not found for this space.'),
    }),
    listMindmaps: builder.query<MindmapSummary[], { userId: string; spaceId: string; limit?: number }>({
      query: ({ userId, spaceId, limit = 24 }) => ({
        url: 'mindmap/list',
        params: { userId, spaceId, limit },
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'MindmapList', id: `${arg.userId}:${arg.spaceId}` },
      ],
      transformResponse: (response: MindmapEnvelope<MindmapSummary>) => {
        if (!response?.success && !Array.isArray(response?.mindmaps)) {
          throw new Error(response?.detail || response?.message || 'Unable to load mind maps.');
        }
        return response.mindmaps ?? [];
      },
    }),
    getMindmapById: builder.query<MindmapDocument, string>({
      query: (mindmapId) => ({
        url: `mindmap/${mindmapId}`,
      }),
      transformResponse: (response: MindmapEnvelope<MindmapDocument>) =>
        unwrapMindmap(response, 'Mind map not found.'),
    }),
    removeMindmapNode: builder.mutation<
      MindmapDocument,
      { mindmapId: string; nodeId: string }
    >({
      query: ({ mindmapId, nodeId }) => ({
        url: `mindmap/${mindmapId}/nodes/${encodeURIComponent(nodeId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MindmapList'],
      transformResponse: (response: MindmapEnvelope<MindmapDocument>) =>
        unwrapMindmap(response, 'Unable to update mind map.'),
      async onQueryStarted({ mindmapId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            mindmapApi.util.updateQueryData('getMindmapById', mindmapId, () => data),
          );
        } catch {
          // Keep local canvas state; caller handles toast/rollback.
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGenerateMindmapMutation,
  useLazyGetLatestMindmapQuery,
  useLazyGetMindmapByIdQuery,
  useGetMindmapByIdQuery,
  useListMindmapsQuery,
  useRemoveMindmapNodeMutation,
} = mindmapApi;
