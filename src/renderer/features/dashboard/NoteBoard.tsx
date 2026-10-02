import { useEffect } from 'react';
import { FiCalendar, FiEdit2, FiFileText, FiMaximize2, FiTrash2, FiX } from 'react-icons/fi';

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

type NoteBoardProps = {
  notes: WorkspaceNote[];
  layout: NoteLayout;
  openItemMenuId: string | null;
  searchHitId: string | null;
  onOpen: (note: WorkspaceNote) => void;
  onMenuChange: (menuId: string | null) => void;
  onEdit: (note: WorkspaceNote) => void;
  onDelete: (note: WorkspaceNote) => void;
};

export const NoteBoard = ({
  notes,
  layout,
  openItemMenuId,
  searchHitId,
  onOpen,
  onMenuChange,
  onEdit,
  onDelete,
}: NoteBoardProps) => (
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
          <button
            className="note-card__open"
            type="button"
            aria-label={`Open note ${note.title}`}
            onClick={() => onOpen(note)}
          />
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
          {note.excerpt ? <p className="note-card__excerpt">{note.excerpt}</p> : (
            <p className="note-card__excerpt is-empty">No content yet.</p>
          )}
          <footer className="note-card__footer">
            <span>
              <FiCalendar aria-hidden="true" size={12} />
              {note.dateLabel}
            </span>
            <span className="note-card__expand" aria-hidden="true">
              <FiMaximize2 size={12} />
              Open
            </span>
          </footer>
        </article>
      );
    })}
  </div>
);

type NoteReaderProps = {
  note: WorkspaceNote;
  spaceName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const NoteReader = ({ note, spaceName, onClose, onEdit, onDelete }: NoteReaderProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="note-reader"
        data-accent={accentFor(note.id)}
        role="dialog"
        aria-modal="true"
        aria-label={note.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="note-reader__header">
          <div className="note-reader__heading">
            <span className="note-reader__kicker">
              <FiFileText aria-hidden="true" size={13} />
              {spaceName}
            </span>
            <h2>{note.title}</h2>
            <p>
              <FiCalendar aria-hidden="true" size={12} />
              {note.dateLabel}
            </p>
          </div>
          <button className="note-reader__close" type="button" aria-label="Close note" onClick={onClose}>
            <FiX aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="note-reader__body">
          {note.excerpt ? note.excerpt : <span className="note-reader__empty">This note is empty.</span>}
        </div>

        <footer className="note-reader__footer">
          <button className="note-reader__button note-reader__button--danger" type="button" onClick={onDelete}>
            <FiTrash2 aria-hidden="true" size={14} />
            Delete
          </button>
          <button className="note-reader__button note-reader__button--primary" type="button" onClick={onEdit}>
            <FiEdit2 aria-hidden="true" size={14} />
            Edit note
          </button>
        </footer>
      </div>
    </div>
  );
};
