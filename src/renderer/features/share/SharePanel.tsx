import { useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiFolder,
  FiRefreshCw,
  FiShare2,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import type { WorkspaceNote, WorkspaceSpace, WorkspaceTask } from '@/features/dashboard/homeTypes';
import { useGetSpaceNotesInfiniteQuery, useGetSpaceTasksInfiniteQuery } from '@/services/homeApi';

import { exportSummaryDocument, revealExportedFile } from './exportSummary';
import {
  buildSummaryFileName,
  buildSummaryHtml,
  type ExportFormat,
  type ShareMode,
} from './shareSummary';

type ShareStep = 'scope' | 'export';

const SHARE_ITEMS_PAGE_SIZE = 50;
const MAX_EXPORT_PAGES = 40;

const formatOptions: { id: ExportFormat; title: string; description: string; icon: IconType }[] = [
  { id: 'pdf', title: 'PDF', description: 'Best for sharing and printing', icon: FiFileText },
  { id: 'doc', title: 'Word (.doc)', description: 'Editable in Word or Google Docs', icon: FiEdit3 },
];

const pluralize = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

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

const toggleInSet = (current: Set<string>, id: string) => {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

export const SharePanel = () => {
  const space = useAppSelector((state) => state.share.activeSpace);

  if (!space) {
    return (
      <div className="share-panel" aria-label="Share">
        <div className="home-empty-state share-panel__empty">
          <span className="home-empty-state__icon">
            <FiShare2 aria-hidden="true" size={20} />
          </span>
          <h3>No space selected</h3>
          <p>Select a space on Home to share its tasks and notes.</p>
        </div>
      </div>
    );
  }

  return <SpaceShareFlow key={space.id} space={space} />;
};

type SelectableListProps<T extends { id: string; title: string }> = {
  title: string;
  items: T[];
  selectedIds: Set<string>;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  hasMore: boolean;
  isFetchingMore: boolean;
  emptyLabel: string;
  renderMeta: (item: T) => string;
  onToggle: (id: string) => void;
  onToggleAll: (select: boolean) => void;
  onLoadMore: () => void;
  onRetry: () => void;
};

const SelectableList = <T extends { id: string; title: string }>({
  title,
  items,
  selectedIds,
  isLoading,
  isError,
  errorMessage,
  hasMore,
  isFetchingMore,
  emptyLabel,
  renderMeta,
  onToggle,
  onToggleAll,
  onLoadMore,
  onRetry,
}: SelectableListProps<T>) => {
  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  return (
    <div className="share-list">
      <div className="share-list__header">
        <span className="share-label">
          {title}
          {items.length > 0 ? <em>{`${selectedCount}/${items.length}`}</em> : null}
        </span>
        {items.length > 0 ? (
          <button className="share-link-button" type="button" onClick={() => onToggleAll(!allSelected)}>
            {allSelected ? 'Clear' : 'Select all'}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="share-note-line" aria-busy="true">
          <span className="home-spinner" />
          Loading {title.toLowerCase()}…
        </div>
      ) : null}

      {!isLoading && isError && items.length === 0 ? (
        <div className="share-note-line share-note-line--error" role="alert">
          <FiAlertCircle aria-hidden="true" size={14} />
          <span>{errorMessage}</span>
          <button className="share-link-button" type="button" onClick={onRetry}>
            <FiRefreshCw aria-hidden="true" size={12} />
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <p className="share-note-line">{emptyLabel}</p>
      ) : null}

      {items.length > 0 ? (
        <div className="share-list__items">
          {items.map((item) => {
            const checked = selectedIds.has(item.id);
            return (
              <label className="share-row" data-active={checked ? 'true' : undefined} key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                <span className="share-row__check" aria-hidden="true">
                  <FiCheck size={11} strokeWidth={3} />
                </span>
                <span className="share-row__text">
                  <strong>{item.title}</strong>
                  <small>{renderMeta(item)}</small>
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      {hasMore ? (
        <button
          className="share-link-button share-list__more"
          type="button"
          disabled={isFetchingMore}
          onClick={onLoadMore}
        >
          {isFetchingMore ? 'Loading…' : `Load more ${title.toLowerCase()}`}
        </button>
      ) : null}
    </div>
  );
};

const SpaceShareFlow = ({ space }: { space: WorkspaceSpace }) => {
  const { showToast } = useToast();
  const authUser = useAppSelector((state) => state.auth.user);
  const userId = authUser?.userId || '';

  const [step, setStep] = useState<ShareStep>('scope');
  const [mode, setMode] = useState<ShareMode>('complete');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(() => new Set());
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  const queryArg = { userId, spaceId: space.id, limit: SHARE_ITEMS_PAGE_SIZE };
  const skip = !userId;

  const {
    data: tasksData,
    isLoading: isTasksLoading,
    isError: isTasksError,
    error: tasksError,
    refetch: refetchTasks,
    fetchNextPage: fetchNextTasksPage,
    hasNextPage: hasMoreTasks,
    isFetchingNextPage: isFetchingMoreTasks,
  } = useGetSpaceTasksInfiniteQuery(queryArg, { skip });

  const {
    data: notesData,
    isLoading: isNotesLoading,
    isError: isNotesError,
    error: notesError,
    refetch: refetchNotes,
    fetchNextPage: fetchNextNotesPage,
    hasNextPage: hasMoreNotes,
    isFetchingNextPage: isFetchingMoreNotes,
  } = useGetSpaceNotesInfiniteQuery(queryArg, { skip });

  const tasks = useMemo(() => tasksData?.pages.flatMap((page) => page.tasks) ?? [], [tasksData]);
  const notes = useMemo(() => notesData?.pages.flatMap((page) => page.notes) ?? [], [notesData]);

  const selectedTasks = useMemo(
    () => tasks.filter((task) => selectedTaskIds.has(task.id)),
    [selectedTaskIds, tasks],
  );
  const selectedNotes = useMemo(
    () => notes.filter((note) => selectedNoteIds.has(note.id)),
    [notes, selectedNoteIds],
  );

  const customCount = selectedTasks.length + selectedNotes.length;
  const isContentLoading = isTasksLoading || isNotesLoading;
  const hasLoadError = (isTasksError && !tasksData) || (isNotesError && !notesData);
  const canOpenShare = mode === 'complete' || customCount > 0;

  const includedTaskCount = mode === 'complete' ? space.tasksCount : selectedTasks.length;
  const includedNoteCount = mode === 'complete' ? space.notesCount : selectedNotes.length;

  const loadAllTasks = async (): Promise<WorkspaceTask[]> => {
    let data = tasksData;
    for (let page = 0; data?.pages.at(-1)?.nextCursor && page < MAX_EXPORT_PAGES; page += 1) {
      data = await fetchNextTasksPage().unwrap();
    }
    return data?.pages.flatMap((entry) => entry.tasks) ?? [];
  };

  const loadAllNotes = async (): Promise<WorkspaceNote[]> => {
    let data = notesData;
    for (let page = 0; data?.pages.at(-1)?.nextCursor && page < MAX_EXPORT_PAGES; page += 1) {
      data = await fetchNextNotesPage().unwrap();
    }
    return data?.pages.flatMap((entry) => entry.notes) ?? [];
  };

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    setLastExportPath(null);

    try {
      const [exportTasks, exportNotes] =
        mode === 'complete'
          ? await Promise.all([loadAllTasks(), loadAllNotes()])
          : [selectedTasks, selectedNotes];

      const generatedAt = new Date();
      const html = buildSummaryHtml({
        space,
        tasks: exportTasks,
        notes: exportNotes,
        mode,
        format,
        preparedBy: authUser?.name || authUser?.email || undefined,
        generatedAt,
      });

      const result = await exportSummaryDocument(format, html, buildSummaryFileName(space, generatedAt));

      if (!result.saved) {
        return;
      }

      setLastExportPath(result.filePath ?? null);
      showToast({
        message: format === 'pdf' ? 'PDF summary exported' : 'Word summary exported',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: getErrorMessage(error, 'Unable to export summary.'),
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportLabel = isExporting
    ? 'Preparing…'
    : mode === 'complete' && isContentLoading
      ? 'Loading content…'
      : `Export as ${format === 'pdf' ? 'PDF' : 'DOC'}`;

  return (
    <div className="share-panel" aria-label="Share">
      <header className="share-header">
        <span className="share-header__icon">
          <FiFolder aria-hidden="true" size={17} />
        </span>
        <div className="share-header__text">
          <span className="share-label">Sharing space</span>
          <strong title={space.name}>{space.name}</strong>
          <small>
            {pluralize(space.tasksCount, 'task')} · {pluralize(space.notesCount, 'note')} ·{' '}
            {space.updatedAtLabel}
          </small>
        </div>
      </header>

      {step === 'scope' ? (
        <>
          <div className="share-section">
            <span className="share-label">What to share</span>
            <div
              className={`space-switch share-switch${mode === 'custom' ? ' is-notes' : ' is-tasks'}`}
              role="tablist"
              aria-label="Share scope"
            >
              <span className="space-switch__thumb" aria-hidden="true" />
              <button
                className="space-switch__button"
                data-active={mode === 'complete' ? 'true' : undefined}
                type="button"
                role="tab"
                aria-selected={mode === 'complete'}
                onClick={() => setMode('complete')}
              >
                Complete
              </button>
              <button
                className="space-switch__button"
                data-active={mode === 'custom' ? 'true' : undefined}
                type="button"
                role="tab"
                aria-selected={mode === 'custom'}
                onClick={() => setMode('custom')}
              >
                Custom
              </button>
            </div>
            <p className="share-hint">
              {mode === 'complete'
                ? `All ${pluralize(space.tasksCount, 'task')} and ${pluralize(space.notesCount, 'note')} will be included.`
                : 'Pick the tasks and notes you want to include.'}
            </p>
          </div>

          {mode === 'custom' ? (
            <div className="share-section share-section--lists">
              <SelectableList
                title="Tasks"
                items={tasks}
                selectedIds={selectedTaskIds}
                isLoading={isTasksLoading}
                isError={isTasksError}
                errorMessage={getErrorMessage(tasksError, 'Unable to load tasks')}
                hasMore={Boolean(hasMoreTasks)}
                isFetchingMore={isFetchingMoreTasks}
                emptyLabel="No tasks in this space yet."
                renderMeta={(task) => `${task.priority} · ${task.dueDate}`}
                onToggle={(id) => setSelectedTaskIds((current) => toggleInSet(current, id))}
                onToggleAll={(select) =>
                  setSelectedTaskIds(select ? new Set(tasks.map((task) => task.id)) : new Set())
                }
                onLoadMore={() => void fetchNextTasksPage()}
                onRetry={() => void refetchTasks()}
              />
              <SelectableList
                title="Notes"
                items={notes}
                selectedIds={selectedNoteIds}
                isLoading={isNotesLoading}
                isError={isNotesError}
                errorMessage={getErrorMessage(notesError, 'Unable to load notes')}
                hasMore={Boolean(hasMoreNotes)}
                isFetchingMore={isFetchingMoreNotes}
                emptyLabel="No notes in this space yet."
                renderMeta={(note) => note.dateLabel}
                onToggle={(id) => setSelectedNoteIds((current) => toggleInSet(current, id))}
                onToggleAll={(select) =>
                  setSelectedNoteIds(select ? new Set(notes.map((note) => note.id)) : new Set())
                }
                onLoadMore={() => void fetchNextNotesPage()}
                onRetry={() => void refetchNotes()}
              />
            </div>
          ) : null}

          <div className="share-footer">
            {mode === 'custom' ? (
              <p className="share-hint share-hint--center">
                {customCount > 0
                  ? `${pluralize(selectedTasks.length, 'task')} · ${pluralize(selectedNotes.length, 'note')} selected`
                  : 'Select at least one item to continue'}
              </p>
            ) : null}
            <button
              className="share-primary-button"
              type="button"
              disabled={!canOpenShare}
              onClick={() => {
                setLastExportPath(null);
                setStep('export');
              }}
            >
              <FiShare2 aria-hidden="true" size={15} />
              Open share
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="share-ready">
            <span className="share-ready__status">
              <FiCheckCircle aria-hidden="true" size={14} />
              Ready to share
            </span>
            <p>
              {mode === 'complete' ? 'Complete' : 'Custom'} · {pluralize(includedTaskCount, 'task')} ·{' '}
              {pluralize(includedNoteCount, 'note')}
            </p>
            <button className="share-link-button" type="button" onClick={() => setStep('scope')}>
              Change
            </button>
          </div>

          <div className="share-section">
            <span className="share-label">Export summary as</span>
            <div className="share-formats" role="radiogroup" aria-label="Export format">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isActive = format === option.id;
                return (
                  <button
                    className="share-row share-row--option"
                    data-active={isActive ? 'true' : undefined}
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => {
                      setFormat(option.id);
                      setLastExportPath(null);
                    }}
                  >
                    <span className="share-row__icon">
                      <Icon aria-hidden="true" size={16} />
                    </span>
                    <span className="share-row__text">
                      <strong>{option.title}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="share-row__radio" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'complete' && hasLoadError ? (
            <div className="share-note-line share-note-line--error" role="alert">
              <FiAlertCircle aria-hidden="true" size={14} />
              <span>Couldn’t load space content.</span>
              <button
                className="share-link-button"
                type="button"
                onClick={() => {
                  void refetchTasks();
                  void refetchNotes();
                }}
              >
                <FiRefreshCw aria-hidden="true" size={12} />
                Retry
              </button>
            </div>
          ) : null}

          {lastExportPath ? (
            <div className="share-note-line share-note-line--success" role="status">
              <FiCheckCircle aria-hidden="true" size={14} />
              <span title={lastExportPath}>Saved {lastExportPath.split(/[\\/]/).pop()}</span>
              <button
                className="share-link-button"
                type="button"
                onClick={() => revealExportedFile(lastExportPath)}
              >
                Show in folder
              </button>
            </div>
          ) : null}

          <div className="share-footer share-footer--split">
            <button
              className="share-secondary-button"
              type="button"
              aria-label="Back"
              disabled={isExporting}
              onClick={() => setStep('scope')}
            >
              <FiArrowLeft aria-hidden="true" size={16} />
            </button>
            <button
              className="share-primary-button"
              type="button"
              aria-busy={isExporting}
              disabled={isExporting || (mode === 'complete' && (isContentLoading || hasLoadError))}
              onClick={() => void handleExport()}
            >
              {isExporting ? (
                <span className="share-spinner" aria-hidden="true" />
              ) : (
                <FiDownload aria-hidden="true" size={15} />
              )}
              {exportLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
