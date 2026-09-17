import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiFileText,
  FiFolder,
  FiPlus,
  FiRefreshCw,
  FiUser,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import {
  useCreateSpaceMutation,
  useCreateStagedNoteMutation,
  useCreateStagedTaskMutation,
  useGetSpaceNotesInfiniteQuery,
  useGetSpaceTasksInfiniteQuery,
  useGetUserSpacesInfiniteQuery,
} from '@/services/homeApi';

import {
  CreateNoteModal,
  CreateSpaceModal,
  CreateTaskModal,
} from './WorkspaceCreateModals';

type ActiveSection = 'tasks' | 'notes';
type CreateModal = 'space' | 'task' | 'note' | null;

const SPACES_PAGE_SIZE = 10;
const ITEMS_PAGE_SIZE = 10;

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

export const DashboardPage = () => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const userName = useAppSelector((state) => state.auth.user?.name) || 'You';

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('tasks');
  const [createModal, setCreateModal] = useState<CreateModal>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const [isCreating, setIsCreating] = useState(false);

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
    setCompletedTaskIds((current) => {
      const next = new Set(current);
      for (const task of tasks) {
        if (task.status === 'done') {
          next.add(task.id);
        }
      }
      return next;
    });
  }, [tasks]);

  const [createSpace] = useCreateSpaceMutation();
  const [createTask] = useCreateStagedTaskMutation();
  const [createNote] = useCreateStagedNoteMutation();

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds((currentTaskIds) => {
      const nextTaskIds = new Set(currentTaskIds);
      if (nextTaskIds.has(taskId)) {
        nextTaskIds.delete(taskId);
      } else {
        nextTaskIds.add(taskId);
      }
      return nextTaskIds;
    });
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
      }).unwrap();

      setActiveSection('tasks');
      setCreateModal(null);
      showToast({
        message: result.message || 'Task saved.',
        type: 'success',
      });
    } catch (error) {
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
      showToast({
        message: getErrorMessage(error, 'Unable to save note.'),
        type: 'error',
      });
    } finally {
      setIsCreating(false);
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

          {spaces.map((space) => (
            <button
              className="space-item"
              data-active={space.id === selectedSpace?.id ? 'true' : undefined}
              key={space.id}
              type="button"
              onClick={() => setSelectedSpaceId(space.id)}
            >
              <span className="space-item__icon">
                <FiFolder aria-hidden="true" size={17} />
              </span>
              <span className="space-item__content">
                <strong>{space.name}</strong>
                <small>
                  {space.tasksCount} {space.tasksCount === 1 ? 'task' : 'tasks'} · {space.updatedAtLabel}
                </small>
              </span>
            </button>
          ))}

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
              <div className="space-switch" role="tablist" aria-label="Space content">
                <button
                  className="space-switch__button"
                  data-active={activeSection === 'tasks' ? 'true' : undefined}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === 'tasks'}
                  onClick={() => setActiveSection('tasks')}
                >
                  Tasks
                </button>
                <button
                  className="space-switch__button"
                  data-active={activeSection === 'notes' ? 'true' : undefined}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === 'notes'}
                  onClick={() => setActiveSection('notes')}
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
                          const isDone = completedTaskIds.has(task.id) || task.status === 'done';

                          return (
                            <article
                              className="task-card"
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
                                  <span>
                                    <FiCalendar aria-hidden="true" size={13} />
                                    {task.dueDate}
                                  </span>
                                  <span>
                                    <FiUser aria-hidden="true" size={13} />
                                    {userName}
                                  </span>
                                  <span data-priority={task.priority}>{task.priority}</span>
                                </div>
                              </div>
                              <span className="task-card__status">
                                {isDone ? 'Done' : statusLabel[task.status]}
                              </span>
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
                        {notes.map((note) => (
                          <article className="space-note" key={note.id}>
                            <span className="space-note__icon">
                              <FiFileText aria-hidden="true" size={16} />
                            </span>
                            <div>
                              <h3>{note.title}</h3>
                              {note.excerpt ? <p>{note.excerpt}</p> : null}
                            </div>
                          </article>
                        ))}
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
    </section>
  );
};
