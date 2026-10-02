import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiCornerDownLeft,
  FiFileText,
  FiFolder,
  FiSearch,
  FiVideo,
  FiX,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import {
  toNavigationTarget,
  type SearchNavigationTarget,
  type SearchResultItem,
  type SearchResultType,
} from '@/features/search/searchTypes';
import { useSearchWorkspaceQuery } from '@/services/searchApi';

type GlobalSearchProps = {
  onNavigate: (target: SearchNavigationTarget) => void;
};

type TypeFilter = 'all' | SearchResultType;

const DEBOUNCE_MS = 200;
const RECENT_LIMIT = 6;

const TYPE_META: Record<SearchResultType, { label: string; plural: string; icon: IconType }> = {
  space: { label: 'Space', plural: 'Spaces', icon: FiFolder },
  task: { label: 'Task', plural: 'Tasks', icon: FiCheckSquare },
  note: { label: 'Note', plural: 'Notes', icon: FiFileText },
  meeting: { label: 'Meeting', plural: 'Meetings', icon: FiVideo },
  event: { label: 'Event', plural: 'Events', icon: FiCalendar },
};

const FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'note', label: 'Notes' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'space', label: 'Spaces' },
  { id: 'event', label: 'Events' },
];

const SUGGESTIONS = [
  'Tasks due today',
  'Overdue tasks',
  'Meetings this week',
  'Notes yesterday',
  'Events tomorrow',
  'Urgent tasks',
];

const recentKey = (userId: string) => `buddy.search.recent.${userId || 'anon'}`;

const readRecent = (userId: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
};

const writeRecent = (userId: string, items: string[]) => {
  try {
    localStorage.setItem(recentKey(userId), JSON.stringify(items.slice(0, RECENT_LIMIT)));
  } catch {
    // Storage can be unavailable (private mode / quota); recent searches are optional.
  }
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlight = (text: string, terms: string[]): ReactNode => {
  if (!text || terms.length === 0) {
    return text;
  }
  const pattern = new RegExp(`(${terms.map(escapeRegex).sort((a, b) => b.length - a.length).join('|')})`, 'ig');
  const parts = text.split(pattern);
  return parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>,
  );
};

const toLocalDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);

const formatResultDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = toLocalDate(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const startOf = (input: Date) => new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const diffDays = Math.round((startOf(date) - startOf(new Date())) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: Math.abs(diffDays) < 7 ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  });
};

const DATE_PREFIX: Record<NonNullable<SearchResultItem['dateKind']>, string> = {
  created: '',
  due: 'Due ',
  started: '',
  scheduled: '',
  updated: 'Updated ',
};

const resultMeta = (item: SearchResultItem) => {
  const parts: string[] = [];
  if (item.spaceName && item.type !== 'space') {
    parts.push(item.spaceName);
  } else if (!item.spaceName && item.meetingId && item.type !== 'meeting') {
    parts.push('From meeting');
  }
  const dateLabel = formatResultDate(item.date);
  if (dateLabel) {
    parts.push(`${item.dateKind ? DATE_PREFIX[item.dateKind] : ''}${dateLabel}`);
  }
  if (item.timeLabel) {
    parts.push(item.timeLabel);
  }
  return parts.join(' · ');
};

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const GlobalSearch = ({ onNavigate }: GlobalSearchProps) => {
  const userId = useAppSelector((state) => state.auth.user?.userId) || '';
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent(userId));
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length > 0 || typeFilter !== 'all';
  const isTyping = query.trim() !== debouncedQuery;

  const { data, isFetching, isError, refetch } = useSearchWorkspaceQuery(
    {
      userId,
      q: debouncedQuery,
      types: typeFilter === 'all' ? undefined : [typeFilter],
    },
    { skip: !userId || !isOpen || !hasQuery },
  );

  useEffect(() => {
    setRecent(readRecent(userId));
  }, [userId]);

  const results = useMemo(() => {
    if (!hasQuery || !data) {
      return [] as SearchResultItem[];
    }
    return data.groups.flatMap((group) => group.items);
  }, [data, hasQuery]);

  const terms = data?.query.terms ?? [];

  useEffect(() => {
    setActiveIndex(0);
  }, [data, typeFilter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(`[data-search-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const rememberQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      setRecent((current) => {
        const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          RECENT_LIMIT,
        );
        writeRecent(userId, next);
        return next;
      });
    },
    [userId],
  );

  const openResult = (item: SearchResultItem) => {
    const target = toNavigationTarget(item);
    if (!target) {
      return;
    }
    rememberQuery(query);
    setIsOpen(false);
    inputRef.current?.blur();
    onNavigate(target);
  };

  const applyQuery = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    setRecent([]);
    writeRecent(userId, []);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (query) {
        setQuery('');
      } else {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (!isOpen) {
      setIsOpen(true);
    }
    if (results.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) {
        openResult(item);
      }
    }
  };

  const filters = data?.query;
  const understood = hasQuery && filters
    ? [
        filters.dateRange ? { icon: FiCalendar, label: filters.dateRange.label } : null,
        filters.timeLabel ? { icon: FiClock, label: `Around ${filters.timeLabel}` } : null,
        filters.status ? { icon: FiCheckSquare, label: filters.status[0].toUpperCase() + filters.status.slice(1) } : null,
        filters.priority ? { icon: FiAlertCircle, label: `${filters.priority[0].toUpperCase()}${filters.priority.slice(1)} priority` } : null,
        ...filters.types.map((type) => ({ icon: TYPE_META[type].icon, label: TYPE_META[type].plural })),
      ].filter((chip): chip is { icon: IconType; label: string } => chip !== null)
    : [];

  const showLoading = hasQuery && (isFetching || isTyping);
  const listboxId = 'global-search-results';
  let runningIndex = -1;

  return (
    <div className="global-search" ref={rootRef} data-open={isOpen ? 'true' : undefined}>
      <label className="search-field">
        <FiSearch aria-hidden="true" size={21} />
        <input
          ref={inputRef}
          value={query}
          placeholder="Search tasks, notes, meetings…"
          aria-label="Search tasks, notes, meetings, spaces and events"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={results[activeIndex] ? `search-option-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {showLoading ? <span className="global-search__spinner" aria-hidden="true" /> : null}
        {query ? (
          <button
            className="global-search__clear"
            type="button"
            aria-label="Clear search"
            onClick={() => applyQuery('')}
          >
            <FiX aria-hidden="true" size={15} />
          </button>
        ) : (
          <kbd>CtrlK</kbd>
        )}
      </label>

      {isOpen ? (
        <div className="global-search__panel" role="dialog" aria-label="Search results">
          <div className="global-search__filters" role="toolbar" aria-label="Filter by type">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className="global-search__chip"
                data-active={typeFilter === filter.id ? 'true' : undefined}
                onClick={() => {
                  setTypeFilter(filter.id);
                  inputRef.current?.focus();
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {understood.length > 0 ? (
            <div className="global-search__understood" aria-live="polite">
              <span>Filtering by</span>
              {understood.map(({ icon: Icon, label }) => (
                <span className="global-search__token" key={label}>
                  <Icon aria-hidden="true" size={12} />
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="global-search__body" ref={listRef} id={listboxId} role="listbox">
            {!hasQuery ? (
              <div className="global-search__home">
                {recent.length > 0 ? (
                  <section>
                    <header className="global-search__section-head">
                      <span>Recent searches</span>
                      <button type="button" onClick={clearRecent}>
                        Clear
                      </button>
                    </header>
                    <div className="global-search__suggestions">
                      {recent.map((item) => (
                        <button key={item} type="button" onClick={() => applyQuery(item)}>
                          <FiClock aria-hidden="true" size={13} />
                          {item}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
                <section>
                  <header className="global-search__section-head">
                    <span>Try searching</span>
                  </header>
                  <div className="global-search__suggestions">
                    {SUGGESTIONS.map((item) => (
                      <button key={item} type="button" onClick={() => applyQuery(item)}>
                        <FiSearch aria-hidden="true" size={13} />
                        {item}
                      </button>
                    ))}
                  </div>
                </section>
                <p className="global-search__hint">
                  Combine keywords with dates and times — e.g. <em>“budget review last week”</em>,{' '}
                  <em>“call at 3pm tomorrow”</em> or <em>“notes 15 sep”</em>.
                </p>
              </div>
            ) : isError && !data ? (
              <div className="global-search__state">
                <FiAlertCircle aria-hidden="true" size={20} />
                <p>Search is unavailable right now.</p>
                <button type="button" onClick={() => void refetch()}>
                  Try again
                </button>
              </div>
            ) : !data ? (
              <div className="global-search__skeleton" aria-hidden="true">
                {[0, 1, 2, 3].map((row) => (
                  <span key={row} />
                ))}
              </div>
            ) : results.length === 0 ? (
              !showLoading ? (
                <div className="global-search__state">
                  <FiSearch aria-hidden="true" size={20} />
                  <p>
                    No results{debouncedQuery ? <> for “{debouncedQuery}”</> : null}.
                  </p>
                  <small>Try fewer words, a different date, or another type filter.</small>
                </div>
              ) : (
                <div className="global-search__skeleton" aria-hidden="true">
                  {[0, 1, 2].map((row) => (
                    <span key={row} />
                  ))}
                </div>
              )
            ) : (
              <>
                {data.matchMode === 'any' ? (
                  <p className="global-search__notice">No exact match — showing closest results.</p>
                ) : null}
                {data.groups.map((group) => {
                  const meta = TYPE_META[group.type];
                  return (
                    <section className="global-search__group" key={group.type}>
                      <header className="global-search__section-head">
                        <span>{meta.plural}</span>
                        <small>
                          {group.total > group.items.length
                            ? `${group.items.length} of ${group.total}`
                            : group.total}
                        </small>
                        {group.total > group.items.length && typeFilter !== group.type ? (
                          <button type="button" onClick={() => setTypeFilter(group.type)}>
                            See all
                          </button>
                        ) : null}
                      </header>
                      {group.items.map((item) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        const Icon = meta.icon;
                        const metaLine = resultMeta(item);
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            id={`search-option-${index}`}
                            data-search-index={index}
                            type="button"
                            role="option"
                            aria-selected={index === activeIndex}
                            className="global-search__item"
                            data-type={item.type}
                            onMouseMove={() => setActiveIndex(index)}
                            onClick={() => openResult(item)}
                          >
                            <span className="global-search__icon">
                              <Icon aria-hidden="true" size={16} />
                            </span>
                            <span className="global-search__text">
                              <strong>{highlight(item.title, terms)}</strong>
                              {item.snippet ? <span>{highlight(item.snippet, terms)}</span> : null}
                              {metaLine ? <small>{metaLine}</small> : null}
                            </span>
                            <span className="global-search__badges">
                              {item.status === 'overdue' || item.status === 'done' ? (
                                <em data-status={item.status}>{item.status === 'done' ? 'Done' : 'Overdue'}</em>
                              ) : null}
                              {item.priority ? <em data-priority={item.priority}>{item.priority}</em> : null}
                              <FiCornerDownLeft className="global-search__enter" aria-hidden="true" size={14} />
                            </span>
                          </button>
                        );
                      })}
                    </section>
                  );
                })}
              </>
            )}
          </div>

          <footer className="global-search__footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> navigate
            </span>
            <span>
              <kbd>Enter</kbd> open
            </span>
            <span>
              <kbd>Esc</kbd> close
            </span>
            {data && hasQuery ? <span className="global-search__count">{data.total} results</span> : null}
          </footer>
        </div>
      ) : null}
    </div>
  );
};
