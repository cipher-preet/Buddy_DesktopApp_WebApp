import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiFolder,
  FiMic,
  FiPlus,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import { RiMic2Line } from 'react-icons/ri';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';
import { getApiErrorMessage } from '@/features/settings/planCatalog';
import {
  useCreateSpaceMutation,
  useGetUserSpacesInfiniteQuery,
} from '@/services/homeApi';

type StartListeningModalProps = {
  onClose: () => void;
  onConfirm: (space: WorkspaceSpace) => void | Promise<void>;
  isSubmitting?: boolean;
};

export const StartListeningModal = ({
  onClose,
  onConfirm,
  isSubmitting = false,
}: StartListeningModalProps) => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId || '');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [createError, setCreateError] = useState('');

  const [actionError, setActionError] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useGetUserSpacesInfiniteQuery({ userId, limit: 12 }, { skip: !userId });

  const [createSpace, { isLoading: isCreateSubmitting }] = useCreateSpaceMutation();

  const spaces = useMemo(
    () => data?.pages.flatMap((page) => page.spaces) ?? [],
    [data],
  );

  useEffect(() => {
    if (!spaces.length) {
      setSelectedSpaceId(null);
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

  const handleCreateSpace = async () => {
    const trimmed = newSpaceName.trim();
    if (!trimmed || !userId || isCreateSubmitting) {
      return;
    }

    setCreateError('');

    try {
      await createSpace({ userId, spacename: trimmed }).unwrap();
      setNewSpaceName('');
      setIsCreating(false);
      showToast({ message: 'Space created', type: 'success' });
      await refetch();
    } catch (createSpaceError) {
      setCreateError(getApiErrorMessage(createSpaceError, 'Unable to create space'));
    }
  };

  const busy = isSubmitting || isStartingSession;

  const handleStart = async () => {
    if (!selectedSpace || busy) {
      if (!selectedSpace) {
        showToast({ message: 'Please select a space', type: 'info' });
      }
      return;
    }

    setActionError('');
    setIsStartingSession(true);

    try {
      await onConfirm(selectedSpace);
    } catch (startError) {
      setActionError(getApiErrorMessage(startError, 'Unable to start listening'));
    } finally {
      setIsStartingSession(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop listening-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        className="listening-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Start listening"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="listening-modal__header">
          <div>
            <p>Listening</p>
            <h2>Start Voice Session</h2>
            <span>Choose a space to capture notes and tasks from this session.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close listening picker"
            disabled={busy}
          >
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="listening-modal__body">
          <div className="listening-modal__toolbar">
            <div>
              <strong>Your spaces</strong>
              <small>
                {isLoading ? 'Loading…' : `${spaces.length} available`}
              </small>
            </div>
            <button
              type="button"
              className="listening-modal__ghost-button"
              onClick={() => {
                setIsCreating((current) => !current);
                setCreateError('');
              }}
            >
              <FiPlus aria-hidden="true" size={15} />
              {isCreating ? 'Cancel' : 'New space'}
            </button>
          </div>

          {isCreating ? (
            <div className="listening-modal__create">
              <input
                type="text"
                value={newSpaceName}
                onChange={(event) => setNewSpaceName(event.target.value)}
                placeholder="Space name"
                aria-label="New space name"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreateSpace();
                  }
                }}
              />
              <button
                type="button"
                className="listening-modal__create-button"
                disabled={!newSpaceName.trim() || isCreateSubmitting}
                onClick={() => void handleCreateSpace()}
              >
                {isCreateSubmitting ? 'Creating…' : 'Create'}
              </button>
              {createError ? <p className="settings-form-error">{createError}</p> : null}
            </div>
          ) : null}

          {isLoading ? (
            <div className="listening-modal__state">
              <span className="listening-modal__spinner" aria-hidden="true" />
              <p>Loading spaces…</p>
            </div>
          ) : isError ? (
            <div className="listening-modal__state listening-modal__state--error">
              <FiAlertCircle aria-hidden="true" size={20} />
              <p>{getApiErrorMessage(error, 'Unable to load spaces')}</p>
              <button type="button" onClick={() => void refetch()}>
                <FiRefreshCw aria-hidden="true" size={14} />
                Retry
              </button>
            </div>
          ) : spaces.length === 0 ? (
            <div className="listening-modal__state">
              <FiFolder aria-hidden="true" size={22} />
              <p>No spaces yet</p>
              <span>Create a space to start listening.</span>
            </div>
          ) : (
            <div className="listening-modal__list" role="listbox" aria-label="Spaces">
              {spaces.map((space) => {
                const selected = space.id === selectedSpaceId;

                return (
                  <button
                    key={space.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`listening-space-card${selected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedSpaceId(space.id)}
                  >
                    <span className="listening-space-card__radio" aria-hidden="true">
                      {selected ? <FiCheck size={12} /> : null}
                    </span>
                    <span className="listening-space-card__copy">
                      <strong>{space.name}</strong>
                      <small>
                        {space.description?.trim() ||
                          `${space.notesCount} notes · ${space.tasksCount} tasks`}
                      </small>
                    </span>
                    <span className="listening-space-card__meta">{space.updatedAtLabel}</span>
                  </button>
                );
              })}

              {hasNextPage ? (
                <button
                  type="button"
                  className="listening-modal__load-more"
                  disabled={isFetchingNextPage || isFetching}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more spaces'}
                </button>
              ) : null}
            </div>
          )}
          {actionError ? <p className="settings-form-error">{actionError}</p> : null}
        </div>

        <footer className="listening-modal__footer">
          <div className="listening-modal__footer-copy">
            <FiMic aria-hidden="true" size={15} />
            <span>
              {busy
                ? 'Starting secure listening…'
                : selectedSpace
                  ? `Recording into ${selectedSpace.name}`
                  : 'Select a space to continue'}
            </span>
          </div>
          <button
            type="button"
            className="listening-modal__record-button"
            disabled={!selectedSpace || isLoading || busy}
            onClick={() => void handleStart()}
          >
            {busy ? (
              <span className="listening-modal__spinner listening-modal__spinner--button" aria-hidden="true" />
            ) : (
              <RiMic2Line aria-hidden="true" size={18} />
            )}
            {busy ? 'Starting…' : 'Record'}
          </button>
        </footer>
      </div>
    </div>
  );
};
