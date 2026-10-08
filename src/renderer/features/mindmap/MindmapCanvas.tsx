import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import {
  FiEye,
  FiEyeOff,
  FiMaximize2,
  FiMinus,
  FiPlus,
} from 'react-icons/fi';

import { useToast } from '@/app/ToastProvider';
import {
  useRemoveMindmapNodeMutation,
  type MindmapGraphPayload,
} from '@/services/mindmapApi';

import { MindmapEditProvider } from './MindmapEditContext';
import type { MindmapCardData } from './mindmapTypes';
import { mindmapNodeTypes } from './MindmapNodes';

const MindmapCanvasControls = ({
  showGrid,
  onToggleGrid,
}: {
  showGrid: boolean;
  onToggleGrid: () => void;
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="mindmap-controls mindmap-controls--right" aria-label="Canvas controls">
      <button type="button" aria-label="Zoom in" onClick={() => zoomIn({ duration: 180 })}>
        <FiPlus aria-hidden="true" size={18} />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => zoomOut({ duration: 180 })}>
        <FiMinus aria-hidden="true" size={18} />
      </button>
      <button
        type="button"
        aria-label="Fit map to screen"
        onClick={() => fitView({ padding: 0.18, duration: 280 })}
      >
        <FiMaximize2 aria-hidden="true" size={17} />
      </button>
      <button type="button" aria-label={showGrid ? 'Hide grid' : 'Show grid'} onClick={onToggleGrid}>
        {showGrid ? <FiEyeOff aria-hidden="true" size={17} /> : <FiEye aria-hidden="true" size={17} />}
      </button>
    </div>
  );
};

export const MindmapCanvas = ({
  canvasKey,
  mindmapId,
  graph,
}: {
  canvasKey: string;
  mindmapId?: string | null;
  graph: MindmapGraphPayload;
}) => {
  const { showToast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MindmapCardData>>(graph.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges ?? []);
  const [showGrid, setShowGrid] = useState(true);
  const { fitView } = useReactFlow();
  const [removeMindmapNode] = useRemoveMindmapNodeMutation();

  useEffect(() => {
    setNodes(graph.nodes ?? []);
    setEdges(graph.edges ?? []);
    const frame = window.requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 280 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [graph, setNodes, setEdges, fitView]);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      pathOptions: { borderRadius: 28 },
    }),
    [],
  );

  const toggleGrid = useCallback(() => {
    setShowGrid((value) => !value);
  }, []);

  const removeNode = useCallback(
    async (nodeId: string) => {
      if (!mindmapId) {
        setNodes((current) => current.filter((node) => node.id !== nodeId));
        setEdges((current) =>
          current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        );
        return;
      }

      try {
        const updated = await removeMindmapNode({ mindmapId, nodeId }).unwrap();
        const nextGraph = updated.graph ?? { nodes: [], edges: [] };
        setNodes(Array.isArray(nextGraph.nodes) ? nextGraph.nodes : []);
        setEdges(Array.isArray(nextGraph.edges) ? nextGraph.edges : []);
      } catch (error) {
        showToast({
          message:
            error instanceof Error ? error.message : 'Unable to update mind map on the server.',
          type: 'error',
        });
        throw error;
      }
    },
    [mindmapId, removeMindmapNode, setEdges, setNodes, showToast],
  );

  const editContext = useMemo(
    () => ({
      mindmapId: mindmapId ?? null,
      removeNode,
    }),
    [mindmapId, removeNode],
  );

  return (
    <MindmapEditProvider value={editContext}>
      <ReactFlow
        key={canvasKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={mindmapNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 0 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodeDragThreshold={0}
        panOnScroll
        panOnScrollSpeed={1.15}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        panOnDrag
        selectionOnDrag={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        elevateNodesOnSelect
        onlyRenderVisibleElements
        preventScrolling
        proOptions={{ hideAttribution: true }}
        className="mindmap-flow"
      >
        {showGrid ? (
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#c5cad3" />
        ) : null}
        <MindmapCanvasControls showGrid={showGrid} onToggleGrid={toggleGrid} />
      </ReactFlow>
    </MindmapEditProvider>
  );
};
