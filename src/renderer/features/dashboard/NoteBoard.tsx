import { useLayoutEffect, useRef, useState } from 'react';
import { FiCalendar, FiFileText } from 'react-icons/fi';

import { useGetNoteByIdQuery } from '@/services/homeApi';

import { ItemActionsMenu } from './ItemActionsMenu';
import type { WorkspaceNote } from './homeTypes';

export type NoteLayout = 'grid' | 'list';

const ACCENTS = ['indigo', 'violet', 'teal', 'amber', 'rose', 'sky'] as const;

const accentFor = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
};

type NoteExcerptProps = {
  note: WorkspaceNote;
  spaceId: string;
  layout: NoteLayout;
  isExpanded: boolean;
  onToggle: () => void;
};

// Overflow is measured rather than guessed from length, since the clamp depends on card width, layout and line breaks.
const NoteExcerpt = ({ note, spaceId, layout, isExpanded, onToggle }: NoteExcerptProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const {
    data: fullNote,
    isFetching,
    isError,
    refetch,
  } = useGetNoteByIdQuery({ noteId: note.id, spaceId }, { skip: !isExpanded || !note.isTruncated });

  const fullBody = fullNote?.body.trim();
  const isLoadingFull = isExpanded && note.isTruncated && !fullBody && isFetching;
  const failedToLoad = isExpanded && note.isTruncated && !fullBody && isError && !isFetching;
  const text = isExpanded && fullBody ? fullBody : note.isTruncated ? `${note.excerpt}…` : note.excerpt;

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || isExpanded) {
      return undefined;
    }
    const measure = () => setIsClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded, layout, text]);

  return (
    <>
      <p ref={textRef} className={`note-card__excerpt${isExpanded ? ' is-expanded' : ''}`}>
        {text}
      </p>
      {failedToLoad ? (
        <p className="note-card__load-error" role="alert">
          Couldn&apos;t load the full note.{' '}
          <button type="button" onClick={() => void refetch()}>
            Try again
          </button>
        </p>
      ) : null}
      {isClamped || note.isTruncated || isExpanded ? (
        <button
          className="note-card__more"
          type="button"
          aria-expanded={isExpanded}
          disabled={isLoadingFull}
          onClick={onToggle}
        >
          {isLoadingFull ? 'Loading…' : isExpanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </>
  );
};

type NoteBoardProps = {
  notes: WorkspaceNote[];
  spaceId: string;
  layout: NoteLayout;
  openItemMenuId: string | null;
  searchHitId: string | null;
  onMenuChange: (menuId: string | null) => void;
  onEdit: (note: WorkspaceNote) => void;
  onDelete: (note: WorkspaceNote) => void;
};

export const NoteBoard = ({
  notes,
  spaceId,
  layout,
  openItemMenuId,
  searchHitId,
  onMenuChange,
  onEdit,
  onDelete,
}: NoteBoardProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = (noteId: string) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });

  return (
    <div className="note-board" data-layout={layout}>
      {notes.map((note) => {
        const menuId = `note:${note.id}`;
        const isMenuOpen = openItemMenuId === menuId;
        return (
          <article
            className={`note-card${isMenuOpen ? ' is-menu-open' : ''}${searchHitId === note.id ? ' is-search-hit' : ''}`}
            data-accent={accentFor(note.id)}
            data-search-id={note.id}
            key={note.id}
          >
            <header className="note-card__header">
              <span className="note-card__icon">
                <FiFileText aria-hidden="true" size={15} />
              </span>
              <h3>{note.title}</h3>
              <div className="note-card__actions">
                <ItemActionsMenu
                  itemLabel={note.title}
                  isOpen={isMenuOpen}
                  onOpen={() => onMenuChange(menuId)}
                  onClose={() => onMenuChange(null)}
                  onEdit={() => {
                    onMenuChange(null);
                    onEdit(note);
                  }}
                  onDelete={() => {
                    onMenuChange(null);
                    onDelete(note);
                  }}
                />
              </div>
            </header>
            {note.excerpt ? (
              <NoteExcerpt
                note={note}
                spaceId={spaceId}
                layout={layout}
                isExpanded={expandedIds.has(note.id)}
                onToggle={() => toggleExpanded(note.id)}
              />
            ) : (
              <p className="note-card__excerpt is-empty">No content yet.</p>
            )}
            <footer className="note-card__footer">
              <span>
                <FiCalendar aria-hidden="true" size={12} />
                {note.dateLabel}
              </span>
            </footer>
          </article>
        );
      })}
    </div>
  );
};
