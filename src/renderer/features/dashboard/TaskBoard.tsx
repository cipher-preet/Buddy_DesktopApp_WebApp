import { useMemo } from 'react';
import {
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFlag,
} from 'react-icons/fi';

import { groupItemsByDate } from './homeMappers';
import { ItemActionsMenu } from './ItemActionsMenu';
import type { WorkspaceTask } from './homeTypes';

export type TaskFilter = 'all' | 'open' | 'done';

type TaskBoardProps = {
  tasks: WorkspaceTask[];
  filter: TaskFilter;
  completedTaskIds: Set<string>;
  openItemMenuId: string | null;
  searchHitId: string | null;
  onToggle: (taskId: string) => void;
  onMenuChange: (menuId: string | null) => void;
  onEdit: (task: WorkspaceTask) => void;
  onDelete: (task: WorkspaceTask) => void;
};

export const TaskBoard = ({
  tasks,
  filter,
  completedTaskIds,
  openItemMenuId,
  searchHitId,
  onToggle,
  onMenuChange,
  onEdit,
  onDelete,
}: TaskBoardProps) => {
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const isDone = completedTaskIds.has(task.id);
      if (filter === 'open' && isDone) {
        return false;
      }
      if (filter === 'done' && !isDone) {
        return false;
      }
      return true;
    });
  }, [completedTaskIds, filter, tasks]);

  const groups = useMemo(() => groupItemsByDate(filteredTasks), [filteredTasks]);

  if (groups.length === 0) {
    return (
      <div className="task-board__empty">
        <FiCheckCircle aria-hidden="true" size={22} />
        <p>{filter === 'done' ? 'No completed tasks yet.' : 'All caught up — nothing open here.'}</p>
      </div>
    );
  }

  return (
    <div className="board-date-stack">
      {groups.map((group) => (
        <section className="board-date-group" key={group.key} aria-label={group.label}>
          <div className="board-date-separator" role="separator" aria-label={group.label}>
            <span />
            <strong>{group.label}</strong>
            <span />
          </div>

          <div className="task-board">
            <div className="task-group__list">
              {group.items.map((task) => {
                const isDone = completedTaskIds.has(task.id);
                const menuId = `task:${task.id}`;
                const isMenuOpen = openItemMenuId === menuId;

                return (
                  <article
                    className={`task-card${isMenuOpen ? ' is-menu-open' : ''}${
                      searchHitId === task.id ? ' is-search-hit' : ''
                    }`}
                    data-status={isDone ? 'done' : task.status}
                    data-priority={task.priority}
                    data-search-id={task.id}
                    key={task.id}
                  >
                    <label
                      className="task-card__toggle"
                      aria-label={`Mark ${task.title} ${isDone ? 'open' : 'done'}`}
                    >
                      <input type="checkbox" checked={isDone} onChange={() => onToggle(task.id)} />
                      <span>
                        <FiCheck aria-hidden="true" size={12} strokeWidth={3} />
                      </span>
                    </label>

                    <div className="task-card__content">
                      <h3>{task.title}</h3>
                      {task.description ? <p>{task.description}</p> : null}
                      <div className="task-card__meta">
                        <span className="task-card__due" data-tone={isDone ? 'none' : task.dueDateTone}>
                          <FiCalendar aria-hidden="true" size={12} />
                          {task.dueDate}
                        </span>
                        <span className="task-card__priority" data-priority={task.priority}>
                          <FiFlag aria-hidden="true" size={12} />
                          {task.priority}
                        </span>
                        <span className="task-card__created">
                          <FiClock aria-hidden="true" size={12} />
                          {task.createdAtLabel}
                        </span>
                      </div>
                    </div>

                    <div className="task-card__aside">
                      <ItemActionsMenu
                        itemLabel={task.title}
                        isOpen={isMenuOpen}
                        onOpen={() => onMenuChange(menuId)}
                        onClose={() => onMenuChange(null)}
                        onEdit={() => {
                          onMenuChange(null);
                          onEdit(task);
                        }}
                        onDelete={() => {
                          onMenuChange(null);
                          onDelete(task);
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
