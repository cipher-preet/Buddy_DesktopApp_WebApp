import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  FiAlertCircle,
  FiCheckSquare,
  FiFileText,
  FiFolder,
  FiGrid,
  FiList,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import type { DashboardFocusTarget } from '@/features/search/searchTypes';
import { setShareSpace } from '@/features/share/shareSlice';
import { usePlanGate } from '@/features/settings/PlanGateProvider';
import {
  useCreateSpaceMutation,
  useCreateStagedNoteMutation,
  useCreateStagedTaskMutation,
  useDeleteSpaceMutation,
  useDeleteStagedNoteMutation,
  useDeleteStagedTaskMutation,
  useGetNoteByIdQuery,
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
import { NoteBoard, type NoteLayout } from './NoteBoard';
import { TaskBoard, type TaskFilter } from './TaskBoard';
import { TaskFilterMenu } from './TaskFilterMenu';
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
  focusTarget?: DashboardFocusTarget | null;
  onFocusTargetHandled?: () => void;
};

const SPACES_PAGE_SIZE = 10;
const ITEMS_PAGE_SIZE = 10;
/** Upper bound on extra pages fetched while locating a search result. */
const FOCUS_MAX_PAGE_LOADS = 30;
const SEARCH_HIGHLIGHT_MS = 2600;
const NOTE_LAYOUT_KEY = 'buddy.home.noteLayout';

const readNoteLayout = (): NoteLayout => {
  try {
    return localStorage.getItem(NOTE_LAYOUT_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
};
const TASK_STATUS_THROTTLE_MS = 450;

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

export const DashboardPage = ({
  focusSection = null,
  onFocusHandled,
  focusTarget = null,
  onFocusTargetHandled,
}: DashboardPageProps) => {
  const dispatch = useAppDispatch();
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
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [noteLayout, setNoteLayout] = useState<NoteLayout>(readNoteLayout);
  const [pendingFocus, setPendingFocus] = useState<DashboardFocusTarget | null>(null);
  const [searchHitId, setSearchHitId] = useState<string | null>(null);
  const focusLoadsRef = useRef({ spaces: 0, items: 0, refetched: false });

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

  useEffect(() => {
    if (selectedSpace) {
      dispatch(setShareSpace(selectedSpace));
      return;
    }

    // Only clear once the list has settled, so the Share tab doesn't flash empty while loading.
    if (!isSpacesLoading && !isSpacesFetching && spaces.length === 0) {
      dispatch(setShareSpace(null));
    }
  }, [dispatch, isSpacesFetching, isSpacesLoading, selectedSpace, spaces.length]);

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

  const taskCounts = useMemo(() => {
    const done = tasks.filter((task) => completedTaskIds.has(task.id)).length;
    return { all: tasks.length, open: tasks.length - done, done };
  }, [completedTaskIds, tasks]);

  const changeNoteLayout = (layout: NoteLayout) => {
    setNoteLayout(layout);
    try {
      localStorage.setItem(NOTE_LAYOUT_KEY, layout);
    } catch {
      // Layout preference is optional.
    }
  };

  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    focusLoadsRef.current = { spaces: 0, items: 0, refetched: false };
    setTaskFilter('all');
    setPendingFocus(focusTarget);
    if (focusTarget.section) {
      setActiveSection(focusTarget.section);
    }
    onFocusTargetHandled?.();
  }, [focusTarget, onFocusTargetHandled]);

  useEffect(() => {
    if (!pendingFocus) {
      return;
    }
    if (spaces.some((space) => space.id === pendingFocus.spaceId)) {
      setSelectedSpaceId(pendingFocus.spaceId);
      if (!pendingFocus.itemId) {
        setSearchHitId(pendingFocus.spaceId);
        setPendingFocus(null);
      }
      return;
    }
    if (isSpacesFetching) {
      return;
    }
    if (hasMoreSpaces && focusLoadsRef.current.spaces < FOCUS_MAX_PAGE_LOADS) {
      focusLoadsRef.current.spaces += 1;
      void fetchNextSpacesPage();
      return;
    }
    setPendingFocus(null);
    showToast({ message: 'That space is no longer available.', type: 'error' });
  }, [fetchNextSpacesPage, hasMoreSpaces, isSpacesFetching, pendingFocus, showToast, spaces]);

  useEffect(() => {
    if (!pendingFocus?.itemId || !pendingFocus.section) {
      return;
    }
    if (selectedSpace?.id !== pendingFocus.spaceId || activeSection !== pendingFocus.section) {
      return;
    }
    const isTasks = pendingFocus.section === 'tasks';
    const items: Array<{ id: string }> = isTasks ? tasks : notes;
    if (items.some((item) => item.id === pendingFocus.itemId)) {
      setSearchHitId(pendingFocus.itemId);
      setPendingFocus(null);
      return;
    }
    const isFetching = isTasks ? isTasksFetching : isNotesFetching;
    const isLoading = isTasks ? isTasksLoading : isNotesLoading;
    if (isFetching || isLoading) {
      return;
    }
    const loads = focusLoadsRef.current;
    if ((isTasks ? hasMoreTasks : hasMoreNotes) && loads.items < FOCUS_MAX_PAGE_LOADS) {
      loads.items += 1;
      void (isTasks ? fetchNextTasksPage() : fetchNextNotesPage());
      return;
    }
    if (!loads.refetched) {
      // Cached pages can predate the item; one fresh load before giving up.
      loads.refetched = true;
      loads.items = 0;
      void (isTasks ? refetchTasks() : refetchNotes());
      return;
    }
    setPendingFocus(null);
    setSearchHitId(pendingFocus.spaceId);
    showToast({
      message: `Couldn't find that ${isTasks ? 'task' : 'note'} — it may have been deleted.`,
      type: 'error',
    });
  }, [
    activeSection,
    fetchNextNotesPage,
    fetchNextTasksPage,
    hasMoreNotes,
    hasMoreTasks,
    isNotesFetching,
    isNotesLoading,
    isTasksFetching,
    isTasksLoading,
    notes,
    pendingFocus,
    refetchNotes,
    refetchTasks,
    selectedSpace?.id,
    showToast,
    tasks,
  ]);

  useEffect(() => {
    if (!searchHitId) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-search-id="${CSS.escape(searchHitId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timer = window.setTimeout(() => setSearchHitId(null), SEARCH_HIGHLIGHT_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [searchHitId]);

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

  // Editing a preview-only note must start from the full body, or saving would truncate it.
  const editingNote = editTarget?.kind === 'note' ? editTarget.note : null;
  const needsFullEditNote = Boolean(editingNote?.isTruncated && selectedSpace);
  const {
    data: fullEditNote,
    isFetching: isFetchingEditNote,
    isError: isEditNoteError,
  } = useGetNoteByIdQuery(
    { noteId: editingNote?.id ?? '', spaceId: selectedSpace?.id ?? '' },
    { skip: !needsFullEditNote, refetchOnMountOrArgChange: true },
  );
  const isEditNoteReady = !needsFullEditNote || (Boolean(fullEditNote) && !isFetchingEditNote);

  useEffect(() => {
    if (needsFullEditNote && isEditNoteError && !isFetchingEditNote) {
      setEditTarget(null);
      showToast({ message: 'Unable to load the full note for editing.', type: 'error' });
    }
  }, [isEditNoteError, isFetchingEditNote, needsFullEditNote, showToast]);

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
    <>
    <div className="home-container">
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
                className={`space-item${isMenuOpen ? ' is-menu-open' : ''}${searchHitId === space.id ? ' is-search-hit' : ''}`}
                data-active={space.id === selectedSpace?.id ? 'true' : undefined}
                data-search-id={space.id}
                key={space.id}
              >
                <button
                  className="space-item__select"
                  type="button"
                  title={space.name}
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
            <p>Choose a space to view its tasks and notes.</p>
          </div>
        ) : (
          <>
            <header className="space-hero">
              <div className="space-hero__identity">
                <span className="space-hero__icon">
                  <FiFolder aria-hidden="true" size={20} />
                </span>
                <div className="space-hero__text">
                  <h2>{selectedSpace.name}</h2>
                  <p>
                    {selectedSpace.description && selectedSpace.description !== 'New'
                      ? selectedSpace.description
                      : `Updated ${selectedSpace.updatedAtLabel.toLowerCase()}`}
                  </p>
                </div>
              </div>
              <dl className="space-hero__stats">
                <div>
                  <dt>Tasks</dt>
                  <dd>{selectedSpace.tasksCount}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{selectedSpace.notesCount}</dd>
                </div>
                {activeSection === 'tasks' && tasks.length > 0 ? (
                  <div className="space-hero__progress">
                    <dt>Done</dt>
                    <dd>
                      {Math.round((taskCounts.done / tasks.length) * 100)}%
                      <span
                        className="space-hero__meter"
                        style={{ '--progress': `${(taskCounts.done / tasks.length) * 100}%` } as CSSProperties}
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>
            </header>

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
                  <FiCheckSquare aria-hidden="true" size={14} />
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
                  <FiFileText aria-hidden="true" size={14} />
                  Notes
                </button>
              </div>

              <div className="space-detail__tools">
                {activeSection === 'tasks' ? (
                  <TaskFilterMenu value={taskFilter} counts={taskCounts} onChange={setTaskFilter} />
                ) : null}
                {activeSection === 'tasks' ? (
                  <div className="segmented-filter segmented-filter--tasks" role="group" aria-label="Filter tasks">
                    {(['all', 'open', 'done'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        data-active={taskFilter === filter ? 'true' : undefined}
                        onClick={() => setTaskFilter(filter)}
                      >
                        {filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Done'}
                        <span>{taskCounts[filter]}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="segmented-filter segmented-filter--icons" role="group" aria-label="Notes layout">
                    <button
                      type="button"
                      aria-label="Grid view"
                      data-active={noteLayout === 'grid' ? 'true' : undefined}
                      onClick={() => changeNoteLayout('grid')}
                    >
                      <FiGrid aria-hidden="true" size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="List view"
                      data-active={noteLayout === 'list' ? 'true' : undefined}
                      onClick={() => changeNoteLayout('list')}
                    >
                      <FiList aria-hidden="true" size={14} />
                    </button>
                  </div>
                )}

                <button
                  className="home-create-button"
                  type="button"
                  onClick={() => setCreateModal(activeSection === 'tasks' ? 'task' : 'note')}
                >
                  <FiPlus aria-hidden="true" size={15} />
                  <span>{activeSection === 'tasks' ? 'New task' : 'New note'}</span>
                </button>
              </div>
            </div>

            <div className="space-sections">
              {activeSection === 'tasks' ? (
                <section className="workspace-card" aria-label="Tasks">
                  {showTasksInitialLoading ? (
                    <div className="item-skeletons" aria-busy="true" aria-label="Loading tasks">
                      {[0, 1, 2, 3].map((row) => (
                        <span key={row} />
                      ))}
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
                        <FiCheckSquare aria-hidden="true" size={20} />
                      </span>
                      <h3>No tasks yet</h3>
                      <p>Create a task to track work inside {selectedSpace.name}, or record a meeting and KukuNotes will add them for you.</p>
                      <button className="home-create-button" type="button" onClick={() => setCreateModal('task')}>
                        <FiPlus aria-hidden="true" size={15} />
                        New task
                      </button>
                    </div>
                  ) : null}

                  {tasks.length > 0 ? (
                    <>
                      <TaskBoard
                        tasks={tasks}
                        filter={taskFilter}
                        completedTaskIds={completedTaskIds}
                        openItemMenuId={openItemMenuId}
                        searchHitId={searchHitId}
                        onToggle={toggleTaskCompletion}
                        onMenuChange={setOpenItemMenuId}
                        onEdit={(task) => setEditTarget({ kind: 'task', task })}
                        onDelete={(task) =>
                          setDeleteTarget({
                            kind: 'task',
                            id: task.id,
                            label: task.title,
                            spaceId: selectedSpace.id,
                          })
                        }
                      />

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
                    <div className="item-skeletons item-skeletons--grid" aria-busy="true" aria-label="Loading notes">
                      {[0, 1, 2, 3].map((row) => (
                        <span key={row} />
                      ))}
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
                      <p>Capture ideas and decisions for {selectedSpace.name}, or let KukuNotes take notes from your meetings.</p>
                      <button className="home-create-button" type="button" onClick={() => setCreateModal('note')}>
                        <FiPlus aria-hidden="true" size={15} />
                        New note
                      </button>
                    </div>
                  ) : null}

                  {notes.length > 0 ? (
                    <>
                      <NoteBoard
                        notes={notes}
                        spaceId={selectedSpace.id}
                        layout={noteLayout}
                        openItemMenuId={openItemMenuId}
                        searchHitId={searchHitId}
                        onMenuChange={setOpenItemMenuId}
                        onEdit={(note) => setEditTarget({ kind: 'note', note })}
                        onDelete={(note) =>
                          setDeleteTarget({
                            kind: 'note',
                            id: note.id,
                            label: note.title,
                            spaceId: selectedSpace.id,
                          })
                        }
                      />

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
    </section>
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

      {editTarget?.kind === 'note' && selectedSpace && isEditNoteReady ? (
        <CreateNoteModal
          mode="edit"
          spaceName={selectedSpace.name}
          initialTitle={editTarget.note.title}
          initialDescription={fullEditNote?.body.trim() || editTarget.note.excerpt}
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
    </>
  );
};
