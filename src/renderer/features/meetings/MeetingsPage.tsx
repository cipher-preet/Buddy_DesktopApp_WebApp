import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
  FiTrash2,
  FiVideo,
  FiX,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import type { WorkspaceSpace } from '@/features/dashboard/homeTypes';
import type { MeetingDetailTab, MeetingFocusTarget } from '@/features/search/searchTypes';
import { getApiErrorMessage as getErrorMessage } from '@/services/apiErrors';
import { useGetUserSpacesInfiniteQuery } from '@/services/homeApi';
import { useAssignMeetingSpaceMutation, useGetMeetingsInfiniteQuery } from '@/services/meetingsApi';

import { DeleteMeetingDialog, type DeleteMeetingTarget } from './DeleteMeetingDialog';
import { MeetingDetailView } from './MeetingDetailView';
import type { MeetingListItem } from './meetingsApiTypes';

type ViewMode = 'grid' | 'list';

const SPACES_PAGE_SIZE = 12;
const MEETINGS_PAGE_SIZE = 12;
const NEXT_PAGE_SKELETONS = 3;

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
  pendingSpaceId: string | null;
  assignError: string | null;
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
  pendingSpaceId,
  assignError,
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
  const popoverRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [query, setQuery] = useState('');
  const [alignEnd, setAlignEnd] = useState(false);
  const isAssigning = Boolean(pendingSpaceId);

  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    if (!isOpen) {
      setAlignEnd(false);
      return;
    }

    const anchor = menuRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) {
      return;
    }

    const boundary = anchor.closest('.meetings-grid') ?? document.documentElement;
    const boundaryRight = Math.min(boundary.getBoundingClientRect().right, window.innerWidth);
    const anchorLeft = anchor.getBoundingClientRect().left;
    setAlignEnd(anchorLeft + popover.offsetWidth > boundaryRight - 8);
  }, [isOpen]);

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
          ref={popoverRef}
          className={`meeting-space-popover${alignEnd ? ' is-align-end' : ''}`}
          role="dialog"
          aria-label={`Associate ${meetingTitle} with spaces`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="meeting-space-popover__head">
            <strong>Associate spaces</strong>
            <span>{selectedSpaceIds.length > 0 ? '1 selected' : 'None selected'}</span>
          </div>

          {assignError ? (
            <div className="meeting-space-popover__error" role="alert">
              <FiAlertCircle aria-hidden="true" size={14} />
              <p>{assignError}</p>
            </div>
          ) : null}

          <label className="meeting-space-popover__search">
            <FiSearch aria-hidden="true" size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search spaces"
              aria-label="Search spaces"
              disabled={isAssigning}
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
              const isPending = pendingSpaceId === space.id;
              const inputId = `meeting-${meetingId}-space-${space.id}`;

              return (
                <label
                  key={space.id}
                  className={`meeting-space-option${isPending ? ' is-loading' : ''}${
                    isAssigning && !isPending ? ' is-disabled' : ''
                  }`}
                  htmlFor={inputId}
                  aria-busy={isPending}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    disabled={isAssigning}
                    onChange={() => onToggleSpace(space.id)}
                  />
                  <span className="meeting-space-option__check" aria-hidden="true">
                    {isPending ? <span className="meeting-space-option__spinner" /> : null}
                  </span>
                  <span className="meeting-space-option__icon" aria-hidden="true">
                    <FiFolder size={14} />
                  </span>
                  <span className="meeting-space-option__text">
                    <strong>{space.name}</strong>
                    <small>
                      {isPending
                        ? 'Updating…'
                        : space.description || 'No description'}
                    </small>
                  </span>
                </label>
              );
            })}

            {hasMoreSpaces ? (
              <button
                type="button"
                className="meeting-space-popover__more"
                disabled={isFetchingMoreSpaces || isAssigning}
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

type MeetingsPageProps = {
  focusTarget?: MeetingFocusTarget | null;
  onFocusTargetHandled?: () => void;
};

export const MeetingsPage = ({ focusTarget = null, onFocusTargetHandled }: MeetingsPageProps) => {
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(() => focusTarget?.meetingId ?? null);
  const [detailTab, setDetailTab] = useState<MeetingDetailTab | undefined>(() => focusTarget?.tab);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }
    setSelectedId(focusTarget.meetingId);
    setDetailTab(focusTarget.tab);
    onFocusTargetHandled?.();
  }, [focusTarget, onFocusTargetHandled]);
  const [menuMeetingId, setMenuMeetingId] = useState<string | null>(null);
  const [filterSpaceId, setFilterSpaceId] = useState<string | null>(null);
  const [meetingSpaceIds, setMeetingSpaceIds] = useState<Record<string, string[]>>({});
  const [meetingSpaceNames, setMeetingSpaceNames] = useState<Record<string, string>>({});
  const [pendingByMeeting, setPendingByMeeting] = useState<Record<string, string>>({});
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [canScrollSpacesLeft, setCanScrollSpacesLeft] = useState(false);
  const [canScrollSpacesRight, setCanScrollSpacesRight] = useState(false);
  const [isDraggingSpaces, setIsDraggingSpaces] = useState(false);
  const spacesRailRef = useRef<HTMLDivElement>(null);
  const spacesDragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    spaceId: null as string | null,
  });
  const [assignMeetingSpace] = useAssignMeetingSpaceMutation();

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
    {
      limit: MEETINGS_PAGE_SIZE,
      ...(filterSpaceId ? { spaceId: filterSpaceId } : {}),
    },
    { skip: !userId, refetchOnMountOrArgChange: true },
  );

  const [deleteTarget, setDeleteTarget] = useState<DeleteMeetingTarget | null>(null);
  const [isMoreMeetingsError, setIsMoreMeetingsError] = useState(false);

  useEffect(() => {
    setIsMoreMeetingsError(false);
  }, [filterSpaceId]);

  const loadMoreMeetings = async () => {
    setIsMoreMeetingsError(false);
    const result = await fetchNextMeetingsPage();
    if (result.isError) {
      setIsMoreMeetingsError(true);
    }
  };

  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreStateRef = useRef({ canLoad: false, fetchNext: loadMoreMeetings });
  loadMoreStateRef.current = {
    canLoad: Boolean(hasMoreMeetings) && !isFetchingMoreMeetings && !isMoreMeetingsError,
    fetchNext: loadMoreMeetings,
  };

  // Auto-load the next page when the sentinel below the grid scrolls into view.
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && loadMoreStateRef.current.canLoad) {
          void loadMoreStateRef.current.fetchNext();
        }
      },
      { rootMargin: '0px 0px 320px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMeetings, isFetchingMoreMeetings, selectedId]);

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

    setMeetingSpaceNames((current) => {
      let changed = false;
      const next = { ...current };

      for (const meeting of meetings) {
        if (!meeting.spaceId || next[meeting.id]) {
          continue;
        }
        const match = spaces.find((space) => space.id === meeting.spaceId);
        if (match) {
          next[meeting.id] = match.name;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [meetings, spaces]);

  const updateSpacesScrollState = () => {
    const rail = spacesRailRef.current;
    if (!rail) {
      setCanScrollSpacesLeft(false);
      setCanScrollSpacesRight(false);
      return;
    }

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanScrollSpacesLeft(rail.scrollLeft > 2);
    setCanScrollSpacesRight(maxScroll > 2 && rail.scrollLeft < maxScroll - 2);
  };

  useEffect(() => {
    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    const refresh = () => updateSpacesScrollState();
    refresh();
    const rafId = window.requestAnimationFrame(refresh);
    const timeoutId = window.setTimeout(refresh, 120);

    rail.addEventListener('scroll', refresh, { passive: true });

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null;
    observer?.observe(rail);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      rail.removeEventListener('scroll', refresh);
      observer?.disconnect();
    };
  }, [spaces.length, hasMoreSpaces, isSpacesLoading, isSpacesError, userId]);

  const scrollSpacesBy = (direction: -1 | 1) => {
    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    const amount = Math.max(220, Math.round(rail.clientWidth * 0.7));
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextLeft = Math.min(maxScroll, Math.max(0, rail.scrollLeft + direction * amount));

    rail.scrollTo({ left: nextLeft, behavior: 'smooth' });
    window.setTimeout(updateSpacesScrollState, 320);
  };

  const handleSpacesPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        '.meetings-spaces__nav, .meetings-space-card--more, .meetings-space-card--state button, a, input, textarea, label',
      )
    ) {
      return;
    }

    const rail = spacesRailRef.current;
    if (!rail) {
      return;
    }

    const spaceCard = target?.closest('.meetings-space-card[data-space-id]') as HTMLElement | null;

    spacesDragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      moved: false,
      spaceId: spaceCard?.dataset.spaceId || null,
    };
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
    if (!spacesDragRef.current.moved && Math.abs(delta) > 6) {
      spacesDragRef.current.moved = true;
      setIsDraggingSpaces(true);
    }

    if (spacesDragRef.current.moved) {
      event.preventDefault();
      rail.scrollLeft = spacesDragRef.current.scrollLeft - delta;
    }
  };

  const handleSpacesPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!spacesDragRef.current.active) {
      return;
    }

    const { moved, spaceId } = spacesDragRef.current;
    spacesDragRef.current.active = false;
    spacesDragRef.current.spaceId = null;
    setIsDraggingSpaces(false);

    const rail = spacesRailRef.current;
    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }

    // Pointer capture on the rail swallows the card click — toggle on tap instead.
    if (!moved && spaceId) {
      setFilterSpaceId((current) => (current === spaceId ? null : spaceId));
      setMenuMeetingId(null);
    }

    spacesDragRef.current.moved = false;
  };

  const toggleSpaceFilter = (spaceId: string) => {
    setFilterSpaceId((current) => (current === spaceId ? null : spaceId));
    setMenuMeetingId(null);
  };

  const resetSpaceFilter = () => {
    setFilterSpaceId(null);
    setMenuMeetingId(null);
  };

  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedId) ?? null,
    [meetings, selectedId],
  );

  const spacesErrorMessage = getErrorMessage(spacesError, 'Unable to load spaces');
  const meetingsErrorMessage = getErrorMessage(meetingsError, 'Unable to load meetings');

  const toggleMeetingSpace = async (meetingId: string, spaceId: string) => {
    if (pendingByMeeting[meetingId]) {
      return;
    }

    const currentIds = meetingSpaceIds[meetingId] ?? [];
    const meeting = meetings.find((item) => item.id === meetingId);
    const previousSpaceId = currentIds[0] ?? meeting?.spaceId ?? null;
    const nextSpaceId = previousSpaceId === spaceId ? null : spaceId;
    const nextSpaceName =
      nextSpaceId != null
        ? spaces.find((space) => space.id === nextSpaceId)?.name ?? null
        : null;

    setPendingByMeeting((current) => ({ ...current, [meetingId]: spaceId }));
    setAssignErrors((current) => {
      if (!current[meetingId]) {
        return current;
      }
      const next = { ...current };
      delete next[meetingId];
      return next;
    });

    // Optimistic UI selection
    setMeetingSpaceIds((current) => ({
      ...current,
      [meetingId]: nextSpaceId ? [nextSpaceId] : [],
    }));
    setMeetingSpaceNames((current) => {
      if (nextSpaceId && nextSpaceName) {
        return { ...current, [meetingId]: nextSpaceName };
      }
      const next = { ...current };
      delete next[meetingId];
      return next;
    });

    try {
      const result = await assignMeetingSpace({
        sessionId: meetingId,
        spaceId: nextSpaceId,
        previousSpaceId,
      }).unwrap();

      setMeetingSpaceIds((current) => ({
        ...current,
        [meetingId]: result.spaceId ? [result.spaceId] : [],
      }));

      if (result.spaceId) {
        setMeetingSpaceNames((current) => ({
          ...current,
          [meetingId]:
            result.spaceName ||
            spaces.find((space) => space.id === result.spaceId)?.name ||
            'Space',
        }));
      } else {
        setMeetingSpaceNames((current) => {
          const next = { ...current };
          delete next[meetingId];
          return next;
        });
      }
    } catch (error) {
      setMeetingSpaceIds((current) => ({
        ...current,
        [meetingId]: previousSpaceId ? [previousSpaceId] : [],
      }));
      setMeetingSpaceNames((current) => {
        if (previousSpaceId) {
          const restoredName =
            current[meetingId] ||
            spaces.find((space) => space.id === previousSpaceId)?.name;
          if (restoredName) {
            return { ...current, [meetingId]: restoredName };
          }
        }
        const next = { ...current };
        delete next[meetingId];
        return next;
      });
      setAssignErrors((current) => ({
        ...current,
        [meetingId]: getErrorMessage(error, 'Unable to update meeting space'),
      }));
    } finally {
      setPendingByMeeting((current) => {
        const next = { ...current };
        delete next[meetingId];
        return next;
      });
    }
  };

  if (selectedId) {
    return (
      <div className="meeting-detail-host">
        <MeetingDetailView
          key={`${selectedId}:${detailTab ?? 'summary'}`}
          meetingId={selectedId}
          preview={selectedMeeting}
          initialTab={detailTab}
          onBack={() => {
            setSelectedId(null);
            setDetailTab(undefined);
          }}
          onDeleted={() => {
            setSelectedId(null);
            setDetailTab(undefined);
          }}
        />
      </div>
    );
  }

  const showMeetingsInitialLoading = Boolean(userId) && isMeetingsLoading && meetings.length === 0;
  const showMeetingsError = Boolean(userId) && isMeetingsError && meetings.length === 0;
  const showMeetingsEmpty =
    Boolean(userId) && !isMeetingsLoading && !isMeetingsError && meetings.length === 0;
  const filterSpaceName = filterSpaceId
    ? spaces.find((space) => space.id === filterSpaceId)?.name ?? 'Selected space'
    : null;

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
          {filterSpaceId ? (
            <button
              type="button"
              className="meetings-spaces__reset"
              onClick={resetSpaceFilter}
              aria-label="Clear space filter"
            >
              <FiX aria-hidden="true" size={14} />
              Clear filter
            </button>
          ) : (
            <span className="meetings-spaces__hint">Tap a space to filter meetings</span>
          )}
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

            {spaces.map((space) => {
              const isSelected = filterSpaceId === space.id;

              return (
                <div
                  key={space.id}
                  role="button"
                  tabIndex={0}
                  data-space-id={space.id}
                  className={`meetings-space-card${isSelected ? ' is-selected' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={
                    isSelected
                      ? `Clear filter for ${space.name}`
                      : `Filter meetings by ${space.name}`
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleSpaceFilter(space.id);
                    }
                  }}
                >
                  <span className="meetings-space-card__icon" aria-hidden="true">
                    <FiFolder size={16} />
                  </span>
                  <span className="meetings-space-card__body">
                    <strong>{space.name}</strong>
                    <span>{space.description || 'No description'}</span>
                    <span className="meetings-space-card__meta">
                      {space.tasksCount} {space.tasksCount === 1 ? 'task' : 'tasks'} ·{' '}
                      {space.updatedAtLabel}
                    </span>
                  </span>
                </div>
              );
            })}

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
          <h2>{filterSpaceId ? 'Unable to load filtered meetings' : 'Unable to load meetings'}</h2>
          <p>{meetingsErrorMessage}</p>
          <div className="meetings-empty__actions">
            <button type="button" className="home-retry-button" onClick={() => void refetchMeetings()}>
              <FiRefreshCw aria-hidden="true" size={14} />
              Retry
            </button>
            {filterSpaceId ? (
              <button type="button" className="home-retry-button" onClick={resetSpaceFilter}>
                <FiX aria-hidden="true" size={14} />
                Clear filter
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showMeetingsEmpty ? (
        <div className="meetings-empty">
          <FiVideo aria-hidden="true" size={28} />
          <h2>{filterSpaceId ? 'No meetings in this space' : 'No meetings yet'}</h2>
          <p>
            {filterSpaceId
              ? `Nothing is associated with ${filterSpaceName || 'this space'} yet. Associate a meeting from the card menu, or clear the filter.`
              : 'Recordings from your KukuNotes meeting extension will show up here.'}
          </p>
          {filterSpaceId ? (
            <button type="button" className="home-retry-button" onClick={resetSpaceFilter}>
              <FiX aria-hidden="true" size={14} />
              Clear filter
            </button>
          ) : null}
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
              const spaceName =
                meetingSpaceNames[meeting.id] ||
                (selectedSpaceId
                  ? spaces.find((space) => space.id === selectedSpaceId)?.name
                  : null);

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

                  <button
                    type="button"
                    className="meeting-card__delete"
                    aria-label={`Delete ${meeting.title}`}
                    title="Delete meeting"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuMeetingId(null);
                      setDeleteTarget({
                        id: meeting.id,
                        title: meeting.title,
                        spaceId: selectedSpaceId ?? null,
                      });
                    }}
                  >
                    <FiTrash2 aria-hidden="true" size={15} />
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
                          {spaceName ? (
                            <span className="meeting-card__space-count" title={spaceName}>
                              <FiFolder aria-hidden="true" size={11} />
                              {spaceName}
                            </span>
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
                      pendingSpaceId={pendingByMeeting[meeting.id] ?? null}
                      assignError={assignErrors[meeting.id] ?? null}
                      isSpacesLoading={isSpacesLoading}
                      isSpacesError={isSpacesError}
                      spacesErrorMessage={spacesErrorMessage}
                      hasMoreSpaces={Boolean(hasMoreSpaces)}
                      isFetchingMoreSpaces={isFetchingMoreSpaces}
                      onOpen={() => setMenuMeetingId(meeting.id)}
                      onClose={() => setMenuMeetingId(null)}
                      onToggleSpace={(spaceId) => {
                        void toggleMeetingSpace(meeting.id, spaceId);
                      }}
                      onRetrySpaces={() => void refetchSpaces()}
                      onLoadMoreSpaces={() => void fetchNextSpacesPage()}
                    />
                  </div>
                </article>
              );
            })}

            {isFetchingMoreMeetings
              ? Array.from({ length: NEXT_PAGE_SKELETONS }, (_, index) => (
                  <div
                    key={`next-skeleton-${index}`}
                    className="meeting-card meeting-card--skeleton"
                    aria-hidden="true"
                  >
                    <div className="meeting-card__thumb meeting-card__thumb--skeleton" />
                    <div className="meeting-card__body">
                      <span className="meeting-card__skeleton-line is-title" />
                      <span className="meeting-card__skeleton-line" />
                    </div>
                  </div>
                ))
              : null}
          </div>

          <div className="meetings-pagination" aria-live="polite">
            <div ref={loadMoreSentinelRef} className="meetings-pagination__sentinel" aria-hidden="true" />

            {isFetchingMoreMeetings ? (
              <p className="meetings-pagination__status" aria-busy="true">
                <span className="home-spinner" aria-hidden="true" />
                Loading more meetings…
              </p>
            ) : null}

            {isMoreMeetingsError && !isFetchingMoreMeetings ? (
              <div className="meetings-inline-banner" role="alert">
                <FiAlertCircle aria-hidden="true" size={15} />
                <p>Couldn’t load more meetings.</p>
                <button type="button" onClick={() => void loadMoreMeetings()}>
                  <FiRefreshCw aria-hidden="true" size={13} />
                  Retry
                </button>
              </div>
            ) : null}

            {hasMoreMeetings && !isFetchingMoreMeetings && !isMoreMeetingsError ? (
              <button
                type="button"
                className="home-load-more"
                onClick={() => void loadMoreMeetings()}
              >
                Load more meetings
              </button>
            ) : null}

            {!hasMoreMeetings && !isMeetingsFetching && meetings.length > MEETINGS_PAGE_SIZE ? (
              <p className="meetings-pagination__end">You’ve reached the end · {meetings.length} meetings</p>
            ) : null}

            {isMeetingsFetching && !isMeetingsLoading && !isFetchingMoreMeetings ? (
              <p className="home-sync-hint">Refreshing…</p>
            ) : null}
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <DeleteMeetingDialog
          meeting={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      ) : null}
    </section>
  );
};
