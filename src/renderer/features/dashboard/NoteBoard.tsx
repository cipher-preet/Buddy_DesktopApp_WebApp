import { useMemo, type ReactNode } from 'react';
import { FiCalendar, FiFileText } from 'react-icons/fi';

import { useGetNoteByIdQuery } from '@/services/homeApi';

import { groupItemsByDate } from './homeMappers';
import { ItemActionsMenu } from './ItemActionsMenu';
import type { WorkspaceNote } from './homeTypes';

export type NoteLayout = 'grid' | 'list';

const ACCENTS = ['indigo', 'violet', 'teal', 'amber', 'rose', 'sky'] as const;
const BULLET_LINE = /^\s*(?:[-*•▪◦]|\d+[.)])\s+(.*)$/;

const accentFor = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
};

/** Turns plain "-" / "*" markdown bullets into styled dots for note cards. */
const renderNoteExcerpt = (excerpt: string): ReactNode => {
  const lines = excerpt.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) {
      return;
    }

    blocks.push(
      <ul className="note-card__bullets" key={`bullets-${key}`}>
        {bulletBuffer.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    key += 1;
    bulletBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }

    const bulletMatch = trimmed.match(BULLET_LINE);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1].trim());
      return;
    }

    flushBullets();
    blocks.push(
      <p className="note-card__paragraph" key={`p-${key}`}>
        {trimmed}
      </p>,
    );
    key += 1;
  });

  flushBullets();
  return blocks.length > 0 ? blocks : excerpt;
};

type NoteCardBodyProps = {
  note: WorkspaceNote;
  spaceId: string;
};

const NoteCardBody = ({ note, spaceId }: NoteCardBodyProps) => {
  const { data: fullNote, isFetching, isError, refetch } = useGetNoteByIdQuery(
    { noteId: note.id, spaceId },
    { skip: !note.isTruncated || !spaceId },
  );

  const body = (fullNote?.body?.trim() || note.excerpt).trim();

  if (!body && !note.isTruncated) {
    return <p className="note-card__excerpt is-empty">No content yet.</p>;
  }

  if (note.isTruncated && isFetching && !fullNote) {
    return (
      <div className="note-card__excerpt is-loading" aria-busy="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (note.isTruncated && isError && !fullNote) {
    return (
      <div className="note-card__excerpt">
        <p className="note-card__paragraph">{note.excerpt}</p>
        <p className="note-card__load-error">
          Couldn’t load the full note.{' '}
          <button type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      </div>
    );
  }

  return <div className="note-card__excerpt is-full">{renderNoteExcerpt(body)}</div>;
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
                  <NoteCardBody note={note} spaceId={spaceId} />
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
