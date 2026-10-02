import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiFilter } from 'react-icons/fi';
import type { TaskFilter } from './TaskBoard';

const FILTER_LABELS: Record<TaskFilter, string> = {
  all: 'All',
  open: 'Open',
  done: 'Done',
};

type TaskFilterMenuProps = {
  value: TaskFilter;
  counts: Record<TaskFilter, number>;
  onChange: (filter: TaskFilter) => void;
};

export const TaskFilterMenu = ({ value, counts, onChange }: TaskFilterMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`task-filter-menu${isOpen ? ' is-open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="task-filter-menu__trigger"
        aria-label={`Filter tasks: ${FILTER_LABELS[value]}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        data-filtered={value !== 'all' ? 'true' : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <FiFilter aria-hidden="true" size={14} />
        <span className="task-filter-menu__label">{FILTER_LABELS[value]}</span>
        <FiChevronDown aria-hidden="true" size={14} className="task-filter-menu__chevron" />
      </button>

      {isOpen ? (
        <div className="item-actions-menu__panel task-filter-menu__panel" role="menu" aria-label="Filter tasks">
          {(Object.keys(FILTER_LABELS) as TaskFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              role="menuitemradio"
              aria-checked={value === filter}
              className="item-actions-menu__option task-filter-menu__option"
              data-active={value === filter ? 'true' : undefined}
              onClick={() => {
                onChange(filter);
                setIsOpen(false);
              }}
            >
              <span className="task-filter-menu__check">
                {value === filter ? <FiCheck aria-hidden="true" size={14} /> : null}
              </span>
              {FILTER_LABELS[filter]}
              <span className="task-filter-menu__count">{counts[filter]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
