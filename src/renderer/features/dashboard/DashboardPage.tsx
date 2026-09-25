import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiFileText,
  FiFolder,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { usePlanGate } from '@/features/settings/PlanGateProvider';
import {
  useCreateSpaceMutation,
  useCreateStagedNoteMutation,
  useCreateStagedTaskMutation,
  useDeleteSpaceMutation,
  useDeleteStagedNoteMutation,
  useDeleteStagedTaskMutation,
  useGetSpaceNotesInfiniteQuery,
  useGetSpaceTasksInfiniteQuery,
  useGetUserSpacesInfiniteQuery,
  useSetStagedTaskStatusMutation,
  useUpdateSpaceMutation,
  useUpdateStagedNoteMutation,
  useUpdateStagedTaskMutation,
} from '@/services/homeApi';

import { ItemActionsMenu } from './ItemActionsMenu';
import type { WorkspaceNote, WorkspaceSpace, WorkspaceTask } from './homeTypes';
import {
  ConfirmDeleteModal,
  CreateNoteModal,
  CreateSpaceModal,
  CreateTaskModal,
} from './WorkspaceCreateModals';

type ActiveSection = 'tasks' | 'notes';
type CreateModal = 'space' | 'task' | 'note' | null;
type HomeSectionFocus = 'notes' | 'tasks' | 'spaces';
type EditTarget =
  | { kind: 'space'; space: WorkspaceSpace }
  | { kind: 'task'; task: WorkspaceTask }
  | { kind: 'note'; note: WorkspaceNote }
  | null;
type DeleteTarget =
  | { kind: 'space'; id: string; label: string }
  | { kind: 'task'; id: string; label: string; spaceId: string }
  | { kind: 'note'; id: string; label: string; spaceId: string }
  | null;

type DashboardPageProps = {
  focusSection?: HomeSectionFocus | null;
  onFocusHandled?: () => void;
};

const SPACES_PAGE_SIZE = 10;
const ITEMS_PAGE_SIZE = 10;
const TASK_STATUS_THROTTLE_MS = 450;

const statusLabel = {
  done: 'Done',
  open: 'Open',
  review: 'Review',
} as const;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const DashboardPage = ({ focusSection = null, onFocusHandled }: DashboardPageProps) => {
  const { showToast } = useToast();
  const { handleApiError } = usePlanGate();
  const userId = useAppSelector((state) => state.auth.user?.userId);

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('tasks');
  const [createModal, setCreateModal] = useState<CreateModal>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const taskStatusTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const taskStatusPendingRef = useRef<Map<string, boolean>>(new Map());

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

  useEffect(() => {
    if (!spaces.length) {
      return;
    }

    setSelectedSpaceId((current) => {
      if (current && spaces.some((space) => space.id === current)) {
        return current;
      }

      return spaces[0].id;
    });
  }, [spaces]);

  useEffect(() => {
    if (!focusSection) {
      return;
    }

    if (focusSection === 'notes' || focusSection === 'tasks') {
      setActiveSection(focusSection);
    }

    onFocusHandled?.();
  }, [focusSection, onFocusHandled]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spaces],
  );

  const shouldLoadTasks = Boolean(userId && selectedSpace?.id && activeSection === 'tasks');
  const shouldLoadNotes = Boolean(userId && selectedSpace?.id && activeSection === 'notes');

  const {
    data: tasksData,
    isLoading: isTasksLoading,
    isFetching: isTasksFetching,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
    fetchNextPage: fetchNextTasksPage,
    hasNextPage: hasMoreTasks,
    isFetchingNextPage: isFetchingMoreTasks,
  } = useGetSpaceTasksInfiniteQuery(
    {
      userId: userId || '',
      spaceId: selectedSpace?.id || '',
      limit: ITEMS_PAGE_SIZE,
    },
    { skip: !shouldLoadTasks },
  );

  const {
    data: notesData,
    isLoading: isNotesLoading,
    isFetching: isNotesFetching,
    isError: isNotesError,
    error: notesError,
    refetch: refetchNotes,
    fetchNextPage: fetchNextNotesPage,
    hasNextPage: hasMoreNotes,
    isFetchingNextPage: isFetchingMoreNotes,
  } = useGetSpaceNotesInfiniteQuery(
    {
      userId: userId || '',
      spaceId: selectedSpace?.id || '',
      limit: ITEMS_PAGE_SIZE,
    },
    { skip: !shouldLoadNotes },
  );

  const tasks = useMemo(() => tasksData?.pages.flatMap((page) => page.tasks) ?? [], [tasksData]);
  const notes = useMemo(() => notesData?.pages.flatMap((page) => page.notes) ?? [], [notesData]);

  useEffect(() => {
    setCompletedTaskIds(() => {
      const next = new Set<string>();
      for (const task of tasks) {
        const pending = taskStatusPendingRef.current.get(task.id);
        const isDone = pending ?? task.status === 'done';
        if (isDone) {
          next.add(task.id);
        }
      }
      return next;
    });
  }, [tasks]);

  useEffect(() => {
    return () => {
      for (const timer of taskStatusTimersRef.current.values()) {
        clearTimeout(timer);
      }
      taskStatusTimersRef.current.clear();
    };
  }, []);

  const [createSpace] = useCreateSpaceMutation();
  const [createTask] = useCreateStagedTaskMutation();
  const [createNote] = useCreateStagedNoteMutation();
  const [updateSpace] = useUpdateSpaceMutation();
  const [updateTask] = useUpdateStagedTaskMutation();
  const [updateNote] = useUpdateStagedNoteMutation();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [deleteTask] = useDeleteStagedTaskMutation();
  const [deleteNote] = useDeleteStagedNoteMutation();
  const [setTaskStatus] = useSetStagedTaskStatusMutation();

  const toggleTaskCompletion = (taskId: string) => {
    if (!selectedSpace) {
      return;
    }

    const spaceId = selectedSpace.id;
    const nextDone = !completedTaskIds.has(taskId);

    setCompletedTaskIds((currentTaskIds) => {
      const nextTaskIds = new Set(currentTaskIds);
      if (nextDone) {
        nextTaskIds.add(taskId);
      } else {
        nextTaskIds.delete(taskId);
      }
      return nextTaskIds;
    });

    taskStatusPendingRef.current.set(taskId, nextDone);

    const existingTimer = taskStatusTimersRef.current.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      taskStatusTimersRef.current.delete(taskId);
      const done = taskStatusPendingRef.current.get(taskId);
      if (typeof done !== 'boolean') {
        return;
      }

      void setTaskStatus({ taskId, spaceId, done })
        .unwrap()
        .then(() => {
          taskStatusPendingRef.current.delete(taskId);
        })
        .catch((error) => {
          taskStatusPendingRef.current.delete(taskId);
          setCompletedTaskIds((currentTaskIds) => {
            const nextTaskIds = new Set(currentTaskIds);
            if (done) {
              nextTaskIds.delete(taskId);
            } else {
              nextTaskIds.add(taskId);
            }
            return nextTaskIds;
          });
          showToast({
            message: getErrorMessage(error, 'Unable to update task status.'),
            type: 'error',
          });
        });
    }, TASK_STATUS_THROTTLE_MS);

    taskStatusTimersRef.current.set(taskId, timer);
  };

  const handleCreateSpace = async (payload: { name: string; description: string }) => {
    if (!userId || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      const result = await createSpace({
        userId,
        spacename: payload.name.trim(),
        description: payload.description.trim(),
      }).unwrap();

      setSelectedSpaceId(null);
      setCreateModal(null);
      setActiveSection('tasks');
      showToast({
        message: result.message || 'Space created successfully',
        type: 'success',
      });
    } catch (error) {
      if (handleApiError(error, getErrorMessage(error, 'Unable to create space'))) {
        setCreateModal(null);
        return;
      }
      showToast({
        message: getErrorMessage(error, 'Unable to create space'),
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTask = async (payload: {
    title: string;
    description: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
  }) => {
    if (!selectedSpace || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      const result = await createTask({
        spaceId: selectedSpace.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        date: payload.dueDate || undefined,
        priority: payload.priority,
      }).unwrap();

      setActiveSection('tasks');
      setCreateModal(null);
      showToast({
        message: result.message || 'Task saved.',
        type: 'success',
      });
    } catch (error) {
      if (handleApiError(error, getErrorMessage(error, 'Unable to save task.'))) {
        setCreateModal(null);
        return;
      }
      showToast({
        message: getErrorMessage(error, 'Unable to save task.'),
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNote = async (payload: { title: string; description: string }) => {
    if (!selectedSpace || isCreating) {
      return;
    }

    setIsCreating(true);
    try {
      const result = await createNote({
        spaceId: selectedSpace.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
      }).unwrap();

      setActiveSection('notes');
      setCreateModal(null);
      showToast({
        message: result.message || 'Note saved.',
        type: 'success',
      });
    } catch (error) {
      if (handleApiError(error, getErrorMessage(error, 'Unable to save note.'))) {
        setCreateModal(null);
        return;
      }
      showToast({
        message: getErrorMessage(error, 'Unable to save note.'),
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSpace = async (payload: { name: string; description: string }) => {
    if (!editTarget || editTarget.kind !== 'space' || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      const result = await updateSpace({
        spaceId: editTarget.space.id,
        spacename: payload.name.trim(),
        description: payload.description.trim() || undefined,
      }).unwrap();

      setEditTarget(null);
      showToast({
        message: result.message || 'Space updated.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: getErrorMessage(error, 'Unable to update space.'),
        type: 'error',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateTask = async (payload: {
    title: string;
    description: string;
    dueDate: string;
    priority: 'High' | 'Medium' | 'Low';
  }) => {
    if (!editTarget || editTarget.kind !== 'task' || !selectedSpace || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      const result = await updateTask({
        taskId: editTarget.task.id,
        spaceId: selectedSpace.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
        date: payload.dueDate || undefined,
        priority: payload.priority,
      }).unwrap();

      setEditTarget(null);
      showToast({
        message: result.message || 'Task updated.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: getErrorMessage(error, 'Unable to update task.'),
        type: 'error',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateNote = async (payload: { title: string; description: string }) => {
    if (!editTarget || editTarget.kind !== 'note' || !selectedSpace || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      const result = await updateNote({
        noteId: editTarget.note.id,
        spaceId: selectedSpace.id,
        title: payload.title.trim(),
        description: payload.description.trim(),
      }).unwrap();

      setEditTarget(null);
      showToast({
        message: result.message || 'Note updated.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: getErrorMessage(error, 'Unable to update note.'),
        type: 'error',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      if (deleteTarget.kind === 'space') {
        const result = await deleteSpace({ spaceId: deleteTarget.id }).unwrap();
        if (selectedSpaceId === deleteTarget.id) {
          setSelectedSpaceId(null);
        }
        showToast({
          message: result.message || 'Space deleted.',
          type: 'success',
        });
      } else if (deleteTarget.kind === 'task') {
        const result = await deleteTask({
          taskId: deleteTarget.id,
          spaceId: deleteTarget.spaceId,
        }).unwrap();
        showToast({
          message: result.message || 'Task deleted.',
          type: 'success',
        });
      } else {
        const result = await deleteNote({
          noteId: deleteTarget.id,
          spaceId: deleteTarget.spaceId,
        }).unwrap();
        showToast({
          message: result.message || 'Note deleted.',
          type: 'success',
        });
      }

      setDeleteTarget(null);
      setOpenItemMenuId(null);
    } catch (error) {
      showToast({
        message: getErrorMessage(error, 'Unable to delete item.'),
        type: 'error',
      });
    } finally {
      setIsMutating(false);
    }
  };

  const spacesErrorMessage = getErrorMessage(spacesError, 'Unable to load spaces');
  const tasksErrorMessage = getErrorMessage(tasksError, 'Unable to load tasks');
  const notesErrorMessage = getErrorMessage(notesError, 'Unable to load notes');

  const showTasksInitialLoading = shouldLoadTasks && isTasksLoading && tasks.length === 0;
  const showNotesInitialLoading = shouldLoadNotes && isNotesLoading && notes.length === 0;

  return (
    <section className="home-workspace" aria-label="Home workspace">
      <aside className="spaces-panel" aria-label="Spaces">
        <div className="spaces-panel__header">
          <div>
            <p>Workspace</p>
            <h2>Spaces</h2>
          </div>
          <button type="button" aria-label="Create space" onClick={() => setCreateModal('space')}>
            <FiPlus aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="spaces-list">
          {!userId ? (
            <div className="home-inline-state" role="alert">
              <FiAlertCircle aria-hidden="true" size={16} />
              <p>Sign in again to load your spaces.</p>
            </div>
          ) : null}

          {userId && isSpacesLoading && spaces.length === 0 ? (
            <div className="home-inline-state" aria-busy="true">
              <span className="home-spinner" />
              <p>Loading spaces…</p>
            </div>
          ) : null}

          {userId && isSpacesError && spaces.length === 0 ? (
            <div className="home-inline-state home-inline-state--error" role="alert">
              <FiAlertCircle aria-hidden="true" size={16} />
              <p>{spacesErrorMessage}</p>
              <button type="button" className="home-retry-button" onClick={() => void refetchSpaces()}>
                <FiRefreshCw aria-hidden="true" size={14} />
                Retry
              </button>
            </div>
          ) : null}

          {userId && !isSpacesLoading && !isSpacesError && spaces.length === 0 ? (
            <div className="home-inline-state">
              <FiFolder aria-hidden="true" size={16} />
              <p>No spaces yet. Create one to get started.</p>
            </div>
          ) : null}

          {spaces.map((space) => {
            const menuId = `space:${space.id}`;
            const isMenuOpen = openItemMenuId === menuId;

            return (
              <div
                className={`space-item${isMenuOpen ? ' is-menu-open' : ''}`}
                data-active={space.id === selectedSpace?.id ? 'true' : undefined}
                key={space.id}
              >
                <button
                  className="space-item__select"
                  type="button"
                  onClick={() => {
                    setSelectedSpaceId(space.id);
                    setOpenItemMenuId(null);
                  }}
                >
                  <span className="space-item__icon">
                    <FiFolder aria-hidden="true" size={17} />
                  </span>
                  <span className="space-item__content">
                    <strong>{space.name}</strong>
                    <small>
                      {space.tasksCount} {space.tasksCount === 1 ? 'task' : 'tasks'} ·{' '}
                      {space.notesCount} {space.notesCount === 1 ? 'note' : 'notes'} ·{' '}
                      {space.updatedAtLabel}
                    </small>
                  </span>
                </button>
                <ItemActionsMenu
                  itemLabel={space.name}
                  isOpen={isMenuOpen}
                  onOpen={() => setOpenItemMenuId(menuId)}
                  onClose={() => setOpenItemMenuId(null)}
                  onEdit={() => {
                    setOpenItemMenuId(null);
                    setEditTarget({ kind: 'space', space });
                  }}
                  onDelete={() => {
                    setOpenItemMenuId(null);
                    setDeleteTarget({ kind: 'space', id: space.id, label: space.name });
                  }}
                />
              </div>
            );
          })}

          {hasMoreSpaces ? (
            <button
              className="home-load-more"
              type="button"
              disabled={isFetchingMoreSpaces}
              onClick={() => void fetchNextSpacesPage()}
            >
              {isFetchingMoreSpaces ? 'Loading…' : 'Load more spaces'}
            </button>
          ) : null}

          {isSpacesFetching && !isSpacesLoading && !isFetchingMoreSpaces ? (
            <p className="home-sync-hint">Refreshing…</p>
          ) : null}
        </div>
      </aside>

      <div className="space-detail">
        {!selectedSpace ? (
          <div className="home-empty-state home-empty-state--panel">
            <span className="home-empty-state__icon">
              <FiFolder aria-hidden="true" size={20} />
            </span>
            <h3>Select a space</h3>
            <p>Choose a space from the left to view its tasks and notes.</p>
          </div>
        ) : (
          <>
            <div className="space-detail__toolbar">
              <div
                className={`space-switch${activeSection === 'notes' ? ' is-notes' : ' is-tasks'}`}
                role="tablist"
                aria-label="Space content"
              >
                <span className="space-switch__thumb" aria-hidden="true" />
                <button
                  className="space-switch__button"
                  data-active={activeSection === 'tasks' ? 'true' : undefined}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === 'tasks'}
                  onClick={() => {
                    setActiveSection('tasks');
                    setOpenItemMenuId(null);
                  }}
                >
                  Tasks
                </button>
                <button
                  className="space-switch__button"
                  data-active={activeSection === 'notes' ? 'true' : undefined}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === 'notes'}
                  onClick={() => {
                    setActiveSection('notes');
                    setOpenItemMenuId(null);
                  }}
                >
                  Notes
                </button>
              </div>

              {activeSection === 'tasks' ? (
                <button className="home-create-button" type="button" onClick={() => setCreateModal('task')}>
                  <FiPlus aria-hidden="true" size={15} />
                  New task
                </button>
              ) : (
                <button className="home-create-button" type="button" onClick={() => setCreateModal('note')}>
                  <FiPlus aria-hidden="true" size={15} />
                  New note
                </button>
              )}
            </div>

            <div className="space-sections">
              {activeSection === 'tasks' ? (
                <section className="workspace-card" aria-label="Tasks">
                  {showTasksInitialLoading ? (
                    <div className="home-inline-state" aria-busy="true">
                      <span className="home-spinner" />
                      <p>Loading tasks…</p>
                    </div>
                  ) : null}

                  {isTasksError && tasks.length === 0 ? (
                    <div className="home-inline-state home-inline-state--error" role="alert">
                      <FiAlertCircle aria-hidden="true" size={16} />
                      <p>{tasksErrorMessage}</p>
                      <button type="button" className="home-retry-button" onClick={() => void refetchTasks()}>
                        <FiRefreshCw aria-hidden="true" size={14} />
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!showTasksInitialLoading && !isTasksError && tasks.length === 0 ? (
                    <div className="home-empty-state">
                      <span className="home-empty-state__icon">
                        <FiCalendar aria-hidden="true" size={20} />
                      </span>
                      <h3>No tasks yet</h3>
                      <p>Create a task manually to track work inside {selectedSpace.name}.</p>
                      <button className="home-create-button" type="button" onClick={() => setCreateModal('task')}>
                        <FiPlus aria-hidden="true" size={15} />
                        New task
                      </button>
                    </div>
                  ) : null}

                  {tasks.length > 0 ? (
                    <>
                      <div className="task-stack">
                        {tasks.map((task) => {
                          const isDone = completedTaskIds.has(task.id);
                          const menuId = `task:${task.id}`;
                          const isMenuOpen = openItemMenuId === menuId;

                          return (
                            <article
                              className={`task-card${isMenuOpen ? ' is-menu-open' : ''}`}
                              data-status={isDone ? 'done' : task.status}
                              key={task.id}
                            >
                              <label className="task-card__toggle" aria-label={`Mark ${task.title} done`}>
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => toggleTaskCompletion(task.id)}
                                />
                                <span />
                              </label>
                              <div className="task-card__content">
                                <h3>{task.title}</h3>
                                {task.description ? <p>{task.description}</p> : null}
                                <div className="task-card__meta">
                                  <span
                                    className="task-card__due"
                                    data-tone={task.dueDateTone}
                                  >
                                    <FiCalendar aria-hidden="true" size={13} />
                                    {task.dueDate}
                                  </span>
                                  <span
                                    className="task-card__priority"
                                    data-priority={task.priority}
                                  >
                                    {task.priority}
                                  </span>
                                  <span className="task-card__created">
                                    {task.createdAtLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="task-card__aside">
                                <span className="task-card__status">
                                  {isDone ? 'Done' : statusLabel[task.status]}
                                </span>
                                <ItemActionsMenu
                                  itemLabel={task.title}
                                  isOpen={isMenuOpen}
                                  onOpen={() => setOpenItemMenuId(menuId)}
                                  onClose={() => setOpenItemMenuId(null)}
                                  onEdit={() => {
                                    setOpenItemMenuId(null);
                                    setEditTarget({ kind: 'task', task });
                                  }}
                                  onDelete={() => {
                                    setOpenItemMenuId(null);
                                    if (!selectedSpace) {
                                      return;
                                    }
                                    setDeleteTarget({
                                      kind: 'task',
                                      id: task.id,
                                      label: task.title,
                                      spaceId: selectedSpace.id,
                                    });
                                  }}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {hasMoreTasks ? (
                        <button
                          className="home-load-more home-load-more--panel"
                          type="button"
                          disabled={isFetchingMoreTasks}
                          onClick={() => void fetchNextTasksPage()}
                        >
                          {isFetchingMoreTasks ? 'Loading…' : 'Load more tasks'}
                        </button>
                      ) : null}

                      {isTasksFetching && !isTasksLoading && !isFetchingMoreTasks ? (
                        <p className="home-sync-hint">Refreshing tasks…</p>
                      ) : null}
                    </>
                  ) : null}
                </section>
              ) : (
                <section className="workspace-card" aria-label="Notes">
                  {showNotesInitialLoading ? (
                    <div className="home-inline-state" aria-busy="true">
                      <span className="home-spinner" />
                      <p>Loading notes…</p>
                    </div>
                  ) : null}

                  {isNotesError && notes.length === 0 ? (
                    <div className="home-inline-state home-inline-state--error" role="alert">
                      <FiAlertCircle aria-hidden="true" size={16} />
                      <p>{notesErrorMessage}</p>
                      <button type="button" className="home-retry-button" onClick={() => void refetchNotes()}>
                        <FiRefreshCw aria-hidden="true" size={14} />
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!showNotesInitialLoading && !isNotesError && notes.length === 0 ? (
                    <div className="home-empty-state">
                      <span className="home-empty-state__icon">
                        <FiFileText aria-hidden="true" size={20} />
                      </span>
                      <h3>No notes yet</h3>
                      <p>Capture ideas and decisions for {selectedSpace.name} with a manual note.</p>
                      <button className="home-create-button" type="button" onClick={() => setCreateModal('note')}>
                        <FiPlus aria-hidden="true" size={15} />
                        New note
                      </button>
                    </div>
                  ) : null}

                  {notes.length > 0 ? (
                    <>
                      <div className="notes-stack">
                        {notes.map((note) => {
                          const menuId = `note:${note.id}`;
                          const isMenuOpen = openItemMenuId === menuId;

                          return (
                            <article
                              className={`space-note${isMenuOpen ? ' is-menu-open' : ''}`}
                              key={note.id}
                            >
                              <span className="space-note__icon">
                                <FiFileText aria-hidden="true" size={16} />
                              </span>
                              <div className="space-note__body">
                                <div className="space-note__header">
                                  <h3>{note.title}</h3>
                                  <ItemActionsMenu
                                    itemLabel={note.title}
                                    isOpen={isMenuOpen}
                                    onOpen={() => setOpenItemMenuId(menuId)}
                                    onClose={() => setOpenItemMenuId(null)}
                                    onEdit={() => {
                                      setOpenItemMenuId(null);
                                      setEditTarget({ kind: 'note', note });
                                    }}
                                    onDelete={() => {
                                      setOpenItemMenuId(null);
                                      if (!selectedSpace) {
                                        return;
                                      }
                                      setDeleteTarget({
                                        kind: 'note',
                                        id: note.id,
                                        label: note.title,
                                        spaceId: selectedSpace.id,
                                      });
                                    }}
                                  />
                                </div>
                                {note.excerpt ? <p>{note.excerpt}</p> : null}
                                <div className="space-note__meta">
                                  <span>
                                    <FiCalendar aria-hidden="true" size={13} />
                                    {note.dateLabel}
                                  </span>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      {hasMoreNotes ? (
                        <button
                          className="home-load-more home-load-more--panel"
                          type="button"
                          disabled={isFetchingMoreNotes}
                          onClick={() => void fetchNextNotesPage()}
                        >
                          {isFetchingMoreNotes ? 'Loading…' : 'Load more notes'}
                        </button>
                      ) : null}

                      {isNotesFetching && !isNotesLoading && !isFetchingMoreNotes ? (
                        <p className="home-sync-hint">Refreshing notes…</p>
                      ) : null}
                    </>
                  ) : null}
                </section>
              )}
            </div>
          </>
        )}
      </div>

      {createModal === 'space' ? (
        <CreateSpaceModal
          isSubmitting={isCreating}
          onClose={() => {
            if (!isCreating) {
              setCreateModal(null);
            }
          }}
          onCreate={handleCreateSpace}
        />
      ) : null}
      {createModal === 'task' && selectedSpace ? (
        <CreateTaskModal
          spaceName={selectedSpace.name}
          isSubmitting={isCreating}
          onClose={() => {
            if (!isCreating) {
              setCreateModal(null);
            }
          }}
          onCreate={handleCreateTask}
        />
      ) : null}
      {createModal === 'note' && selectedSpace ? (
        <CreateNoteModal
          spaceName={selectedSpace.name}
          isSubmitting={isCreating}
          onClose={() => {
            if (!isCreating) {
              setCreateModal(null);
            }
          }}
          onCreate={handleCreateNote}
        />
      ) : null}

      {editTarget?.kind === 'space' ? (
        <CreateSpaceModal
          mode="edit"
          initialName={editTarget.space.name}
          initialDescription={editTarget.space.description}
          isSubmitting={isMutating}
          onClose={() => {
            if (!isMutating) {
              setEditTarget(null);
            }
          }}
          onCreate={handleUpdateSpace}
        />
      ) : null}

      {editTarget?.kind === 'task' && selectedSpace ? (
        <CreateTaskModal
          mode="edit"
          spaceName={selectedSpace.name}
          initialTitle={editTarget.task.title}
          initialDescription={editTarget.task.description}
          initialDueDate={editTarget.task.dueDateKey}
          initialPriority={editTarget.task.priority}
          isSubmitting={isMutating}
          onClose={() => {
            if (!isMutating) {
              setEditTarget(null);
            }
          }}
          onCreate={handleUpdateTask}
        />
      ) : null}

      {editTarget?.kind === 'note' && selectedSpace ? (
        <CreateNoteModal
          mode="edit"
          spaceName={selectedSpace.name}
          initialTitle={editTarget.note.title}
          initialDescription={editTarget.note.excerpt}
          isSubmitting={isMutating}
          onClose={() => {
            if (!isMutating) {
              setEditTarget(null);
            }
          }}
          onCreate={handleUpdateNote}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDeleteModal
          title={`Delete ${deleteTarget.kind}?`}
          description={`This will permanently remove “${deleteTarget.label}”. This can’t be undone.`}
          confirmLabel="Delete"
          isSubmitting={isMutating}
          onClose={() => {
            if (!isMutating) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </section>
  );
};
