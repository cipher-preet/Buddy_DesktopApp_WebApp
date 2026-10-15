import { useEffect, useMemo, useRef, useState } from 'react';
import { FiDownload, FiPlus } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

import { useAppSelector } from '@/app/hooks';
import { getApiErrorMessage } from '@/services/apiErrors';
import { useGetMarketplaceAgentsInfiniteQuery } from '@/services/marketplaceApi';
import { useGetPlanStatusQuery } from '@/services/plansApi';

import { HireAgentModal } from './HireAgentModal';
import type { MarketplaceAgent } from './marketplaceData';

import './marketplace.css';

const PAGE_SIZE = 10;

const authorTone = (name: string) => {
  const tones = ['blue', 'red', 'navy', 'teal', 'orange', 'purple', 'green'] as const;
  const total = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
};

export const MarketplacePage = () => {
  const authUser = useAppSelector((state) => state.auth.user);
  const userId = authUser?.userId || '';
  const { data: planStatus } = useGetPlanStatusQuery({ userId }, { skip: !userId });
  const planCode = planStatus?.plan?.code || planStatus?.subscription?.planCode || 'free';
  const periodEnd = planStatus?.subscription?.currentPeriodEnd
    ? new Date(planStatus.subscription.currentPeriodEnd).getTime()
    : null;
  const planInactive =
    planStatus?.subscription?.status === 'expired' ||
    planStatus?.subscription?.status === 'cancelled' ||
    (typeof periodEnd === 'number' &&
      Number.isFinite(periodEnd) &&
      periodEnd <= Date.now() &&
      planCode !== 'free');
  const effectivePlanCode = planInactive ? 'free' : planCode;

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useGetMarketplaceAgentsInfiniteQuery({ limit: PAGE_SIZE });

  const agents = useMemo(
    () => data?.pages.flatMap((page) => page.agents) ?? [],
    [data],
  );
  const totalAgents = data?.pages[0]?.total ?? agents.length;
  const hireEnabled = data?.pages[0]?.hireEnabled === true;

  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = loadMoreSentinelRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const errorMessage = getApiErrorMessage(error, 'Unable to load marketplace agents');
  const showInitialLoading = isLoading && agents.length === 0;
  const showError = isError && agents.length === 0 && !isLoading;

  return (
    <section className="marketplace-page" aria-label="Marketplace">
      <div className="marketplace-inner">
        <header className="marketplace-head">
          <h1>
            <HiSparkles size={16} aria-hidden="true" />
            Featured agents
          </h1>
          {effectivePlanCode === 'free' ? (
            <p className="marketplace-plan-note">
              {planInactive
                ? 'Your paid plan ended. Browse freely — hiring agents is coming soon.'
                : 'Browse freely. Hiring agents is coming soon.'}
            </p>
          ) : (
            <p className="marketplace-plan-note">Hiring agents is coming soon.</p>
          )}
        </header>

        {showInitialLoading ? (
          <div className="marketplace-state" aria-busy="true">
            <span className="home-spinner" />
            <p>Loading agents…</p>
          </div>
        ) : null}

        {showError ? (
          <div className="marketplace-state" role="alert">
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

        {!showInitialLoading && !showError && agents.length === 0 ? (
          <div className="marketplace-state">
            <p>No agents available yet</p>
          </div>
        ) : null}

        {!showInitialLoading && !showError && agents.length > 0 ? (
          <>
            <ul className="marketplace-list">
              {agents.map((agent) => {
                const Icon = agent.icon;
                const canHire = hireEnabled && agent.hireEnabled;
                return (
                  <li key={agent.id}>
                    <article className="marketplace-row">
                      <span
                        className={`marketplace-mark marketplace-mark--${agent.tone}`}
                        aria-hidden="true"
                      >
                        <span>
                          <Icon size={22} strokeWidth={1.8} />
                        </span>
                      </span>

                      <div className="marketplace-copy">
                        <h2>{agent.title}</h2>
                        <p>{agent.description}</p>
                        <div className="marketplace-meta">
                          <span
                            className={`marketplace-avatar marketplace-avatar--${authorTone(agent.author)}`}
                          >
                            {agent.author.slice(0, 1)}
                          </span>
                          <span>{agent.author}</span>
                          <FiDownload size={12} aria-hidden="true" />
                          <span>{agent.installs}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`marketplace-get${canHire ? '' : ' is-disabled'}`}
                        disabled={!canHire}
                        title={canHire ? undefined : 'Coming soon'}
                        aria-disabled={!canHire}
                        onClick={() => {
                          if (!canHire) return;
                          setSelectedAgent(agent);
                        }}
                      >
                        <FiPlus size={15} aria-hidden="true" />
                        Hire Agent
                      </button>
                    </article>
                  </li>
                );
              })}
            </ul>

            <div className="marketplace-pagination" aria-live="polite">
              <div
                ref={loadMoreSentinelRef}
                className="marketplace-pagination__sentinel"
                aria-hidden="true"
              />
              {isFetchingNextPage ? (
                <p className="marketplace-pagination__status" aria-busy="true">
                  <span className="home-spinner" />
                  Loading more agents…
                </p>
              ) : null}
              {!hasNextPage && agents.length > 0 ? (
                <p className="marketplace-pagination__end">
                  You’ve reached the end · {agents.length}
                  {totalAgents > agents.length ? ` of ${totalAgents}` : ''} agents
                </p>
              ) : null}
              {isError && agents.length > 0 && !isFetchingNextPage ? (
                <div className="marketplace-pagination__error" role="alert">
                  <p>{errorMessage}</p>
                  <button
                    type="button"
                    className="home-retry-button"
                    disabled={isFetching}
                    onClick={() => void fetchNextPage()}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      {selectedAgent ? (
        <HireAgentModal agentName={selectedAgent.title} onClose={() => setSelectedAgent(null)} />
      ) : null}
    </section>
  );
};
