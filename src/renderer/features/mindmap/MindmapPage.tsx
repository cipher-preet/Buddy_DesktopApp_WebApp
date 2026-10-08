import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FiChevronsLeft, FiFolder, FiSearch } from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { getStoredAuthToken } from '@/features/auth/authStorage';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';
import {
  useGenerateMindmapMutation,
  useLazyGetLatestMindmapQuery,
  useLazyGetMindmapByIdQuery,
  type MindmapGraphPayload,
} from '@/services/mindmapApi';
import {
  subscribeToMindmapStatusEvents,
  type MindmapStatusEvent,
} from '@/services/mindmapStatusEvents';

import { MindmapCanvas } from './MindmapCanvas';

import './mindmap.css';

const SPACES_PAGE_SIZE = 10;

type CanvasMode = 'prompt' | 'view' | 'generate';

type GenerationStatus = {
  jobId: string;
  mindmapId: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
};

const emptyGraph: MindmapGraphPayload = { nodes: [], edges: [] };

const MindmapSpacePrompt = ({
  onView,
  onGenerate,
  viewBusy,
  generateBusy,
}: {
  onView: () => void;
  onGenerate: () => void;
  viewBusy?: boolean;
  generateBusy?: boolean;
}) => (
  <div className="mindmap-prompt" role="region" aria-label="Mind map actions">
    <div className="mindmap-prompt__actions">
      <button
        type="button"
        className="mindmap-prompt__btn mindmap-prompt__btn--secondary"
        onClick={onView}
        disabled={viewBusy || generateBusy}
      >
        {viewBusy ? 'Loading…' : 'View mind map'}
      </button>
      <button
        type="button"
        className="mindmap-prompt__btn mindmap-prompt__btn--primary"
        onClick={onGenerate}
        disabled={generateBusy || viewBusy}
      >
        {generateBusy ? 'Starting…' : 'Generate mind map'}
      </button>
    </div>
  </div>
);

const GenerationPanel = ({
  status,
  onBack,
}: {
  status: GenerationStatus | null;
  onBack: () => void;
}) => {
  const failed = status?.status === 'FAILED';
  const progress = Math.max(0, Math.min(100, status?.progress ?? 0));

  return (
    <div className="mindmap-prompt" role="region" aria-label="Generate mind map">
      <div className="mindmap-generate-status">
        <p className="mindmap-generate-status__label">
          {failed ? 'Generation failed' : status?.message || 'Generating mind map…'}
        </p>
        {!failed ? (
          <div className="mindmap-generate-status__bar" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {status?.stage && !failed ? (
          <p className="mindmap-generate-status__meta">
            {status.stage.replaceAll('_', ' ')} · {progress}%
          </p>
        ) : null}
        {failed && status?.error ? <p className="mindmap-generate-status__error">{status.error}</p> : null}
        <div className="mindmap-prompt__actions">
          <button type="button" className="mindmap-prompt__btn mindmap-prompt__btn--secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export const MindmapPage = () => {
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('prompt');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [viewGraph, setViewGraph] = useState<MindmapGraphPayload>(emptyGraph);
  const [activeMindmapId, setActiveMindmapId] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [generation, setGeneration] = useState<GenerationStatus | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [generateMindmap, { isLoading: isStartingGenerate }] = useGenerateMindmapMutation();
  const [fetchLatestMindmap] = useLazyGetLatestMindmapQuery();
  const [fetchMindmapById] = useLazyGetMindmapByIdQuery();

  const {
    data: spacesData,
    isLoading: isSpacesLoading,
    isFetching: isSpacesFetching,
    isError: isSpacesError,
    error: spacesError,
    refetch: refetchSpaces,
    fetchNextPage: fetchNextSpacesPage,
    hasNextPage: hasMoreSpaces,
    isFetchingNextPage: isFetchingMoreSpaces,
  } = useGetUserSpacesInfiniteQuery(
    { userId: userId || '', limit: SPACES_PAGE_SIZE },
    { skip: !userId },
  );

  const spaces = useMemo(
    () => spacesData?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesData],
  );

  const filteredSpaces = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return spaces;
    }
    return spaces.filter((space) => space.name.toLowerCase().includes(needle));
  }, [query, spaces]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? null,
    [activeSpaceId, spaces],
  );

  const stopGenerationStream = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  useEffect(() => {
    if (!activeSpaceId) {
      return;
    }
    if (spaces.length && !spaces.some((space) => space.id === activeSpaceId)) {
      setActiveSpaceId(null);
      setCanvasMode('prompt');
      setGeneration(null);
      setViewGraph(emptyGraph);
      setActiveMindmapId(null);
      setViewError(null);
      stopGenerationStream();
    }
  }, [activeSpaceId, spaces, stopGenerationStream]);

  useEffect(() => () => stopGenerationStream(), [stopGenerationStream]);

  const selectSpace = useCallback(
    (spaceId: string) => {
      stopGenerationStream();
      setActiveSpaceId(spaceId);
      setCanvasMode('prompt');
      setGeneration(null);
      setGenerateError(null);
      setViewGraph(emptyGraph);
      setActiveMindmapId(null);
      setViewError(null);
    },
    [stopGenerationStream],
  );

  const loadGraphDocument = useCallback(async (mindmapId: string) => {
    const doc = await fetchMindmapById(mindmapId).unwrap();
    const graph = doc.graph ?? emptyGraph;
    setActiveMindmapId(doc.mindmapId || mindmapId);
    setViewGraph({
      nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
      edges: Array.isArray(graph.edges) ? graph.edges : [],
    });
    setCanvasMode('view');
    setViewError(null);
  }, [fetchMindmapById]);

  const handleStatusEvent = useCallback(
    async (event: MindmapStatusEvent) => {
      setGeneration((current) => ({
        jobId: event.jobId || current?.jobId || '',
        mindmapId: event.mindmapId || current?.mindmapId || '',
        status: event.status || current?.status || 'QUEUED',
        stage: event.stage,
        progress: event.progress,
        message: event.message,
        error: event.error,
      }));

      if (event.status === 'READY' && event.mindmapId) {
        stopGenerationStream();
        try {
          await loadGraphDocument(event.mindmapId);
        } catch (error) {
          setGenerateError(error instanceof Error ? error.message : 'Unable to load generated mind map');
          setCanvasMode('prompt');
        }
        return;
      }

      if (event.status === 'FAILED') {
        stopGenerationStream();
      }
    },
    [loadGraphDocument, stopGenerationStream],
  );

  const handleView = useCallback(async () => {
    if (!userId || !selectedSpace) {
      return;
    }
    setIsViewLoading(true);
    setViewError(null);
    try {
      const doc = await fetchLatestMindmap({ userId, spaceId: selectedSpace.id }).unwrap();
      const graph = doc.graph ?? emptyGraph;
      if (!graph.nodes?.length) {
        setViewError('No mind map saved for this space yet. Generate one first.');
        setViewGraph(emptyGraph);
        setActiveMindmapId(null);
        return;
      }
      setActiveMindmapId(doc.mindmapId || null);
      setViewGraph({
        nodes: graph.nodes,
        edges: Array.isArray(graph.edges) ? graph.edges : [],
      });
      setCanvasMode('view');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404
          ? 'No mind map saved for this space yet. Generate one first.'
          : error instanceof Error
            ? error.message
            : 'Unable to load mind map';
      setViewError(message);
    } finally {
      setIsViewLoading(false);
    }
  }, [fetchLatestMindmap, selectedSpace, userId]);

  const handleGenerate = useCallback(async () => {
    if (!userId || !selectedSpace) {
      return;
    }

    stopGenerationStream();
    setGenerateError(null);
    setGeneration({
      jobId: '',
      mindmapId: '',
      status: 'QUEUED',
      stage: 'queued',
      progress: 5,
      message: 'Starting generation…',
    });
    setCanvasMode('generate');

    try {
      const result = await generateMindmap({ userId, spaceId: selectedSpace.id }).unwrap();
      setGeneration({
        jobId: result.jobId,
        mindmapId: result.mindmapId,
        status: result.status,
        stage: result.stage,
        progress: result.progress,
        message: result.message,
      });

      unsubscribeRef.current = subscribeToMindmapStatusEvents({
        userId,
        spaceId: selectedSpace.id,
        jobId: result.jobId,
        mindmapId: result.mindmapId,
        token: getStoredAuthToken(),
        onStatusChange: (event) => {
          void handleStatusEvent(event);
        },
        onError: (error) => {
          setGenerateError(error instanceof Error ? error.message : 'Status stream interrupted');
        },
      });
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? String(
              (error as { data?: { detail?: string; message?: string } }).data?.detail ||
                (error as { data?: { message?: string } }).data?.message ||
                'Unable to start mind map generation',
            )
          : error instanceof Error
            ? error.message
            : 'Unable to start mind map generation';
      setGenerateError(message);
      setGeneration({
        jobId: '',
        mindmapId: '',
        status: 'FAILED',
        message: 'Generation failed',
        error: message,
      });
    }
  }, [generateMindmap, handleStatusEvent, selectedSpace, stopGenerationStream, userId]);

  const spacesErrorMessage =
    spacesError && typeof spacesError === 'object' && 'status' in spacesError
      ? `Unable to load spaces (${String((spacesError as { status?: unknown }).status)})`
      : 'Unable to load spaces';

  return (
    <section className="mindmap-page" aria-label="Mindmap" data-sidebar-open={sidebarOpen ? 'true' : undefined}>
      <aside
        className="mindmap-spaces"
        aria-label="Spaces"
        aria-hidden={sidebarOpen ? undefined : true}
        data-open={sidebarOpen ? 'true' : 'false'}
      >
        <div className="mindmap-spaces__header">
          <div>
            <p>Spaces</p>
            <h2>All spaces</h2>
          </div>
          <button
            type="button"
            className="mindmap-spaces__toggle"
            aria-label="Collapse spaces"
            tabIndex={sidebarOpen ? undefined : -1}
            onClick={() => setSidebarOpen(false)}
          >
            <FiChevronsLeft size={16} />
          </button>
        </div>

        <label className="mindmap-spaces__search">
          <FiSearch aria-hidden="true" size={15} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search spaces"
            tabIndex={sidebarOpen ? undefined : -1}
          />
        </label>

        <div className="mindmap-spaces__list" role="list">
          {!userId ? (
            <div className="mindmap-spaces__state">
              <p>Sign in to load your spaces.</p>
            </div>
          ) : null}

          {userId && isSpacesLoading ? (
            <div className="mindmap-spaces__state">
              <p>Loading spaces…</p>
            </div>
          ) : null}

          {userId && isSpacesError ? (
            <div className="mindmap-spaces__state mindmap-spaces__state--error">
              <p>{spacesErrorMessage}</p>
              <button
                type="button"
                className="mindmap-spaces__retry"
                tabIndex={sidebarOpen ? undefined : -1}
                onClick={() => void refetchSpaces()}
              >
                Retry
              </button>
            </div>
          ) : null}

          {userId && !isSpacesLoading && !isSpacesError && filteredSpaces.length === 0 ? (
            <div className="mindmap-spaces__state">
              <p>{query.trim() ? 'No spaces match your search.' : 'No spaces yet.'}</p>
            </div>
          ) : null}

          {filteredSpaces.map((space) => {
            const isActive = space.id === activeSpaceId;

            return (
              <button
                key={space.id}
                type="button"
                role="listitem"
                className="mindmap-spaces__item"
                data-active={isActive ? 'true' : undefined}
                tabIndex={sidebarOpen ? undefined : -1}
                onClick={() => selectSpace(space.id)}
              >
                <span className="mindmap-spaces__icon" aria-hidden="true">
                  <FiFolder size={15} />
                </span>
                <span className="mindmap-spaces__meta">
                  <strong>{space.name}</strong>
                  <small>{space.updatedAtLabel}</small>
                </span>
              </button>
            );
          })}

          {hasMoreSpaces ? (
            <button
              type="button"
              className="mindmap-spaces__load-more"
              disabled={isFetchingMoreSpaces}
              tabIndex={sidebarOpen ? undefined : -1}
              onClick={() => void fetchNextSpacesPage()}
            >
              {isFetchingMoreSpaces ? 'Loading…' : 'Load more'}
            </button>
          ) : null}

          {isSpacesFetching && !isSpacesLoading && !isFetchingMoreSpaces ? (
            <p className="mindmap-spaces__hint">Refreshing…</p>
          ) : null}
        </div>
      </aside>

      <button
        type="button"
        className="mindmap-spaces-open"
        aria-label="Open spaces"
        aria-hidden={sidebarOpen ? true : undefined}
        tabIndex={sidebarOpen ? -1 : undefined}
        data-visible={sidebarOpen ? 'false' : 'true'}
        onClick={() => setSidebarOpen(true)}
      >
        <FiFolder size={18} />
      </button>

      <div className="mindmap-canvas-shell">
        {!selectedSpace ? (
          <div className="mindmap-prompt" role="region" aria-label="Select a space" />
        ) : canvasMode === 'prompt' ? (
          <>
            <MindmapSpacePrompt
              onView={() => void handleView()}
              onGenerate={() => void handleGenerate()}
              viewBusy={isViewLoading}
              generateBusy={isStartingGenerate}
            />
            {viewError || generateError ? (
              <p className="mindmap-inline-error">{viewError || generateError}</p>
            ) : null}
          </>
        ) : canvasMode === 'generate' ? (
          <GenerationPanel
            status={generation}
            onBack={() => {
              stopGenerationStream();
              setCanvasMode('prompt');
            }}
          />
        ) : (
          <ReactFlowProvider>
            <MindmapCanvas
              canvasKey={selectedSpace.id}
              mindmapId={activeMindmapId}
              graph={viewGraph}
            />
          </ReactFlowProvider>
        )}
      </div>
    </section>
  );
};
