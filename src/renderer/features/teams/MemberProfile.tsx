import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiChevronDown, FiUser } from 'react-icons/fi';

import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';

import type { AddedPerson } from './AddPeopleModal';

type MemberProfileProps = {
  person: AddedPerson;
  people: AddedPerson[];
  spaces: WorkspaceSpace[];
  onBack: () => void;
  onShareSpaces: (personId: string, spaceIds: string[]) => void | Promise<void>;
};

type ProfileTab = 'overview' | 'spaces';

const toneFor = (name: string) => {
  const tones = ['blue', 'teal', 'purple', 'amber'] as const;
  const total = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
};

const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'S';
  }
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

export const MemberProfile = ({ person, people, spaces, onBack, onShareSpaces }: MemberProfileProps) => {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const email = person.email || null;
  const sharedSpaces = useMemo(
    () =>
      person.spaceIds
        .map((spaceId, index) => {
          const match = spaces.find((space) => space.id === spaceId);
          return {
            id: spaceId,
            name: match?.name ?? person.spaceNames[index] ?? 'Space',
            peopleCount: people.filter((member) => member.spaceIds.includes(spaceId)).length,
          };
        }),
    [people, person.spaceIds, person.spaceNames, spaces],
  );
  const availableSpaces = useMemo(
    () => spaces.filter((space) => !space.shared && !person.spaceIds.includes(space.id)),
    [person.spaceIds, spaces],
  );
  const subtitle =
    sharedSpaces.length === 0
      ? 'Not shared with a space yet'
      : sharedSpaces.length === 1
        ? sharedSpaces[0].name
        : `Shared in ${sharedSpaces.length} spaces`;

  return (
    <article className="member-profile" aria-label={person.name}>
      <button type="button" className="member-profile__back" onClick={onBack}>
        <FiArrowLeft aria-hidden="true" size={16} />
        People you work with
      </button>

      <header className="member-profile__head">
        <span className="member-profile__avatar" aria-hidden="true">
          <FiUser size={28} />
        </span>
        <div>
          <h1>{person.name}</h1>
          <p>{person.permission}</p>
          <p>{subtitle}</p>
        </div>
      </header>

      <div className="member-profile__tabs" role="tablist" aria-label="Profile sections">
        <button
          type="button"
          role="tab"
          id="member-tab-overview"
          aria-selected={tab === 'overview'}
          aria-controls="member-panel-overview"
          className={tab === 'overview' ? 'is-active' : undefined}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          id="member-tab-spaces"
          aria-selected={tab === 'spaces'}
          aria-controls="member-panel-spaces"
          className={tab === 'spaces' ? 'is-active' : undefined}
          onClick={() => setTab('spaces')}
        >
          Spaces
          <span>{sharedSpaces.length}</span>
        </button>
      </div>

      {tab === 'overview' ? (
        <div
          className="member-profile__layout"
          role="tabpanel"
          id="member-panel-overview"
          aria-labelledby="member-tab-overview"
        >
          <section className="member-profile__main">
            <h2>Working together</h2>
            <p>
              {sharedSpaces.length === 0
                ? `${person.name} is not shared with a space yet. Share a space so their work stays with the right notes and tasks.`
                : `${person.name} is shared with ${sharedSpaces.map((space) => space.name).join(', ')}.`}
            </p>
          </section>
          <aside className="member-profile__side" aria-label="Details">
            <h2>Details</h2>
            <dl className="member-profile__details">
              <div>
                <dt>Email</dt>
                <dd>{email ?? 'No email added'}</dd>
              </div>
            </dl>
            <SpaceList heading="Shared spaces" spaces={sharedSpaces} />
            <ShareSpaces
              available={availableSpaces}
              onShare={(spaceIds) => onShareSpaces(person.id, spaceIds)}
            />
          </aside>
        </div>
      ) : (
        <div
          className="member-profile__layout member-profile__layout--spaces"
          role="tabpanel"
          id="member-panel-spaces"
          aria-labelledby="member-tab-spaces"
        >
          <section className="member-profile__main">
            <SpaceList heading="Shared spaces" spaces={sharedSpaces} />
          </section>
          <aside className="member-profile__side" aria-label="Share a space">
            <h2>Share a space</h2>
            <p className="member-profile__lead">
              Add {person.name} to more of your spaces. They stay on the spaces already shared.
            </p>
            <ShareSpaces
              available={availableSpaces}
              onShare={(spaceIds) => onShareSpaces(person.id, spaceIds)}
            />
          </aside>
        </div>
      )}
    </article>
  );
};

const SpaceList = ({
  heading,
  spaces,
}: {
  heading: string;
  spaces: Array<{ id: string; name: string; peopleCount: number }>;
}) => (
  <section className="member-spaces">
    <h2>
      {heading}
      <span>{spaces.length}</span>
    </h2>
    {spaces.length === 0 ? (
      <p className="member-spaces__empty">No spaces shared yet.</p>
    ) : (
      <ul>
        {spaces.map((space) => (
          <li key={space.id}>
            <span className={`member-space__mark member-space__mark--${toneFor(space.name)}`} aria-hidden="true">
              {initials(space.name)}
            </span>
            <span className="member-space__copy">
              <strong>{space.name}</strong>
              <small>
                {space.peopleCount} {space.peopleCount === 1 ? 'person' : 'people'}
              </small>
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const ShareSpaces = ({
  available,
  onShare,
}: {
  available: WorkspaceSpace[];
  onShare: (spaceIds: string[]) => void | Promise<void>;
}) => {
  const listId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => available.some((space) => space.id === id)));
  }, [available]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isOpen]);

  const selected = available.filter((space) => selectedIds.includes(space.id));
  const summary =
    available.length === 0
      ? 'No more spaces'
      : selected.length === 0
        ? 'Select spaces'
        : selected.length <= 2
          ? selected.map((space) => space.name).join(', ')
          : `${selected[0].name}, ${selected[1].name} +${selected.length - 2}`;

  if (available.length === 0) {
    return <p className="member-share__done">Shared with every space.</p>;
  }

  return (
    <form
      className="member-share"
      onSubmit={async (event) => {
        event.preventDefault();
        if (selectedIds.length === 0) {
          setIsOpen(true);
          return;
        }
        try {
          await onShare(selectedIds);
          setSelectedIds([]);
          setIsOpen(false);
        } catch {
          setIsOpen(false);
        }
      }}
    >
      <div className={`teams-field teams-space${isOpen ? ' is-open' : ''}`} ref={fieldRef}>
        <span className="teams-field__label" id={`${listId}-label`}>
          Share more spaces
        </span>
        <div className="teams-space__control">
          <button
            type="button"
            className={`teams-space__trigger${isOpen ? ' is-open' : ''}${selected.length === 0 ? ' is-placeholder' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className="teams-space__value">
              <strong>{summary}</strong>
              {selected.length > 1 ? <small>{selected.length} spaces selected</small> : null}
            </span>
            <FiChevronDown aria-hidden="true" size={16} />
          </button>
          {isOpen ? (
            <div
              id={listId}
              className="teams-space__menu"
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={`${listId}-label`}
            >
              {available.map((space) => {
                const isSelected = selectedIds.includes(space.id);
                return (
                  <button
                    key={space.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`teams-space__option${isSelected ? ' is-selected' : ''}`}
                    onClick={() =>
                      setSelectedIds((current) =>
                        current.includes(space.id)
                          ? current.filter((id) => id !== space.id)
                          : [...current, space.id],
                      )
                    }
                  >
                    <span>{space.name}</span>
                    <span className="teams-space__check" aria-hidden="true">
                      {isSelected ? <FiCheck size={14} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <button type="submit" className="member-share__button" disabled={selectedIds.length === 0}>
        Share {selectedIds.length > 1 ? `${selectedIds.length} spaces` : 'space'}
      </button>
    </form>
  );
};
