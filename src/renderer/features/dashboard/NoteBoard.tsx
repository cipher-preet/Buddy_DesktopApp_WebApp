import { useMemo } from 'react';
import { FiCalendar, FiFileText } from 'react-icons/fi';

import { groupItemsByDate } from './homeMappers';
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
  spaceId: _spaceId,
  layout,
  openItemMenuId,
  searchHitId,
  onMenuChange,
  onEdit,
  onDelete,
}: NoteBoardProps) => {
  const groups = useMemo(() => groupItemsByDate(notes), [notes]);

  return (
    <div className="board-date-stack">
      {groups.map((group) => (
        <section className="board-date-group" key={group.key} aria-label={group.label}>
          <div className="board-date-separator" role="separator" aria-label={group.label}>
            <span />
            <strong>{group.label}</strong>
            <span />
          </div>

          <div className="note-board" data-layout={layout}>
            {group.items.map((note) => {
              const menuId = `note:${note.id}`;
              const isMenuOpen = openItemMenuId === menuId;

              return (
                <article
                  className={`note-card${isMenuOpen ? ' is-menu-open' : ''}${
                    searchHitId === note.id ? ' is-search-hit' : ''
                  }`}
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
                    <p className="note-card__excerpt is-full">{note.excerpt}</p>
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
        </section>
      ))}
    </div>
  );
};
