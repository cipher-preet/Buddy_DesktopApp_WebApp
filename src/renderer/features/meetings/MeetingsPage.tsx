import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFolder,
  FiGrid,
  FiList,
  FiMoreVertical,
  FiRefreshCw,
  FiSearch,
  FiVideo,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';
import { useGetMeetingsInfiniteQuery } from '@/services/meetingsApi';

import { MeetingDetailView } from './MeetingDetailView';
import type { MeetingListItem } from './meetingsApiTypes';

type ViewMode = 'grid' | 'list';

const SPACES_PAGE_SIZE = 12;
const MEETINGS_PAGE_SIZE = 24;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'object') {
    if ('data' in error) {
      const data = (error as { data?: unknown }).data;
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
      if (typeof data === 'object' && data) {
        if ('message' in data && typeof (data as { message: unknown }).message === 'string') {
          const message = (data as { message: string }).message.trim();
          if (message) {
            return message;
          }
        }
      }
    }

    if ('error' in error && typeof (error as { error: unknown }).error === 'string') {
      const message = (error as { error: string }).error.trim();
      if (message && message !== 'FETCH_ERROR' && message !== 'PARSING_ERROR') {
        return message;
      }
    }

    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      const message = (error as { message: string }).message.trim();
      if (message) {
        return message;
      }
    }
  }

  return fallback;
};

const MeetingThumbnail = ({ meeting }: { meeting: MeetingListItem }) => (
  <div className={`meeting-card__thumb meeting-card__thumb--${meeting.thumbnailTone}`}>
    <img src={meeting.coverImage} alt="" className="meeting-card__image" />
    <div className="meeting-card__thumb-overlay" aria-hidden="true">
      <span className="meeting-card__play">
        <FiVideo size={18} />
      </span>
    </div>
    {!meeting.ready ? <span className="meeting-card__status-pill">{meeting.statusLabel}</span> : null}
  </div>
);

type MeetingSpaceMenuProps = {
  meetingId: string;
  meetingTitle: string;
  isOpen: boolean;
  spaces: WorkspaceSpace[];
  selectedSpaceIds: string[];
  isSpacesLoading: boolean;
  isSpacesError: boolean;
  spacesErrorMessage: string;
  hasMoreSpaces: boolean;
  isFetchingMoreSpaces: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggleSpace: (spaceId: string) => void;
  onRetrySpaces: () => void;
  onLoadMoreSpaces: () => void;
};

const MeetingSpaceMenu = ({
  meetingId,
  meetingTitle,
  isOpen,
  spaces,
  selectedSpaceIds,
  isSpacesLoading,
  isSpacesError,
  spacesErrorMessage,
  hasMoreSpaces,
  isFetchingMoreSpaces,
  onOpen,
  onClose,
  onToggleSpace,
  onRetrySpaces,
  onLoadMoreSpaces,
}: MeetingSpaceMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const [query, setQuery] = useState('');

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !menuRef.current?.contains(target)) {
        onCloseRef.current();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const filteredSpaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return spaces;
    }

    return spaces.filter(
      (space) =>
        space.name.toLowerCase().includes(normalized) ||
        space.description.toLowerCase().includes(normalized),
    );
  }, [query, spaces]);

  return (
    <div className="meeting-card__menu" ref={menuRef}>
      <button
        type="button"
        className={`meeting-card__menu-btn${isOpen ? ' is-open' : ''}`}
        aria-label={`Associate ${meetingTitle} with spaces`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            onClose();
          } else {
            onOpen();
          }
        }}
      >
        <FiMoreVertical size={16} />
      </button>

      {isOpen ? (
        <div
          className="meeting-space-popover"
          role="dialog"
          aria-label={`Associate ${meetingTitle} with spaces`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="meeting-space-popover__head">
            <strong>Associate spaces</strong>
            <span>{selectedSpaceIds.length > 0 ? '1 selected' : 'None selected'}</span>
          </div>

          <label className="meeting-space-popover__search">
            <FiSearch aria-hidden="true" size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search spaces"
              aria-label="Search spaces"
            />
          </label>

          <div className="meeting-space-popover__list">
            {isSpacesLoading && spaces.length === 0 ? (
              <div className="meeting-space-popover__state" aria-busy="true">
                <span className="home-spinner" />
                <p>Loading spaces…</p>
              </div>
            ) : null}

            {isSpacesError && spaces.length === 0 ? (
              <div className="meeting-space-popover__state" role="alert">
                <FiAlertCircle aria-hidden="true" size={15} />
                <p>{spacesErrorMessage}</p>
                <button type="button" onClick={onRetrySpaces}>
                  <FiRefreshCw aria-hidden="true" size={13} />
                  Retry
                </button>
              </div>
            ) : null}

            {!isSpacesLoading && !isSpacesError && filteredSpaces.length === 0 ? (
              <div className="meeting-space-popover__state">
                <FiFolder aria-hidden="true" size={15} />
                <p>{spaces.length === 0 ? 'No spaces yet.' : 'No matching spaces.'}</p>
              </div>
            ) : null}

            {filteredSpaces.map((space) => {
              const checked = selectedSpaceIds.includes(space.id);
              const inputId = `meeting-${meetingId}-space-${space.id}`;

              return (
                <label key={space.id} className="meeting-space-option" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSpace(space.id)}
                  />
                  <span className="meeting-space-option__check" aria-hidden="true" />
                  <span className="meeting-space-option__icon" aria-hidden="true">
                    <FiFolder size={14} />
                  </span>
                  <span className="meeting-space-option__text">
                    <strong>{space.name}</strong>
                    <small>{space.description || 'No description'}</small>
                  </span>
                </label>
              );
            })}

            {hasMoreSpaces ? (
              <button
                type="button"
                className="meeting-space-popover__more"
                disabled={isFetchingMoreSpaces}
                onClick={onLoadMoreSpaces}
              >
                {isFetchingMoreSpaces ? 'Loading…' : 'Load more spaces'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const MeetingsPage = () => {
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuMeetingId, setMenuMeetingId] = useState<string | null>(null);
  const [meetingSpaceIds, setMeetingSpaceIds] = useState<Record<string, string[]>>({});
  const [canScrollSpacesLeft, setCanScrollSpacesLeft] = useState(false);
  const [canScrollSpacesRight, setCanScrollSpacesRight] = useState(false);
  const [isDraggingSpaces, setIsDraggingSpaces] = useState(false);
  const spacesRailRef = useRef<HTMLDivElement>(null);
  const spacesDragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const {
    data: spacesData,
    isLoading: isSpacesLoading,
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

  const {
    data: meetingsData,
    isLoading: isMeetingsLoading,
    isFetching: isMeetingsFetching,
    isError: isMeetingsError,
    error: meetingsError,
    refetch: refetchMeetings,
    fetchNextPage: fetchNextMeetingsPage,
    hasNextPage: hasMoreMeetings,
    isFetchingNextPage: isFetchingMoreMeetings,
  } = useGetMeetingsInfiniteQuery(
    { limit: MEETINGS_PAGE_SIZE },
    { skip: !userId, refetchOnMountOrArgChange: true },
  );

  const spaces = useMemo(
    () => spacesData?.pages.flatMap((page) => page.spaces) ?? [],
    [spacesData],
  );

  const meetings = useMemo(
    () => meetingsData?.pages.flatMap((page) => page.meetings) ?? [],
    [meetingsData],
  );

  useEffect(() => {
    if (!meetings.length) {
      return;
    }

    setMeetingSpaceIds((current) => {
      let changed = false;
      const next = { ...current };

      for (const meeting of meetings) {
        if (next[meeting.id] !== undefined) {
          continue;
        }
        if (meeting.spaceId) {
          next[meeting.id] = [meeting.spaceId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [meetings]);

  const updateSpacesScrollState = () => {
    const rail = spacesRailRef.current;
    if (!rail) {
      setCanScrollSpacesLeft(false);
      setCanScrollSpacesRight(false);
      return;
    }

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollSpacesLeft(rail.scrollLeft > 4);
    setCanScrollSpacesRight(maxScroll > 4 && rail.scrollLeft < maxScroll - 4);
  };

  useEffect(() => {
    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    updateSpacesScrollState();
    const onScroll = () => updateSpacesScrollState();
    rail.addEventListener('scroll', onScroll, { passive: true });

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSpacesScrollState) : null;
    observer?.observe(rail);

    return () => {
      rail.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [spaces.length, hasMoreSpaces, isSpacesLoading, isSpacesError, userId]);

  const scrollSpacesBy = (direction: -1 | 1) => {
    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    const amount = Math.max(220, Math.round(rail.clientWidth * 0.7));
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const handleSpacesPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, label')) {
      return;
    }

    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    spacesDragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
    };
    setIsDraggingSpaces(true);
    rail.setPointerCapture(event.pointerId);
  };

  const handleSpacesPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!spacesDragRef.current.active) {
      return;
    }

    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    const delta = event.clientX - spacesDragRef.current.startX;
    rail.scrollLeft = spacesDragRef.current.scrollLeft - delta;
  };

  const handleSpacesPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!spacesDragRef.current.active) {
      return;
    }

    spacesDragRef.current.active = false;
    setIsDraggingSpaces(false);

    const rail = spacesRailRef.current;
    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
  };

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedId) ?? null,
    [meetings, selectedId],
  );

  const spacesErrorMessage = getErrorMessage(spacesError, 'Unable to load spaces');
  const meetingsErrorMessage = getErrorMessage(meetingsError, 'Unable to load meetings');

  const toggleMeetingSpace = (meetingId: string, spaceId: string) => {
    setMeetingSpaceIds((current) => {
      const existing = current[meetingId] ?? [];
      const nextIds = existing.includes(spaceId) ? [] : [spaceId];

      return {
        ...current,
        [meetingId]: nextIds,
      };
    });
  };

  if (selectedId) {
    return (
      <MeetingDetailView
        meetingId={selectedId}
        preview={selectedMeeting}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const showMeetingsInitialLoading = Boolean(userId) && isMeetingsLoading && meetings.length === 0;
  const showMeetingsError = Boolean(userId) && isMeetingsError && meetings.length === 0;
  const showMeetingsEmpty =
    Boolean(userId) && !isMeetingsLoading && !isMeetingsError && meetings.length === 0;

  return (
    <section className="meetings-page" aria-label="Meetings">
      <header className="meetings-page__header">
        <div className="meetings-page__title">
          <span className="meetings-page__icon" aria-hidden="true">
            <FiVideo size={18} />
          </span>
          <div>
            <h1>Meetings</h1>
            <p>Recordings, summaries, and shared sessions</p>
          </div>
        </div>
        <div className="meetings-page__header-actions">
          <div className="meetings-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === 'grid' ? 'is-active' : undefined}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
            >
              <FiGrid size={16} />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : undefined}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              onClick={() => setViewMode('list')}
            >
              <FiList size={16} />
            </button>
          </div>
        </div>
      </header>

      <section className="meetings-spaces" aria-label="Spaces">
        <div className="meetings-spaces__head">
          <h2>Spaces</h2>
        </div>
        <div className="meetings-spaces__track">
          <button
            type="button"
            className="meetings-spaces__nav meetings-spaces__nav--prev"
            aria-label="Scroll spaces left"
            disabled={!canScrollSpacesLeft}
            onClick={() => scrollSpacesBy(-1)}
          >
            <FiChevronLeft size={18} aria-hidden="true" />
          </button>

          <div
            ref={spacesRailRef}
            className={`meetings-spaces__rail${isDraggingSpaces ? ' is-dragging' : ''}`}
            onPointerDown={handleSpacesPointerDown}
            onPointerMove={handleSpacesPointerMove}
            onPointerUp={handleSpacesPointerUp}
            onPointerCancel={handleSpacesPointerUp}
          >
            {!userId ? (
              <div className="meetings-space-card meetings-space-card--state">
                <FiAlertCircle aria-hidden="true" size={16} />
                <p>Sign in to see your spaces.</p>
              </div>
            ) : null}

            {userId && isSpacesLoading && spaces.length === 0
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="meetings-space-card meetings-space-card--skeleton" aria-hidden="true" />
                ))
              : null}

            {userId && isSpacesError && spaces.length === 0 ? (
              <div className="meetings-space-card meetings-space-card--state">
                <FiAlertCircle aria-hidden="true" size={16} />
                <p>{spacesErrorMessage}</p>
                <button type="button" onClick={() => void refetchSpaces()}>
                  <FiRefreshCw aria-hidden="true" size={13} />
                  Retry
                </button>
              </div>
            ) : null}

            {userId && !isSpacesLoading && !isSpacesError && spaces.length === 0 ? (
              <div className="meetings-space-card meetings-space-card--state">
                <FiFolder aria-hidden="true" size={16} />
                <p>No spaces yet.</p>
              </div>
            ) : null}

            {spaces.map((space) => (
              <article key={space.id} className="meetings-space-card">
                <span className="meetings-space-card__icon" aria-hidden="true">
                  <FiFolder size={16} />
                </span>
                <div className="meetings-space-card__body">
                  <strong>{space.name}</strong>
                  <p>{space.description || 'No description'}</p>
                  <span className="meetings-space-card__meta">
                    {space.tasksCount} {space.tasksCount === 1 ? 'task' : 'tasks'} · {space.updatedAtLabel}
                  </span>
                </div>
              </article>
            ))}

            {hasMoreSpaces ? (
              <button
                type="button"
                className="meetings-space-card meetings-space-card--more"
                disabled={isFetchingMoreSpaces}
                onClick={() => void fetchNextSpacesPage()}
              >
                {isFetchingMoreSpaces ? 'Loading…' : 'More spaces'}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="meetings-spaces__nav meetings-spaces__nav--next"
            aria-label="Scroll spaces right"
            disabled={!canScrollSpacesRight}
            onClick={() => scrollSpacesBy(1)}
          >
            <FiChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {!userId ? (
        <div className="meetings-empty" role="alert">
          <FiAlertCircle aria-hidden="true" size={28} />
          <h2>Sign in required</h2>
          <p>Sign in again to load your meeting recordings.</p>
        </div>
      ) : null}

      {showMeetingsInitialLoading ? (
        <div className={`meetings-grid${viewMode === 'list' ? ' is-list' : ''}`} aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="meeting-card meeting-card--skeleton" aria-hidden="true">
              <div className="meeting-card__thumb meeting-card__thumb--skeleton" />
              <div className="meeting-card__body">
                <span className="meeting-card__skeleton-line is-title" />
                <span className="meeting-card__skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {showMeetingsError ? (
        <div className="meetings-empty meetings-empty--error" role="alert">
          <FiAlertCircle aria-hidden="true" size={28} />
          <h2>Unable to load meetings</h2>
          <p>{meetingsErrorMessage}</p>
          <button type="button" className="home-retry-button" onClick={() => void refetchMeetings()}>
            <FiRefreshCw aria-hidden="true" size={14} />
            Retry
          </button>
        </div>
      ) : null}

      {showMeetingsEmpty ? (
        <div className="meetings-empty">
          <FiVideo aria-hidden="true" size={28} />
          <h2>No meetings yet</h2>
          <p>Recordings from your Buddy meeting extension will show up here.</p>
        </div>
      ) : null}

      {meetings.length > 0 ? (
        <>
          {isMeetingsError ? (
            <div className="meetings-inline-banner" role="alert">
              <FiAlertCircle aria-hidden="true" size={15} />
              <p>{meetingsErrorMessage}</p>
              <button type="button" onClick={() => void refetchMeetings()}>
                <FiRefreshCw aria-hidden="true" size={13} />
                Retry
              </button>
            </div>
          ) : null}

          <div className={`meetings-grid${viewMode === 'list' ? ' is-list' : ''}`}>
            {meetings.map((meeting) => {
              const selectedSpaceId = meetingSpaceIds[meeting.id]?.[0] ?? meeting.spaceId;
              const hasAssociatedSpace = Boolean(selectedSpaceId);

              return (
                <article
                  key={meeting.id}
                  className={`meeting-card${menuMeetingId === meeting.id ? ' is-menu-open' : ''}`}
                >
                  <button
                    type="button"
                    className="meeting-card__open meeting-card__open--media"
                    onClick={() => setSelectedId(meeting.id)}
                  >
                    <MeetingThumbnail meeting={meeting} />
                  </button>

                  <div className="meeting-card__bottom">
                    <button
                      type="button"
                      className="meeting-card__open meeting-card__open--body"
                      onClick={() => setSelectedId(meeting.id)}
                    >
                      <div className="meeting-card__body">
                        <div className="meeting-card__title-row">
                          <h2>{meeting.title}</h2>
                          {hasAssociatedSpace ? (
                            <span className="meeting-card__space-count">1 space</span>
                          ) : null}
                        </div>
                        <div className="meeting-card__meta">
                          <span>
                            <FiCalendar aria-hidden="true" size={13} />
                            {meeting.dateLabel}
                          </span>
                          <span>
                            <FiClock aria-hidden="true" size={13} />
                            {meeting.startLabel}
                          </span>
                          <span>
                            <FiClock aria-hidden="true" size={13} />
                            {meeting.durationLabel}
                          </span>
                          <span>
                            <FiVideo aria-hidden="true" size={13} />
                            {meeting.providerLabel}
                          </span>
                        </div>
                      </div>
                    </button>

                    <MeetingSpaceMenu
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                      isOpen={menuMeetingId === meeting.id}
                      spaces={spaces}
                      selectedSpaceIds={
                        meetingSpaceIds[meeting.id] ?? (meeting.spaceId ? [meeting.spaceId] : [])
                      }
                      isSpacesLoading={isSpacesLoading}
                      isSpacesError={isSpacesError}
                      spacesErrorMessage={spacesErrorMessage}
                      hasMoreSpaces={Boolean(hasMoreSpaces)}
                      isFetchingMoreSpaces={isFetchingMoreSpaces}
                      onOpen={() => setMenuMeetingId(meeting.id)}
                      onClose={() => setMenuMeetingId(null)}
                      onToggleSpace={(spaceId) => toggleMeetingSpace(meeting.id, spaceId)}
                      onRetrySpaces={() => void refetchSpaces()}
                      onLoadMoreSpaces={() => void fetchNextSpacesPage()}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="meetings-pagination">
            {hasMoreMeetings ? (
              <button
                type="button"
                className="home-load-more"
                disabled={isFetchingMoreMeetings}
                onClick={() => void fetchNextMeetingsPage()}
              >
                {isFetchingMoreMeetings ? 'Loading…' : 'Load more meetings'}
              </button>
            ) : null}

            {isMeetingsFetching && !isMeetingsLoading && !isFetchingMoreMeetings ? (
              <p className="home-sync-hint">Refreshing…</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
};
