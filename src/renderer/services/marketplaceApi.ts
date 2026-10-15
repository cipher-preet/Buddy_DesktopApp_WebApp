import { api } from '@/services/api';
import {
  normalizeAgentTone,
  normalizeInstallTier,
  resolveAgentIcon,
  type MarketplaceAgent,
} from '@/features/marketplace/marketplaceData';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

type ApiMarketplaceAgent = {
  id?: string;
  title?: string;
  description?: string;
  author?: string;
  installs?: string;
  tone?: string;
  icon?: string;
  installTier?: string;
  hireEnabled?: boolean;
};

export type MarketplaceAgentsPage = {
  agents: MarketplaceAgent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hireEnabled: boolean;
};

export type MarketplaceAgentsQueryArg = {
  limit?: number;
};

type PageParam = number;

const DEFAULT_PAGE_SIZE = 10;
const LIST_TAG = { type: 'MarketplaceAgents' as const, id: 'LIST' };

const unwrap = <T,>(response: ApiEnvelope<T>, fallbackMessage: string): T => {
  if (!response?.success || response.data === undefined) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response.data;
};

const mapAgent = (agent: ApiMarketplaceAgent): MarketplaceAgent | null => {
  const id = String(agent.id || '').trim();
  const title = String(agent.title || '').trim();
  if (!id || !title) {
    return null;
  }

  const iconKey = String(agent.icon || 'sparkles').trim();

  return {
    id,
    title,
    description: String(agent.description || '').trim(),
    author: String(agent.author || 'Kuku Labs').trim() || 'Kuku Labs',
    installs: String(agent.installs || '0').trim() || '0',
    tone: normalizeAgentTone(agent.tone),
    icon: resolveAgentIcon(iconKey),
    iconKey,
    installTier: normalizeInstallTier(agent.installTier),
    hireEnabled: agent.hireEnabled === true,
  };
};

export const marketplaceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMarketplaceAgents: builder.infiniteQuery<
      MarketplaceAgentsPage,
      MarketplaceAgentsQueryArg,
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
      },
      query: ({ queryArg, pageParam }) => ({
        url: 'marketplace/agents',
        method: 'GET',
        params: {
          page: pageParam,
          limit: queryArg.limit ?? DEFAULT_PAGE_SIZE,
        },
      }),
      transformResponse: (response: ApiEnvelope<Partial<MarketplaceAgentsPage>>) => {
        const page = unwrap(response, 'Unable to load marketplace agents');
        const agents = Array.isArray(page.agents)
          ? page.agents.map(mapAgent).filter((agent): agent is MarketplaceAgent => Boolean(agent))
          : [];

        const currentPage = Number(page.page) > 0 ? Number(page.page) : 1;
        const limit = Number(page.limit) > 0 ? Number(page.limit) : DEFAULT_PAGE_SIZE;
        const total = Number(page.total) >= 0 ? Number(page.total) : agents.length;
        const totalPages =
          Number(page.totalPages) >= 0
            ? Number(page.totalPages)
            : total === 0
              ? 0
              : Math.ceil(total / limit);
        const hasMore =
          typeof page.hasMore === 'boolean' ? page.hasMore : currentPage < totalPages;
        const hireEnabled =
          typeof page.hireEnabled === 'boolean'
            ? page.hireEnabled
            : agents.some((agent) => agent.hireEnabled);

        return {
          agents,
          page: currentPage,
          limit,
          total,
          totalPages,
          hasMore,
          hireEnabled,
        };
      },
      providesTags: (result) => {
        const agents = result?.pages.flatMap((page) => page.agents) ?? [];
        return agents.length
          ? [...agents.map((agent) => ({ type: 'MarketplaceAgents' as const, id: agent.id })), LIST_TAG]
          : [LIST_TAG];
      },
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const { useGetMarketplaceAgentsInfiniteQuery } = marketplaceApi;
