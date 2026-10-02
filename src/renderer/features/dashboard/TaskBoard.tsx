import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiClock,
  FiFlag,
  FiInbox,
  FiSun,
} from 'react-icons/fi';

import { ItemActionsMenu } from './ItemActionsMenu';
import type { WorkspaceTask } from './homeTypes';

export type TaskFilter = 'all' | 'open' | 'done';

type TaskGroupId = 'overdue' | 'today' | 'upcoming' | 'someday' | 'completed';

const GROUPS: Array<{ id: TaskGroupId; label: string; icon: IconType }> = [
  { id: 'overdue', label: 'Overdue', icon: FiAlertTriangle },
  { id: 'today', label: 'Today', icon: FiSun },
  { id: 'upcoming', label: 'Upcoming', icon: FiCalendar },
  { id: 'someday', label: 'No due date', icon: FiInbox },
  { id: 'completed', label: 'Completed', icon: FiCheckCircle },
];

const LONG_DESCRIPTION = 160;

const groupFor = (task: WorkspaceTask, isDone: boolean): TaskGroupId => {
  if (isDone) return 'completed';
  if (task.dueDateTone === 'overdue') return 'overdue';
  if (task.dueDateTone === 'today') return 'today';
  if (task.dueDateTone === 'none') return 'someday';
  return 'upcoming';
};

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskGroupId>>(() => new Set());

  const groups = useMemo(() => {
    const buckets = new Map<TaskGroupId, WorkspaceTask[]>();
    for (const task of tasks) {
      const isDone = completedTaskIds.has(task.id);
      if ((filter === 'open' && isDone) || (filter === 'done' && !isDone)) {
        continue;
      }
      const id = groupFor(task, isDone);
      const list = buckets.get(id) ?? [];
      list.push(task);
      buckets.set(id, list);
    }
    return GROUPS.filter((group) => buckets.has(group.id)).map((group) => ({
      ...group,
      tasks: buckets.get(group.id) ?? [],
    }));
  }, [completedTaskIds, filter, tasks]);

  useEffect(() => {
    const hit = searchHitId ? tasks.find((task) => task.id === searchHitId) : undefined;
    if (!hit) {
      return;
    }
    const groupId = groupFor(hit, completedTaskIds.has(hit.id));
    setCollapsedGroups((current) => {
      if (!current.has(groupId)) {
        return current;
      }
      const next = new Set(current);
      next.delete(groupId);
      return next;
    });
  }, [completedTaskIds, searchHitId, tasks]);

  const toggleSet = <T,>(setter: (update: (current: Set<T>) => Set<T>) => void, value: T) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });

  if (groups.length === 0) {
    return (
      <div className="task-board__empty">
        <FiCheckCircle aria-hidden="true" size={22} />
        <p>{filter === 'done' ? 'No completed tasks yet.' : 'All caught up — nothing open here.'}</p>
      </div>
    );
  }

  return (
    <div className="task-board">
      {groups.map((group) => {
        const Icon = group.icon;
        const isCollapsed = collapsedGroups.has(group.id);
        return (
          <section className="task-group" data-group={group.id} key={group.id}>
            <button
              className="task-group__header"
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => toggleSet(setCollapsedGroups, group.id)}
            >
              <span className="task-group__icon">
                <Icon aria-hidden="true" size={14} />
              </span>
              <span className="task-group__label">{group.label}</span>
              <span className="task-group__count">{group.tasks.length}</span>
              <FiChevronDown className="task-group__chevron" aria-hidden="true" size={16} />
            </button>

            {!isCollapsed ? (
              <div className="task-group__list">
                {group.tasks.map((task) => {
                  const isDone = completedTaskIds.has(task.id);
                  const menuId = `task:${task.id}`;
                  const isMenuOpen = openItemMenuId === menuId;
                  const isLong = task.description.length > LONG_DESCRIPTION;
                  const isExpanded = expandedIds.has(task.id);

                  return (
                    <article
                      className={`task-card${isMenuOpen ? ' is-menu-open' : ''}${searchHitId === task.id ? ' is-search-hit' : ''}`}
                      data-status={isDone ? 'done' : task.status}
                      data-priority={task.priority}
                      data-search-id={task.id}
                      key={task.id}
                    >
                      <label className="task-card__toggle" aria-label={`Mark ${task.title} ${isDone ? 'open' : 'done'}`}>
                        <input type="checkbox" checked={isDone} onChange={() => onToggle(task.id)} />
                        <span>
                          <FiCheck aria-hidden="true" size={12} strokeWidth={3} />
                        </span>
                      </label>

                      <div className="task-card__content">
                        <h3>{task.title}</h3>
                        {task.description ? (
                          <p className={isLong && !isExpanded ? 'is-clamped' : undefined}>{task.description}</p>
                        ) : null}
                        {isLong ? (
                          <button
                            className="task-card__more"
                            type="button"
                            onClick={() => toggleSet(setExpandedIds, task.id)}
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        ) : null}
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
            ) : null}
          </section>
        );
      })}
    </div>
  );
};
