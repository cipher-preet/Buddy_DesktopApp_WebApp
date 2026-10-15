import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  FiGlobe,
  FiMinusCircle,
  FiMoreVertical,
  FiTarget,
  FiTrash2,
} from 'react-icons/fi';
import { TbTelescope } from 'react-icons/tb';

import { useMindmapEdit } from './MindmapEditContext';
import type { MindmapCardData } from './mindmapTypes';

type MindmapNodeProps = NodeProps & {
  data: MindmapCardData;
};

const toneClass = (tone?: MindmapCardData['tone']) => (tone ? `mindmap-node--${tone}` : '');

const CardMenu = ({
  onClose,
  onRemoveFromMap,
  onDelete,
}: {
  onClose: () => void;
  onRemoveFromMap: () => void;
  onDelete: () => void;
}) => (
  <div className="mindmap-context-menu" role="menu" onMouseLeave={onClose}>
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        event.stopPropagation();
        onRemoveFromMap();
        onClose();
      }}
    >
      <FiMinusCircle aria-hidden="true" size={16} />
      Remove from map
    </button>
    <button
      type="button"
      role="menuitem"
      className="is-danger"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
        onClose();
      }}
    >
      <FiTrash2 aria-hidden="true" size={16} />
      Delete
    </button>
  </div>
);

const CardIcon = ({ title }: { title: string }) => {
  if (title.toLowerCase().includes('shift') || title.toLowerCase().includes('attendance')) {
    return <TbTelescope aria-hidden="true" size={16} />;
  }
  if (title.toLowerCase().includes('leave')) {
    return <FiGlobe aria-hidden="true" size={16} />;
  }
  return <FiTarget aria-hidden="true" size={16} />;
};

export const MindmapHubNode = memo(({ data, selected }: MindmapNodeProps) => (
  <div className={`mindmap-node mindmap-node--hub${selected ? ' is-selected' : ''}`}>
    <Handle type="source" position={Position.Top} className="mindmap-handle" />
    <Handle type="source" position={Position.Right} className="mindmap-handle" />
    <Handle type="source" position={Position.Bottom} className="mindmap-handle" />
    <Handle type="source" position={Position.Left} className="mindmap-handle" />
    <strong>{data.title}</strong>
    {data.subtitle ? <span>{data.subtitle}</span> : null}
  </div>
));

MindmapHubNode.displayName = 'MindmapHubNode';

export const MindmapBranchNode = memo(({ data, selected }: MindmapNodeProps) => (
  <div className={`mindmap-node mindmap-node--branch ${toneClass(data.tone)}${selected ? ' is-selected' : ''}`}>
    <Handle type="target" position={Position.Left} className="mindmap-handle" />
    <Handle type="source" position={Position.Right} className="mindmap-handle" />
    <Handle type="source" position={Position.Top} className="mindmap-handle" />
    <Handle type="source" position={Position.Bottom} className="mindmap-handle" />
    <span>{data.title}</span>
  </div>
));

MindmapBranchNode.displayName = 'MindmapBranchNode';

export const MindmapCardNode = memo(({ id, data, selected }: MindmapNodeProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { removeNode } = useMindmapEdit();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const persistRemove = useCallback(async () => {
    if (isUpdating) {
      return;
    }
    setIsUpdating(true);
    try {
      await removeNode(id);
    } finally {
      setIsUpdating(false);
    }
  }, [id, isUpdating, removeNode]);

  const variantClass =
    data.variant === 'alert'
      ? ' mindmap-node--alert'
      : data.variant === 'compact'
        ? ' mindmap-node--compact'
        : data.variant === 'priority'
          ? ' mindmap-node--priority'
          : '';

  return (
    <div
      className={`mindmap-node mindmap-node--card ${toneClass(data.tone)}${variantClass}${
        selected ? ' is-selected' : ''
      }${data.noteCount ? ' has-note-count' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="mindmap-handle" />
      <Handle type="source" position={Position.Right} className="mindmap-handle" />

      <header className="mindmap-node__header">
        <div className="mindmap-node__title-row">
          <span className="mindmap-node__icon">
            <CardIcon title={data.title} />
          </span>
          <strong>{data.title}</strong>
        </div>
        <button
          type="button"
          className="mindmap-node__menu-trigger"
          aria-label={`Actions for ${data.title}`}
          aria-expanded={menuOpen}
          disabled={isUpdating}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <FiMoreVertical aria-hidden="true" size={16} />
        </button>
        {menuOpen ? (
          <CardMenu
            onClose={closeMenu}
            onRemoveFromMap={() => {
              void persistRemove();
            }}
            onDelete={() => {
              void persistRemove();
            }}
          />
        ) : null}
      </header>

      {data.items?.length ? (
        <ul className="mindmap-node__list">
          {data.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {data.prioritySections?.length ? (
        <div className="mindmap-node__priority-groups">
          {data.prioritySections.map((section) => (
            <section key={section.label} className={`mindmap-priority mindmap-priority--${section.tone}`}>
              <h4>{section.label}</h4>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {data.tags?.length || data.noteCount ? (
        <footer className="mindmap-node__footer">
          <div className="mindmap-node__tags">
            {data.tags?.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {data.noteCount ? <span className="mindmap-node__note-count">{data.noteCount} Notes</span> : null}
          <div className="mindmap-node__avatars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </footer>
      ) : null}
    </div>
  );
});

MindmapCardNode.displayName = 'MindmapCardNode';

export const MindmapJunctionNode = memo(() => (
  <div className="mindmap-junction" aria-hidden="true">
    <Handle type="target" position={Position.Left} className="mindmap-handle mindmap-handle--junction" />
    <Handle type="source" position={Position.Right} className="mindmap-handle mindmap-handle--junction" />
    <span>···</span>
  </div>
));

MindmapJunctionNode.displayName = 'MindmapJunctionNode';

export const MindmapNode = memo((props: MindmapNodeProps) => {
  const { data } = props;

  if (data.kind === 'hub') {
    return <MindmapHubNode {...props} />;
  }

  if (data.kind === 'branch') {
    return <MindmapBranchNode {...props} />;
  }

  if (data.kind === 'junction') {
    return <MindmapJunctionNode />;
  }

  return <MindmapCardNode {...props} />;
});

MindmapNode.displayName = 'MindmapNode';

export const mindmapNodeTypes = {
  mindmapNode: MindmapNode,
  mindmapJunction: MindmapJunctionNode,
};
