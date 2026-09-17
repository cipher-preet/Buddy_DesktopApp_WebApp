import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  FiAlertCircle,
  FiBell,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiSliders,
  FiX,
} from 'react-icons/fi';

import { useAppSelector } from '@/app/hooks';
import { useToast } from '@/app/ToastProvider';
import { CustomDatePicker, CustomDropdown, CustomTimePicker, TextInput, TextTextarea } from '@/components/common/CustomFormControls';
import {
  emptyDaySummary,
  formatDateLabel,
  getCalendarErrorMessage,
  minutesToApiTimeLabel,
} from '@/features/calendar/calendarMappers';
import type {
  CalendarDayItem,
  CalendarEvent,
  CalendarView,
  DayItemKind,
  DaySummary,
  EventCategory,
  EventDraft,
} from '@/features/calendar/calendarTypes';
import {
  CATEGORY_META,
  DAY_ITEM_META,
  MEETING_CATEGORIES,
  addDays,
  addMonths,
  dayItemsForDate,
  eventsForDate,
  formatFullDate,
  formatMonthYear,
  formatShortWeekday,
  formatTimeRange,
  getDaySummary,
  getMonthGridDates,
  getWeekDates,
  isSameDay,
  isSameMonth,
  meetingsForDate,
  minutesToLabel,
  nowMinutes,
  parseDateKey,
  timeInputToMinutes,
  toDateKey,
  WEEKDAY_LABELS,
} from '@/features/calendar/calendarUtils';
import {
  useCreateCalendarEventMutation,
  useGetCalendarFeedQuery,
} from '@/services/calendarApi';

const VIEW_OPTIONS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

const FILTER_CATEGORIES: EventCategory[] = ['meeting', 'interview'];

const REMIND_BEFORE_OPTIONS = [
  { id: '0', label: 'At start time' },
  { id: '5', label: '5 minutes before' },
  { id: '10', label: '10 minutes before' },
  { id: '15', label: '15 minutes before' },
  { id: '30', label: '30 minutes before' },
];

const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const SLOT_STEP = 30;
const POPUP_WIDTH = 360;
const POPUP_MAX_HEIGHT = 480;

type PopupPosition = { top: number; left: number };

const emptyDraft = (date: string): EventDraft => ({
  title: '',
  description: '',
  location: '',
  date,
  startTime: '09:00',
  endTime: '10:00',
  aiReminder: false,
  aiCalling: false,
  beeping: true,
  remindBeforeMinutes: 10,
});

const AttendeeStack = ({
  attendees,
  max = 3,
}: {
  attendees: NonNullable<CalendarEvent['attendees']>;
  max?: number;
}) => {
  const visible = attendees.slice(0, max);
  const overflow = attendees.length - visible.length;

  return (
    <span className="cal-avatars" aria-hidden="true">
      {visible.map((person) => (
        <span key={person.id} className="cal-avatar" style={{ background: person.color }} title={person.name}>
          {person.initials}
        </span>
      ))}
      {overflow > 0 ? <span className="cal-avatar cal-avatar--more">+{overflow}</span> : null}
    </span>
  );
};

const DaySummaryBadges = ({
  summary,
  dense = false,
}: {
  summary: DaySummary;
  dense?: boolean;
}) => {
  if (summary.total === 0) {
    return null;
  }

  const badges: Array<{ key: keyof DaySummary; label: string; tone: string; count: number }> = [
    { key: 'meetings', label: 'Meetings', tone: 'meeting', count: summary.meetings },
    { key: 'tasks', label: 'Tasks', tone: 'task', count: summary.tasks },
    { key: 'notes', label: 'Notes', tone: 'note', count: summary.notes },
    { key: 'reminders', label: 'Reminders', tone: 'reminder', count: summary.reminders },
  ];

  return (
    <span className={`cal-day-summary${dense ? ' is-dense' : ''}`} aria-label="Day summary">
      {badges
        .filter((badge) => badge.count > 0)
        .map((badge) => (
          <span
            key={badge.key}
            className={`cal-day-summary__badge cal-day-summary__badge--${badge.tone}`}
            title={`${badge.count} ${badge.label}`}
          >
            <span className="cal-day-summary__count">{badge.count}</span>
            <span className="cal-day-summary__label">{badge.label}</span>
            <span className="cal-day-summary__short">{badge.label.charAt(0)}</span>
          </span>
        ))}
    </span>
  );
};

const EventChip = ({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) => {
  const meta = CATEGORY_META[event.category];
  const isBlock = MEETING_CATEGORIES.includes(event.category);

  if (isBlock) {
    return (
      <span className={`cal-event-block cal-event-block--${meta.tone}${compact ? ' is-compact' : ''}`}>
        {event.attendees?.length ? <AttendeeStack attendees={event.attendees} max={compact ? 2 : 3} /> : null}
        <span className="cal-event-block__title">{event.title}</span>
      </span>
    );
  }

  return (
    <span className={`cal-event-chip cal-event-chip--${meta.tone}`}>
      <span aria-hidden="true">{meta.icon}</span>
      <span>{compact ? meta.label : event.title}</span>
    </span>
  );
};

export const CalendarPage = () => {
  const { showToast } = useToast();
  const userId = useAppSelector((state) => state.auth.user?.userId);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  }, []);

  const [cursorDate, setCursorDate] = useState(() => new Date(today));
  const [selectedDate, setSelectedDate] = useState(() => new Date(today));
  const [view, setView] = useState<CalendarView>('month');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPosition>({ top: 24, left: 24 });
  const [popupPinned, setPopupPinned] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<EventCategory[]>(() => [...FILTER_CATEGORIES]);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft(toDateKey(today)));
  const [formError, setFormError] = useState<string | null>(null);
  const [remindMenuOpen, setRemindMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [startTimeMenuOpen, setStartTimeMenuOpen] = useState(false);
  const [endTimeMenuOpen, setEndTimeMenuOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => nowMinutes());

  const closeFormMenus = () => {
    setDateMenuOpen(false);
    setStartTimeMenuOpen(false);
    setEndTimeMenuOpen(false);
    setRemindMenuOpen(false);
  };

  const toolbarRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hidePopupTimer = useRef<number | null>(null);

  const monthGrid = useMemo(() => getMonthGridDates(cursorDate), [cursorDate]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const feedRange = useMemo(() => {
    if (view === 'week') {
      return {
        from: toDateKey(weekDates[0]),
        to: toDateKey(weekDates[6]),
      };
    }

    if (view === 'day') {
      const week = getWeekDates(selectedDate);
      return {
        from: toDateKey(week[0]),
        to: toDateKey(week[6]),
      };
    }

    return {
      from: toDateKey(monthGrid[0]),
      to: toDateKey(monthGrid[monthGrid.length - 1]),
    };
  }, [view, weekDates, selectedDate, monthGrid]);

  const {
    data: feedData,
    isLoading: isFeedLoading,
    isFetching: isFeedFetching,
    isError: isFeedError,
    error: feedError,
    refetch: refetchFeed,
  } = useGetCalendarFeedQuery(
    {
      userId: userId || '',
      from: feedRange.from,
      to: feedRange.to,
    },
    { skip: !userId },
  );

  const [createCalendarEvent, { isLoading: isCreatingEvent }] = useCreateCalendarEventMutation();

  const events = feedData?.events ?? [];
  const dayItems = feedData?.dayItems ?? [];
  const summaryByDate = feedData?.summaryByDate ?? {};

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(nowMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setViewMenuOpen(false);
        setMonthMenuOpen(false);
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(
    () => () => {
      if (hidePopupTimer.current) window.clearTimeout(hidePopupTimer.current);
    },
    [],
  );

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          !FILTER_CATEGORIES.includes(event.category) || activeCategories.includes(event.category),
      ),
    [events, activeCategories],
  );

  const resolveSummary = (date: Date): DaySummary => {
    const key = toDateKey(date);
    return summaryByDate[key] ?? getDaySummary(filteredEvents, dayItems, date) ?? emptyDaySummary();
  };

  const activePopupDate = hoverDate ?? (popupPinned ? selectedDate : null);
  const popupEvents = useMemo(
    () => (activePopupDate ? eventsForDate(filteredEvents, activePopupDate) : []),
    [filteredEvents, activePopupDate],
  );
  const popupItems = useMemo(
    () => (activePopupDate ? dayItemsForDate(dayItems, activePopupDate) : []),
    [dayItems, activePopupDate],
  );
  const popupSummary = useMemo(
    () => (activePopupDate ? resolveSummary(activePopupDate) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePopupDate, filteredEvents, dayItems, summaryByDate],
  );
  const dayViewEvents = useMemo(
    () => eventsForDate(filteredEvents, selectedDate),
    [filteredEvents, selectedDate],
  );
  const dayViewItems = useMemo(
    () => dayItemsForDate(dayItems, selectedDate),
    [dayItems, selectedDate],
  );
  const dayViewSummary = useMemo(
    () => resolveSummary(selectedDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedDate, filteredEvents, dayItems, summaryByDate],
  );

  const timelineSlots = useMemo(() => {
    const slots: number[] = [];
    for (let minute = DAY_START; minute <= DAY_END; minute += SLOT_STEP) {
      slots.push(minute);
    }
    return slots;
  }, []);

  const headerLabel = useMemo(() => {
    if (view === 'month') return formatMonthYear(cursorDate);
    if (view === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return formatFullDate(selectedDate);
  }, [view, cursorDate, weekDates, selectedDate]);

  const monthChoices = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    return Array.from({ length: 18 }, (_, index) => addMonths(base, index));
  }, [today]);

  const feedErrorMessage = !userId
    ? 'Please sign in again to load your calendar.'
    : isFeedError
      ? getCalendarErrorMessage(feedError, 'Unable to load calendar')
      : null;
  const showInitialLoading = Boolean(userId) && isFeedLoading && !feedData;

  const clearHidePopupTimer = () => {
    if (hidePopupTimer.current) {
      window.clearTimeout(hidePopupTimer.current);
      hidePopupTimer.current = null;
    }
  };

  const closePopup = () => {
    clearHidePopupTimer();
    setHoverDate(null);
    setPopupPinned(false);
  };

  const scheduleHidePopup = () => {
    if (popupPinned) return;
    clearHidePopupTimer();
    hidePopupTimer.current = window.setTimeout(() => {
      setHoverDate(null);
    }, 160);
  };

  const positionPopupForCell = (cell: HTMLElement) => {
    const stage = stageRef.current;
    if (!stage) return;

    const cellRect = cell.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const spaceRight = stageRect.right - cellRect.right;
    const preferRight = spaceRight >= POPUP_WIDTH + 16;

    let left = preferRight
      ? cellRect.right - stageRect.left + 12
      : cellRect.left - stageRect.left - POPUP_WIDTH - 12;
    let top = cellRect.top - stageRect.top;

    left = Math.max(8, Math.min(left, stageRect.width - POPUP_WIDTH - 8));
    top = Math.max(8, Math.min(top, stageRect.height - Math.min(POPUP_MAX_HEIGHT, stageRect.height - 16)));

    setPopupPos({ top, left });
  };

  const showPopupForDate = (date: Date, cell: HTMLElement, pinned = false) => {
    clearHidePopupTimer();
    setSelectedDate(date);
    setHoverDate(date);
    setPopupPinned(pinned);
    positionPopupForCell(cell);
  };

  const goToday = () => {
    setCursorDate(new Date(today));
    setSelectedDate(new Date(today));
    closePopup();
  };

  const shiftCursor = (direction: -1 | 1) => {
    closePopup();
    if (view === 'month') {
      setCursorDate((current) => addMonths(current, direction));
      return;
    }
    if (view === 'week') {
      const next = addDays(selectedDate, direction * 7);
      setSelectedDate(next);
      setCursorDate(new Date(next.getFullYear(), next.getMonth(), 1));
      return;
    }
    const next = addDays(selectedDate, direction);
    setSelectedDate(next);
    setCursorDate(new Date(next.getFullYear(), next.getMonth(), 1));
  };

  const toggleCategory = (category: EventCategory) => {
    setActiveCategories((current) => {
      if (current.includes(category)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== category);
      }
      return [...current, category];
    });
  };

  const openAddEvent = (date = selectedDate) => {
    setDraft(emptyDraft(toDateKey(date)));
    setFormError(null);
    closeFormMenus();
    setAddOpen(true);
    closePopup();
  };

  const handleCreateEvent = async (event: FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      setFormError('Title is required.');
      return;
    }

    const startMinutes = timeInputToMinutes(draft.startTime);
    const endMinutes = timeInputToMinutes(draft.endTime);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
      setFormError('End time must be after the start time.');
      return;
    }

    setFormError(null);

    try {
      await createCalendarEvent({
        title,
        description: draft.description.trim(),
        location: draft.location.trim(),
        dateKey: draft.date,
        dateLabel: formatDateLabel(draft.date),
        startTimeLabel: minutesToApiTimeLabel(startMinutes),
        endTimeLabel: minutesToApiTimeLabel(endMinutes),
        aiReminder: draft.aiReminder,
        aiCalling: draft.aiReminder ? draft.aiCalling : false,
        notification: false,
        beeping: draft.aiReminder ? draft.beeping || !draft.aiCalling : false,
        remindBeforeMinutes: draft.aiReminder ? draft.remindBeforeMinutes : 0,
      }).unwrap();

      const eventDate = parseDateKey(draft.date);
      setSelectedDate(eventDate);
      setCursorDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
      setAddOpen(false);
      showToast({ message: 'Event created', type: 'success' });
    } catch (error) {
      const message = getCalendarErrorMessage(error, 'Unable to create event');
      setFormError(message);
      showToast({ message: 'Create failed', description: message, type: 'error' });
    }
  };

  const nowOffset = ((nowTick - DAY_START) / (DAY_END - DAY_START)) * 100;

  const renderDayCell = (date: Date, options?: { showWeekday?: boolean }) => {
    const dayEvents = eventsForDate(filteredEvents, date);
    const meetingPreview = meetingsForDate(filteredEvents, date).slice(0, options?.showWeekday ? 2 : 1);
    const summary = resolveSummary(date);
    const outside = !isSameMonth(date, cursorDate);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const selected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, today);
    const isHovered = activePopupDate ? isSameDay(date, activePopupDate) : false;

    const onCellEnter = (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (view === 'day') return;
      showPopupForDate(date, event.currentTarget, false);
    };

    return (
      <button
        key={toDateKey(date)}
        type="button"
        className={[
          'cal-day-cell',
          outside ? 'is-outside' : '',
          isWeekend ? 'is-weekend' : '',
          selected ? 'is-selected' : '',
          isHovered ? 'is-hovered' : '',
          isToday ? 'is-today' : '',
          summary.total > 0 ? 'has-activity' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseEnter={onCellEnter}
        onMouseLeave={scheduleHidePopup}
        onClick={(event) => {
          setSelectedDate(date);
          setCursorDate(new Date(date.getFullYear(), date.getMonth(), 1));
          showPopupForDate(date, event.currentTarget, true);
        }}
      >
        <span className="cal-day-cell__top">
          {options?.showWeekday ? <small>{formatShortWeekday(date)}</small> : null}
          <strong>{date.getDate()}</strong>
        </span>

        <DaySummaryBadges summary={summary} dense={!options?.showWeekday} />

        {meetingPreview.length > 0 ? (
          <span className="cal-day-cell__events">
            {meetingPreview.map((item) => (
              <EventChip key={item.id} event={item} compact />
            ))}
          </span>
        ) : dayEvents.length > 0 && summary.total === 0 ? (
          <span className="cal-day-cell__events">
            {dayEvents.slice(0, 2).map((item) => (
              <EventChip key={item.id} event={item} compact />
            ))}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <section className="calendar-page" aria-label="Calendar">
      <div className="calendar-inner">
        <div className="calendar-toolbar" ref={toolbarRef}>
          <div className="calendar-toolbar__left">
            <button type="button" className="cal-pill-btn" onClick={goToday}>
              Today
            </button>
            <div className="cal-nav-group" role="group" aria-label="Navigate calendar">
              <button type="button" aria-label="Previous" onClick={() => shiftCursor(-1)}>
                <FiChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next" onClick={() => shiftCursor(1)}>
                <FiChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="cal-month-picker">
              <button
                type="button"
                className="cal-month-trigger"
                aria-expanded={monthMenuOpen}
                onClick={() => {
                  setMonthMenuOpen((open) => !open);
                  setViewMenuOpen(false);
                  setFilterOpen(false);
                }}
              >
                <span>{headerLabel}</span>
                <FiChevronDown size={16} aria-hidden="true" />
              </button>
              {monthMenuOpen ? (
                <div className="cal-menu" role="listbox" aria-label="Select month">
                  {monthChoices.map((month) => {
                    const active = isSameMonth(month, cursorDate);
                    return (
                      <button
                        key={toDateKey(month)}
                        type="button"
                        className={active ? 'is-active' : undefined}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setCursorDate(month);
                          setSelectedDate(new Date(month.getFullYear(), month.getMonth(), 1));
                          setMonthMenuOpen(false);
                          closePopup();
                        }}
                      >
                        {formatMonthYear(month)}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {isFeedFetching && !showInitialLoading ? <span className="cal-sync-hint">Refreshing…</span> : null}
          </div>

          <div className="calendar-toolbar__right">
            <div className="cal-filter">
              <button
                type="button"
                className={`cal-icon-btn${filterOpen ? ' is-active' : ''}`}
                aria-label="Filter events"
                aria-expanded={filterOpen}
                onClick={() => {
                  setFilterOpen((open) => !open);
                  setViewMenuOpen(false);
                  setMonthMenuOpen(false);
                }}
              >
                <FiSliders size={16} aria-hidden="true" />
              </button>
              {filterOpen ? (
                <div className="cal-menu cal-menu--filters" role="group" aria-label="Event filters">
                  {FILTER_CATEGORIES.map((category) => {
                    const meta = CATEGORY_META[category];
                    const checked = activeCategories.includes(category);
                    return (
                      <label key={category} className="cal-filter-option">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(category)}
                        />
                        <span className={`cal-event-chip cal-event-chip--${meta.tone}`}>
                          <span aria-hidden="true">{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="cal-view-picker">
              <button
                type="button"
                className="cal-pill-btn cal-pill-btn--menu"
                aria-expanded={viewMenuOpen}
                onClick={() => {
                  setViewMenuOpen((open) => !open);
                  setMonthMenuOpen(false);
                  setFilterOpen(false);
                }}
              >
                <span>{VIEW_OPTIONS.find((option) => option.id === view)?.label}</span>
                <FiChevronDown size={16} aria-hidden="true" />
              </button>
              {viewMenuOpen ? (
                <div className="cal-menu" role="listbox" aria-label="Calendar view">
                  {VIEW_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={view === option.id}
                      className={view === option.id ? 'is-active' : undefined}
                      onClick={() => {
                        setView(option.id as CalendarView);
                        setViewMenuOpen(false);
                        closePopup();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" className="cal-pill-btn cal-pill-btn--menu" onClick={() => openAddEvent()}>
              <FiPlus size={16} aria-hidden="true" />
              Add Event
            </button>
          </div>
        </div>

        <div className="calendar-stage" ref={stageRef}>
          {showInitialLoading ? (
            <div className="cal-state-panel" aria-busy="true">
              <span className="home-spinner" />
              <p>Loading calendar…</p>
            </div>
          ) : null}

          {!showInitialLoading && feedErrorMessage ? (
            <div className="cal-state-panel cal-state-panel--error" role="alert">
              <FiAlertCircle aria-hidden="true" size={18} />
              <p>{feedErrorMessage}</p>
              <button type="button" className="home-retry-button" onClick={() => void refetchFeed()}>
                <FiRefreshCw aria-hidden="true" size={14} />
                Retry
              </button>
            </div>
          ) : null}

          {!showInitialLoading && !feedErrorMessage ? (
            <>
              {view === 'month' ? (
                <div className="cal-month">
                  <div className="cal-weekday-row">
                    {WEEKDAY_LABELS.map((label) => (
                      <span key={label}>
                        <span className="cal-weekday-row__full">{label}</span>
                        <span className="cal-weekday-row__short" aria-hidden="true">
                          {label.charAt(0)}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="cal-month-grid">{monthGrid.map((date) => renderDayCell(date))}</div>
                </div>
              ) : null}

              {view === 'week' ? (
                <div className="cal-week">
                  <div className="cal-week-grid">
                    {weekDates.map((date) => renderDayCell(date, { showWeekday: true }))}
                  </div>
                </div>
              ) : null}

              {view === 'day' ? (
                <div className="cal-day-view">
                  <header className="cal-day-view__header">
                    <div>
                      <p className="page-kicker">{formatShortWeekday(selectedDate)}</p>
                      <h2>{formatFullDate(selectedDate)}</h2>
                    </div>
                    <button
                      type="button"
                      className="cal-pill-btn cal-pill-btn--menu"
                      onClick={() => openAddEvent(selectedDate)}
                    >
                      <FiPlus size={14} aria-hidden="true" />
                      Add
                    </button>
                  </header>
                  <DaySummaryBadges summary={dayViewSummary} />
                  <DayActivityPanel
                    meetings={meetingsForDate(filteredEvents, selectedDate)}
                    items={dayViewItems}
                    otherEvents={dayViewEvents.filter(
                      (event) => !MEETING_CATEGORIES.includes(event.category),
                    )}
                  />
                  <DayTimeline
                    events={dayViewEvents}
                    slots={timelineSlots}
                    showNowLine={isSameDay(selectedDate, today)}
                    nowOffset={nowOffset}
                  />
                </div>
              ) : null}

              {activePopupDate && view !== 'day' ? (
                <aside
                  className="cal-day-popup"
                  style={{ top: popupPos.top, left: popupPos.left, width: POPUP_WIDTH }}
                  aria-label="Day details"
                  onMouseEnter={clearHidePopupTimer}
                  onMouseLeave={scheduleHidePopup}
                >
                  <header className="cal-day-popup__header">
                    <div>
                      <h2>{formatFullDate(activePopupDate)}</h2>
                      {popupSummary ? <DaySummaryBadges summary={popupSummary} /> : null}
                    </div>
                    <button type="button" aria-label="Close day details" onClick={closePopup}>
                      <FiX size={16} aria-hidden="true" />
                    </button>
                  </header>
                  <DayActivityPanel
                    meetings={meetingsForDate(filteredEvents, activePopupDate)}
                    items={popupItems}
                    otherEvents={popupEvents.filter(
                      (event) => !MEETING_CATEGORIES.includes(event.category),
                    )}
                  />
                  <button
                    type="button"
                    className="cal-panel-add"
                    onClick={() => openAddEvent(activePopupDate)}
                  >
                    <FiPlus size={14} aria-hidden="true" />
                    Add event for this day
                  </button>
                </aside>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {addOpen ? (
        <div
          className="cal-add-backdrop"
          role="presentation"
          onClick={() => {
            if (!isCreatingEvent) setAddOpen(false);
          }}
        >
          <form
            className="cal-add-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add event"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            onSubmit={(submitEvent) => void handleCreateEvent(submitEvent)}
          >
            <header className="cal-add-modal__header">
              <div>
                <p>New calendar event</p>
                <h2>Add Event</h2>
              </div>
              <button
                type="button"
                className="cal-add-modal__close"
                aria-label="Close"
                disabled={isCreatingEvent}
                onClick={() => setAddOpen(false)}
              >
                <FiX size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="cal-add-modal__body">
              <section className="cal-add-section" aria-label="Event details">
                <h3>Details</h3>
                <TextInput
                  label="Title"
                  value={draft.title}
                  onChange={(changeEvent) =>
                    setDraft((current) => ({ ...current, title: changeEvent.target.value }))
                  }
                  placeholder="Weekly team sync"
                  required
                  maxLength={80}
                />
                <TextTextarea
                  label="Description"
                  value={draft.description}
                  onChange={(changeEvent) =>
                    setDraft((current) => ({ ...current, description: changeEvent.target.value }))
                  }
                  placeholder="Add agenda or notes"
                  rows={3}
                />
                <TextInput
                  label="Location"
                  icon={<FiMapPin aria-hidden="true" size={15} />}
                  value={draft.location}
                  onChange={(changeEvent) =>
                    setDraft((current) => ({ ...current, location: changeEvent.target.value }))
                  }
                  placeholder="Office, Zoom, or Google Meet"
                  maxLength={120}
                />
              </section>

              <section className="cal-add-section" aria-label="Event schedule">
                <h3>Schedule</h3>
                <CustomDatePicker
                  label="Date"
                  value={draft.date}
                  isOpen={dateMenuOpen}
                  onOpenChange={(open) => {
                    setStartTimeMenuOpen(false);
                    setEndTimeMenuOpen(false);
                    setRemindMenuOpen(false);
                    setDateMenuOpen(open);
                  }}
                  onChange={(value) => setDraft((current) => ({ ...current, date: value }))}
                />
                <div className="cal-add-modal__row">
                  <CustomTimePicker
                    label="Starts"
                    value={draft.startTime}
                    isOpen={startTimeMenuOpen}
                    onOpenChange={(open) => {
                      setDateMenuOpen(false);
                      setEndTimeMenuOpen(false);
                      setRemindMenuOpen(false);
                      setStartTimeMenuOpen(open);
                    }}
                    onChange={(value) => setDraft((current) => ({ ...current, startTime: value }))}
                  />
                  <CustomTimePicker
                    label="Ends"
                    value={draft.endTime}
                    isOpen={endTimeMenuOpen}
                    onOpenChange={(open) => {
                      setDateMenuOpen(false);
                      setStartTimeMenuOpen(false);
                      setRemindMenuOpen(false);
                      setEndTimeMenuOpen(open);
                    }}
                    onChange={(value) => setDraft((current) => ({ ...current, endTime: value }))}
                  />
                </div>
              </section>

              <section className="cal-add-section cal-add-section--reminder" aria-label="Reminder">
                <h3>Reminder</h3>
                <div className={`cal-reminder-card${draft.aiReminder ? ' is-open' : ''}`}>
                  <div className="cal-reminder-card__top">
                    <span className="cal-reminder-card__icon" aria-hidden="true">
                      <FiBell size={16} />
                    </span>
                    <div className="cal-reminder-card__copy">
                      <strong>Remind me before this event</strong>
                      <small>Send an alert before the event starts</small>
                    </div>
                    <button
                      type="button"
                      className={`cal-reminder-toggle${draft.aiReminder ? ' is-on' : ''}`}
                      role="switch"
                      aria-checked={draft.aiReminder}
                      aria-label="Remind me before this event"
                      onClick={() => {
                        closeFormMenus();
                        setDraft((current) => ({
                          ...current,
                          aiReminder: !current.aiReminder,
                          beeping: !current.aiReminder
                            ? current.beeping || !current.aiCalling
                            : current.beeping,
                        }));
                      }}
                    >
                      <span />
                    </button>
                  </div>

                  {draft.aiReminder ? (
                    <div className="cal-reminder-card__body">
                      <CustomDropdown
                        label="Remind before"
                        options={REMIND_BEFORE_OPTIONS}
                        value={String(draft.remindBeforeMinutes)}
                        isOpen={remindMenuOpen}
                        onOpenChange={(open) => {
                          setDateMenuOpen(false);
                          setStartTimeMenuOpen(false);
                          setEndTimeMenuOpen(false);
                          setRemindMenuOpen(open);
                        }}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            remindBeforeMinutes: Number(value),
                          }))
                        }
                      />

                      <div className="cal-reminder-channels" role="group" aria-label="Alert type">
                        <button
                          type="button"
                          className={`cal-reminder-channel${draft.beeping ? ' is-on' : ''}`}
                          aria-pressed={draft.beeping}
                          onClick={() => {
                            closeFormMenus();
                            setDraft((current) => ({ ...current, beeping: !current.beeping }));
                          }}
                        >
                          Beep alert
                        </button>
                        <button
                          type="button"
                          className={`cal-reminder-channel${draft.aiCalling ? ' is-on' : ''}`}
                          aria-pressed={draft.aiCalling}
                          onClick={() => {
                            closeFormMenus();
                            setDraft((current) => ({ ...current, aiCalling: !current.aiCalling }));
                          }}
                        >
                          AI call
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {formError ? (
                <div className="cal-form-error" role="alert">
                  <FiAlertCircle aria-hidden="true" size={14} />
                  <p>{formError}</p>
                </div>
              ) : null}
            </div>

            <footer className="cal-add-modal__footer">
              <button
                type="button"
                className="cal-add-modal__cancel"
                disabled={isCreatingEvent}
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="cal-add-modal__submit" disabled={isCreatingEvent}>
                {isCreatingEvent ? 'Creating…' : 'Create event'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
};

const DayActivityPanel = ({
  meetings,
  items,
  otherEvents,
}: {
  meetings: CalendarEvent[];
  items: CalendarDayItem[];
  otherEvents: CalendarEvent[];
}) => {
  const tasks = items.filter((item) => item.kind === 'task');
  const notes = items.filter((item) => item.kind === 'note');
  const reminders = items.filter((item) => item.kind === 'reminder');
  const isEmpty =
    meetings.length === 0 &&
    tasks.length === 0 &&
    notes.length === 0 &&
    reminders.length === 0 &&
    otherEvents.length === 0;

  if (isEmpty) {
    return (
      <div className="cal-day-activity cal-day-activity--empty">
        <p>Nothing saved for this day yet.</p>
        <span>Meetings, tasks, notes, and reminders will show up here.</span>
      </div>
    );
  }

  const renderItemSection = (kind: DayItemKind, sectionItems: CalendarDayItem[]) => {
    if (sectionItems.length === 0) return null;
    const meta = DAY_ITEM_META[kind];

    return (
      <section className="cal-day-section" key={kind}>
        <header className="cal-day-section__header">
          <strong>
            <span aria-hidden="true">{meta.icon}</span> {meta.plural}
          </strong>
          <span>{sectionItems.length}</span>
        </header>
        <div className="cal-day-section__list">
          {sectionItems.map((item) => (
            <article
              key={item.id}
              className={`cal-day-item cal-day-item--${item.kind}${item.done ? ' is-done' : ''}`}
            >
              <div className="cal-day-item__top">
                <h3>{item.title}</h3>
                {item.timeMinutes != null ? <time>{minutesToLabel(item.timeMinutes)}</time> : null}
              </div>
              {item.description ? <p>{item.description}</p> : null}
              {item.priority ? <small className="cal-day-item__priority">{item.priority}</small> : null}
            </article>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="cal-day-activity">
      {meetings.length > 0 ? (
        <section className="cal-day-section">
          <header className="cal-day-section__header">
            <strong>
              <span aria-hidden="true">👥</span> Meetings
            </strong>
            <span>{meetings.length}</span>
          </header>
          <div className="cal-day-section__list">
            {meetings.map((event) => {
              const meta = CATEGORY_META[event.category];
              return (
                <article
                  key={event.id}
                  className={`cal-day-item cal-day-item--meeting cal-day-item--${meta.tone}`}
                >
                  <div className="cal-day-item__top">
                    <h3>{event.title}</h3>
                    <time>{formatTimeRange(event.startMinutes, event.endMinutes)}</time>
                  </div>
                  {event.description ? <p>{event.description}</p> : null}
                  {event.spaceName ? <small>{event.spaceName}</small> : null}
                  {event.attendees?.length ? <AttendeeStack attendees={event.attendees} /> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {renderItemSection('task', tasks)}
      {renderItemSection('note', notes)}
      {renderItemSection('reminder', reminders)}

      {otherEvents.length > 0 ? (
        <section className="cal-day-section">
          <header className="cal-day-section__header">
            <strong>Other events</strong>
            <span>{otherEvents.length}</span>
          </header>
          <div className="cal-day-section__list">
            {otherEvents.map((event) => {
              const meta = CATEGORY_META[event.category];
              return (
                <article key={event.id} className="cal-day-item">
                  <div className="cal-day-item__top">
                    <h3>
                      <span aria-hidden="true">{meta.icon}</span> {event.title}
                    </h3>
                    <time>{minutesToLabel(event.startMinutes)}</time>
                  </div>
                  {event.description ? <p>{event.description}</p> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};

const DayTimeline = ({
  events,
  slots,
  showNowLine,
  nowOffset,
}: {
  events: CalendarEvent[];
  slots: number[];
  showNowLine: boolean;
  nowOffset: number;
}) => {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="cal-timeline">
      {showNowLine && nowOffset >= 0 && nowOffset <= 100 ? (
        <div className="cal-now-line" style={{ top: `calc(${nowOffset}% + 8px)` }} aria-hidden="true">
          <span />
        </div>
      ) : null}

      <div className="cal-timeline__rail">
        {slots.map((minute) => (
          <div key={minute} className="cal-timeline__slot">
            <time>{minutesToLabel(minute)}</time>
            <span />
          </div>
        ))}
      </div>

      <div className="cal-timeline__events">
        {events.map((event) => {
          const meta = CATEGORY_META[event.category];
          const isBlock = MEETING_CATEGORIES.includes(event.category);

          return (
            <article
              key={event.id}
              className={`cal-timeline-card cal-timeline-card--${meta.tone}${isBlock ? ' is-block' : ''}`}
            >
              <div className="cal-timeline-card__body">
                {!isBlock ? <span aria-hidden="true">{meta.icon}</span> : null}
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.description || formatTimeRange(event.startMinutes, event.endMinutes)}</p>
                  {isBlock ? <small>{formatTimeRange(event.startMinutes, event.endMinutes)}</small> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
