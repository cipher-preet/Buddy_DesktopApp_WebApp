import { api } from '@/services/api';
import type { SearchResponse, SearchResultType } from '@/features/search/searchTypes';

type SearchEnvelope = {
  success?: boolean;
  message?: string;
  data?: SearchResponse;
};

export type WorkspaceSearchArg = {
  userId: string;
  q: string;
  types?: SearchResultType[];
  limit?: number;
};

const localTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

export const searchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    searchWorkspace: builder.query<SearchResponse, WorkspaceSearchArg>({
      query: ({ q, types, limit }) => ({
        url: 'home/search',
        params: {
          q,
          ...(types && types.length > 0 ? { types: types.join(',') } : {}),
          ...(limit ? { limit } : {}),
          ...(localTimeZone() ? { tz: localTimeZone() } : {}),
        },
      }),
      transformResponse: (response: SearchEnvelope) => {
        if (!response?.success || !response.data) {
          throw new Error(response?.message || 'Search failed');
        }
        return response.data;
      },
      keepUnusedDataFor: 20,
    }),
  }),
  overrideExisting: false,
});

export const { useSearchWorkspaceQuery } = searchApi;
