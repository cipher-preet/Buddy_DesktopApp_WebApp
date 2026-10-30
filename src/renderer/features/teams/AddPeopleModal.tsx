import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';

import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';

export type AddedPerson = {
  id: string;
  name: string;
  email: string;
  permission: 'Owner' | 'Can view';
  spaceIds: string[];
  spaceNames: string[];
};

type AddPeopleModalProps = {
  spaces: WorkspaceSpace[];
  isLoadingSpaces: boolean;
  spacesError: string | null;
  onRetrySpaces: () => void;
  onClose: () => void;
  onAdd: (people: AddedPerson[]) => void | Promise<void>;
};

const splitEntries = (value: string) =>
  value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const displayName = (entry: string) => {
  if (!entry.includes('@')) {
    return entry;
  }
  const local = entry.split('@')[0] ?? entry;
  const words = local
    .replace(/[._+-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return entry;
  }
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const AddPeopleModal = ({
  spaces,
  isLoadingSpaces,
  spacesError,
  onRetrySpaces,
  onClose,
  onAdd,
}: AddPeopleModalProps) => {
  const titleId = useId();
  const namesId = useId();
  const spaceListId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const namesRef = useRef<HTMLInputElement>(null);
  const spaceFieldRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const menuOpenRef = useRef(false);
  onCloseRef.current = onClose;

  const [names, setNames] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  menuOpenRef.current = isSpaceMenuOpen;

  useEffect(() => {
    setSelectedSpaceIds((current) => current.filter((id) => spaces.some((space) => space.id === id)));
  }, [spaces]);

  useEffect(() => {
    if (!isSpaceMenuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!spaceFieldRef.current?.contains(event.target as Node)) {
        setIsSpaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isSpaceMenuOpen]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    namesRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (menuOpenRef.current) {
          setIsSpaceMenuOpen(false);
          return;
        }
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  const selectedSpaces = useMemo(
    () => spaces.filter((space) => selectedSpaceIds.includes(space.id)),
    [selectedSpaceIds, spaces],
  );

  const spaceSummary = useMemo(() => {
    if (isLoadingSpaces) {
      return 'Loading spaces…';
    }
    if (spaces.length === 0) {
      return 'No spaces yet';
    }
    if (selectedSpaces.length === 0) {
      return 'Select spaces';
    }
    if (selectedSpaces.length <= 2) {
      return selectedSpaces.map((space) => space.name).join(', ');
    }
    return `${selectedSpaces[0].name}, ${selectedSpaces[1].name} +${selectedSpaces.length - 2}`;
  }, [isLoadingSpaces, selectedSpaces, spaces.length]);

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaceIds((current) =>
      current.includes(spaceId) ? current.filter((id) => id !== spaceId) : [...current, spaceId],
    );
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const entries = splitEntries(names);
    const emails = entries.filter((entry) => entry.includes('@'));
    if (entries.length === 0 || emails.length !== entries.length) {
      setError('Enter an email address. Names alone cannot receive an invitation.');
      namesRef.current?.focus();
      return;
    }
    if (selectedSpaces.length === 0) {
      setError(spaces.length === 0 ? 'Create a space on Home before adding people.' : 'Select at least one space.');
      setIsSpaceMenuOpen(true);
      return;
    }

    setIsSending(true);
    try {
      await onAdd(
        emails.map((entry) => ({
          id: entry.toLowerCase(),
          name: displayName(entry),
          email: entry.toLowerCase(),
          permission: 'Can view',
          spaceIds: selectedSpaces.map((space) => space.id),
          spaceNames: selectedSpaces.map((space) => space.name),
        })),
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message
          ? submitError.message
          : 'Unable to send the invitation.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div
      className="teams-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="teams-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="teams-modal__header">
          <h2 id={titleId}>Add people</h2>
          <button type="button" className="teams-modal__close" aria-label="Close" onClick={onClose}>
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <form className="teams-modal__form" onSubmit={handleSubmit}>
          <label className="teams-field" htmlFor={namesId}>
            <span className="teams-field__label">
              Names or emails <abbr title="required">*</abbr>
            </span>
            <input
              ref={namesRef}
              id={namesId}
              className="teams-field__input"
              type="text"
              autoComplete="off"
              placeholder="e.g., Maria, maria@company.com"
              value={names}
              onChange={(event) => {
                setNames(event.target.value);
                setError(null);
              }}
            />
            <span className="teams-field__hint">Search by name, enter an email, or paste a list</span>
          </label>

          <div className={`teams-field teams-space${isSpaceMenuOpen ? ' is-open' : ''}`} ref={spaceFieldRef}>
            <span className="teams-field__label" id={`${spaceListId}-label`}>
              Select which spaces they’ll be added to
            </span>
            <div className="teams-space__control">
              <button
                type="button"
                className={`teams-space__trigger${isSpaceMenuOpen ? ' is-open' : ''}${selectedSpaces.length === 0 ? ' is-placeholder' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={isSpaceMenuOpen}
                aria-controls={spaceListId}
                disabled={isLoadingSpaces || spaces.length === 0}
                onClick={() => setIsSpaceMenuOpen((open) => !open)}
              >
                <span className="teams-space__value">
                  <strong>{spaceSummary}</strong>
                  {selectedSpaces.length > 1 ? <small>{selectedSpaces.length} spaces selected</small> : null}
                </span>
                <FiChevronDown aria-hidden="true" size={16} />
              </button>
              {isSpaceMenuOpen && spaces.length > 0 ? (
                <div
                  id={spaceListId}
                  className="teams-space__menu"
                  role="listbox"
                  aria-multiselectable="true"
                  aria-labelledby={`${spaceListId}-label`}
                >
                  {spaces.map((space) => {
                    const selected = selectedSpaceIds.includes(space.id);
                    return (
                      <button
                        key={space.id}
                        type="button"
                        className={`teams-space__option${selected ? ' is-selected' : ''}`}
                        role="option"
                        aria-selected={selected}
                        onClick={() => toggleSpace(space.id)}
                      >
                        <span>{space.name}</span>
                        <span className="teams-space__check" aria-hidden="true">
                          {selected ? <FiCheck size={14} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <span className="teams-field__hint">Choose one or more spaces</span>
            {spacesError ? (
              <span className="teams-field__error" role="alert">
                {spacesError}{' '}
                <button type="button" className="teams-field__retry" onClick={onRetrySpaces}>
                  Retry
                </button>
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="teams-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <footer className="teams-modal__footer">
            <button type="button" className="teams-modal__cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="teams-modal__add" disabled={isSending || isLoadingSpaces || spaces.length === 0}>
              {isSending ? 'Sending…' : 'Add'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};
