import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  FiChevronRight,
  FiGitBranch,
  FiMaximize2,
  FiMinimize2,
  FiRefreshCw,
} from 'react-icons/fi';

import { formatRelativeDate } from '@/features/dashboard/homeMappers';
import {
  useGetMindmapByIdQuery,
  useListMindmapsQuery,
  type MindmapPreviewNode,
  type MindmapSummary,
} from '@/services/mindmapApi';

import { MindmapCanvas } from './MindmapCanvas';

import './mindmap.css';

type SpaceMindmapSectionProps = {
  userId: string;
  spaceId: string;
  spaceName: string;
};

const toneClass = (tone?: string | null) => (tone ? `mindmap-node--${tone}` : '');

const shorten = (value: string, max = 22) => {
  const text = value.trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

const MiniHub = ({ node }: { node: MindmapPreviewNode }) => (
  <div className="home-mindmap-chip home-mindmap-chip--hub">
    <strong>{shorten(node.title, 18)}</strong>
  </div>
);

const MiniBranch = ({ node }: { node: MindmapPreviewNode }) => (
  <div className={`home-mindmap-chip home-mindmap-chip--branch ${toneClass(node.tone)}`}>
    <span>{shorten(node.title, 14)}</span>
  </div>
);

const MiniCard = ({ node }: { node: MindmapPreviewNode }) => (
  <div className={`home-mindmap-chip home-mindmap-chip--card ${toneClass(node.tone)}`}>
    <strong>{shorten(node.title, 16)}</strong>
    {node.items?.[0] ? <span>{shorten(node.items[0], 28)}</span> : null}
  </div>
);

const MindmapMiniPreview = ({ nodes }: { nodes: MindmapPreviewNode[] }) => {
  const hub = nodes.find((node) => node.kind === 'hub');
  const branch = nodes.find((node) => node.kind === 'branch');
  const card = nodes.find((node) => node.kind === 'card');

  return (
    <div className="home-mindmap-mini" aria-hidden="true">
      <svg className="home-mindmap-mini__lines" viewBox="0 0 240 140" preserveAspectRatio="none">
        <path d="M120 52 L52 88" />
        <path d="M120 52 L188 88" />
      </svg>

      <div className="home-mindmap-mini__hub">
        {hub ? <MiniHub node={hub} /> : <div className="home-mindmap-chip home-mindmap-chip--hub"><strong>Mind map</strong></div>}
      </div>

      <div className="home-mindmap-mini__leaf home-mindmap-mini__leaf--left">
        {branch ? <MiniBranch node={branch} /> : null}
      </div>

      <div className="home-mindmap-mini__leaf home-mindmap-mini__leaf--right">
        {card ? <MiniCard node={card} /> : null}
      </div>
    </div>
  );
};

const MindmapCard = ({
  mindmap,
  onSelect,
}: {
  mindmap: MindmapSummary;
  onSelect: (mindmap: MindmapSummary) => void;
}) => {
  const title = mindmap.preview?.title || 'Mind map';
  const previewNodes = mindmap.preview?.nodes ?? [];
  const updatedLabel = formatRelativeDate(mindmap.updatedAt || mindmap.createdAt);

  return (
    <button
      type="button"
      className="home-mindmap-card"
      aria-label={`Open mind map ${title}`}
      onClick={() => onSelect(mindmap)}
    >
      <div className="home-mindmap-card__preview home-mindmap-card__preview--nodes">
        {mindmap.version ? (
          <span className="home-mindmap-card__badge">v{mindmap.version}</span>
        ) : null}

        {previewNodes.length > 0 ? (
          <MindmapMiniPreview nodes={previewNodes} />
        ) : (
          <div className="home-mindmap-mini home-mindmap-mini--empty">
            <span className="home-mindmap-card__lead-icon" aria-hidden="true">
              <FiGitBranch size={20} strokeWidth={1.6} />
            </span>
            <h3>{title}</h3>
          </div>
        )}
      </div>

      <div className="home-mindmap-card__meta">
        <span className="home-mindmap-card__meta-icon" aria-hidden="true">
          <FiGitBranch size={13} strokeWidth={1.7} />
        </span>
        <strong>{title}</strong>
        <span className="home-mindmap-card__price">{updatedLabel}</span>
      </div>
    </button>
  );
};

const MindmapDetailView = ({
  mindmapId,
  spaceName,
  title,
  onBack,
}: {
  mindmapId: string;
  spaceName: string;
  title: string;
  onBack: () => void;
}) => {
  const canvasShellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetMindmapByIdQuery(mindmapId);
  const graph = useMemo(
    () => data?.graph ?? { nodes: [], edges: [] },
    [data?.graph],
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === canvasShellRef.current;
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const shell = canvasShellRef.current;
    if (!shell) {
      return;
    }

    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
        return;
      }
      await shell.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by the host; keep inline view.
    }
  };

  const errorMessage =
    error && typeof error === 'object' && 'status' in error
      ? `Unable to load mind map (${String((error as { status?: unknown }).status)})`
      : 'Unable to load mind map.';

  return (
    <section className="home-mindmap-detail" aria-label="Mind map canvas">
      <div className="home-mindmap-detail__toolbar">
        <nav className="home-mindmap-detail__breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="home-mindmap-detail__crumb-link" onClick={onBack}>
            Back
          </button>
          <FiChevronRight aria-hidden="true" size={14} />
          <span className="home-mindmap-detail__crumb-muted">{spaceName}</span>
          <FiChevronRight aria-hidden="true" size={14} />
          <span className="home-mindmap-detail__crumb-current">{title}</span>
        </nav>

        <button
          type="button"
          className="home-mindmap-detail__fullscreen"
          aria-label={isFullscreen ? 'Exit full screen' : 'Show full screen'}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen ? <FiMinimize2 aria-hidden="true" size={15} /> : <FiMaximize2 aria-hidden="true" size={15} />}
          <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>

      <div
        ref={canvasShellRef}
        className="home-mindmap-detail__canvas"
        data-fullscreen={isFullscreen ? 'true' : undefined}
      >
        {isLoading ? (
          <div className="home-mindmap-detail__state">
            <p>Loading mind map…</p>
          </div>
        ) : null}

        {isError ? (
          <div className="home-mindmap-detail__state home-mindmap-detail__state--error">
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void refetch()}>
              <FiRefreshCw aria-hidden="true" size={14} />
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && data ? (
          <ReactFlowProvider>
            <MindmapCanvas canvasKey={mindmapId} mindmapId={mindmapId} graph={graph} />
          </ReactFlowProvider>
        ) : null}

        {isFullscreen ? (
          <button
            type="button"
            className="home-mindmap-detail__fullscreen home-mindmap-detail__fullscreen--overlay"
            aria-label="Exit full screen"
            onClick={() => void toggleFullscreen()}
          >
            <FiMinimize2 aria-hidden="true" size={15} />
            <span>Exit full screen</span>
          </button>
        ) : null}

        {isFetching && !isLoading ? <p className="home-mindmap-detail__hint">Refreshing…</p> : null}
      </div>
    </section>
  );
};

export const SpaceMindmapSection = ({ userId, spaceId, spaceName }: SpaceMindmapSectionProps) => {
  const [selected, setSelected] = useState<MindmapSummary | null>(null);

  const { data, isLoading, isError, error, refetch } = useListMindmapsQuery(
    { userId, spaceId, limit: 24 },
    { skip: !userId || !spaceId },
  );

  const mindmaps = data ?? [];

  useEffect(() => {
    setSelected(null);
  }, [spaceId]);

  if (selected) {
    return (
      <MindmapDetailView
        mindmapId={selected.mindmapId}
        spaceName={spaceName}
        title={selected.preview?.title || `Version ${selected.version ?? ''}`}
        onBack={() => setSelected(null)}
      />
    );
  }

  const errorMessage =
    error && typeof error === 'object' && 'status' in error
      ? `Unable to load mind maps (${String((error as { status?: unknown }).status)})`
      : 'Unable to load mind maps.';

  return (
    <section className="home-mindmaps" aria-label="Space mind maps">
      {isLoading && mindmaps.length === 0 ? (
        <div className="home-empty-state">
          <span className="home-empty-state__icon">
            <FiGitBranch aria-hidden="true" size={20} />
          </span>
          <h3>Loading mind maps</h3>
          <p>Fetching maps for {spaceName}…</p>
        </div>
      ) : null}

      {isError && mindmaps.length === 0 ? (
        <div className="home-empty-state">
          <span className="home-empty-state__icon">
            <FiGitBranch aria-hidden="true" size={20} />
          </span>
          <h3>Couldn’t load mind maps</h3>
          <p>{errorMessage}</p>
          <button type="button" className="home-create-button" onClick={() => void refetch()}>
            <FiRefreshCw aria-hidden="true" size={15} />
            <span>Retry</span>
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && mindmaps.length === 0 ? (
        <div className="home-empty-state">
          <span className="home-empty-state__icon">
            <FiGitBranch aria-hidden="true" size={20} />
          </span>
          <h3>No mind maps yet</h3>
          <p>Generate a mind map for {spaceName} from the Mindmap page.</p>
        </div>
      ) : null}

      {mindmaps.length > 0 ? (
        <div className="home-mindmaps__grid">
          {mindmaps.map((mindmap) => (
            <MindmapCard key={mindmap.mindmapId} mindmap={mindmap} onSelect={setSelected} />
          ))}
        </div>
      ) : null}
    </section>
  );
};
