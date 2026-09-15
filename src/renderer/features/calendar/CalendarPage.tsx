import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSliders,
  FiX,
} from 'react-icons/fi';

import { CustomDropdown, TextInput, TextTextarea } from '@/components/common/CustomFormControls';
import { createSeedDayItems, createSeedEvents } from './calendarData';
import type {
  CalendarDayItem,
  CalendarEvent,
  CalendarView,
  DayItemKind,
  DaySummary,
  EventCategory,
  EventDraft,
} from './calendarTypes';
import {
  CATEGORY_META,
  DAY_ITEM_META,
  MEETING_CATEGORIES,
  addDays,
  addMonths,
  createEventId,
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
} from './calendarUtils';

const VIEW_OPTIONS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_META) as EventCategory[]).map((id) => ({
  id,
  label: `${CATEGORY_META[id].icon} ${CATEGORY_META[id].label}`,
}));

const FILTER_CATEGORIES: EventCategory[] = ['meeting', 'interview'];

const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const SLOT_STEP = 30;
const POPUP_WIDTH = 360;
const POPUP_MAX_HEIGHT = 480;

type PopupPosition = { top: number; left: number };

const emptyDraft = (date: string): EventDraft => ({
  title: '',
  description: '',
  category: 'meeting',
  date,
  startTime: '09:00',
  endTime: '10:00',
  canJoin: false,
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
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>(() => createSeedEvents());
  const [dayItems] = useState<CalendarDayItem[]>(() => createSeedDayItems());
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
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => nowMinutes());

  const toolbarRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hidePopupTimer = useRef<number | null>(null);

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

  const monthGrid = useMemo(() => getMonthGridDates(cursorDate), [cursorDate]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
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
    () => (activePopupDate ? getDaySummary(filteredEvents, dayItems, activePopupDate) : null),
    [filteredEvents, dayItems, activePopupDate],
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
    () => getDaySummary(filteredEvents, dayItems, selectedDate),
    [filteredEvents, dayItems, selectedDate],
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
    setCategoryMenuOpen(false);
    setAddOpen(true);
    closePopup();
  };

  const handleCreateEvent = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;

    const startMinutes = timeInputToMinutes(draft.startTime);
    const endMinutes = Math.max(startMinutes + 15, timeInputToMinutes(draft.endTime));
    const eventDate = parseDateKey(draft.date);

    const nextEvent: CalendarEvent = {
      id: createEventId(),
      title,
      description: draft.description.trim() || undefined,
      category: draft.category,
      date: draft.date,
      startMinutes,
      endMinutes,
      canJoin: draft.canJoin && draft.category === 'meeting',
      attendees:
        draft.category === 'meeting' || draft.category === 'interview' || draft.category === 'onboarding'
          ? [
              { id: 'you', name: 'You', initials: 'YO', color: '#1355ff' },
              { id: 'buddy', name: 'Buddy AI', initials: 'BU', color: '#0f8b63' },
            ]
          : undefined,
    };

    setEvents((current) => [...current, nextEvent]);
    setSelectedDate(eventDate);
    setCursorDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setAddOpen(false);
  };

  const nowOffset = ((nowTick - DAY_START) / (DAY_END - DAY_START)) * 100;

  const renderDayCell = (date: Date, options?: { showWeekday?: boolean }) => {
    const dayEvents = eventsForDate(filteredEvents, date);
    const meetingPreview = meetingsForDate(filteredEvents, date).slice(0, options?.showWeekday ? 2 : 1);
    const summary = getDaySummary(filteredEvents, dayItems, date);
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
              <div className="cal-week-grid">{weekDates.map((date) => renderDayCell(date, { showWeekday: true }))}</div>
            </div>
          ) : null}

          {view === 'day' ? (
            <div className="cal-day-view">
              <header className="cal-day-view__header">
                <div>
                  <p className="page-kicker">{formatShortWeekday(selectedDate)}</p>
                  <h2>{formatFullDate(selectedDate)}</h2>
                </div>
                <button type="button" className="cal-pill-btn cal-pill-btn--menu" onClick={() => openAddEvent(selectedDate)}>
                  <FiPlus size={14} aria-hidden="true" />
                  Add
                </button>
              </header>
              <DaySummaryBadges summary={dayViewSummary} />
              <DayActivityPanel
                meetings={meetingsForDate(filteredEvents, selectedDate)}
                items={dayViewItems}
                otherEvents={dayViewEvents.filter((event) => !MEETING_CATEGORIES.includes(event.category))}
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
                otherEvents={popupEvents.filter((event) => !MEETING_CATEGORIES.includes(event.category))}
              />
              <button type="button" className="cal-panel-add" onClick={() => openAddEvent(activePopupDate)}>
                <FiPlus size={14} aria-hidden="true" />
                Add event for this day
              </button>
            </aside>
          ) : null}
        </div>
      </div>

      {addOpen ? (
        <div className="settings-modal-backdrop" role="presentation" onClick={() => setAddOpen(false)}>
          <form
            className="settings-modal settings-action-modal home-create-modal cal-add-modal"
            role="dialog"
            aria-label="Add event"
            onClick={(clickEvent) => clickEvent.stopPropagation()}
            onSubmit={handleCreateEvent}
          >
            <header>
              <div>
                <p className="page-kicker">Calendar</p>
                <h2>Add Event</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setAddOpen(false)}>
                <FiX size={18} aria-hidden="true" />
              </button>
            </header>

            <TextInput
              label="Title"
              value={draft.title}
              onChange={(changeEvent) => setDraft((current) => ({ ...current, title: changeEvent.target.value }))}
              placeholder="Weekly team sync"
              required
            />

            <TextTextarea
              label="Description"
              value={draft.description}
              onChange={(changeEvent) =>
                setDraft((current) => ({ ...current, description: changeEvent.target.value }))
              }
              placeholder="Optional notes"
              rows={3}
            />

            <CustomDropdown
              label="Category"
              options={CATEGORY_OPTIONS}
              value={draft.category}
              isOpen={categoryMenuOpen}
              onOpenChange={setCategoryMenuOpen}
              onChange={(value) => setDraft((current) => ({ ...current, category: value as EventCategory }))}
            />

            <div className="home-create-modal__row">
              <TextInput
                label="Date"
                type="date"
                value={draft.date}
                onChange={(changeEvent) => setDraft((current) => ({ ...current, date: changeEvent.target.value }))}
                required
              />
              <label className="cal-join-toggle">
                <input
                  type="checkbox"
                  checked={draft.canJoin}
                  onChange={(changeEvent) =>
                    setDraft((current) => ({ ...current, canJoin: changeEvent.target.checked }))
                  }
                />
                <span>Show Join button</span>
              </label>
            </div>

            <div className="home-create-modal__row">
              <TextInput
                label="Starts"
                type="time"
                value={draft.startTime}
                onChange={(changeEvent) =>
                  setDraft((current) => ({ ...current, startTime: changeEvent.target.value }))
                }
                required
              />
              <TextInput
                label="Ends"
                type="time"
                value={draft.endTime}
                onChange={(changeEvent) => setDraft((current) => ({ ...current, endTime: changeEvent.target.value }))}
                required
              />
            </div>

            <footer className="settings-form-footer">
              <button type="button" className="settings-secondary-button" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="settings-primary-button">
                Create event
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
    meetings.length === 0 && tasks.length === 0 && notes.length === 0 && reminders.length === 0 && otherEvents.length === 0;

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
                <article key={event.id} className={`cal-day-item cal-day-item--meeting cal-day-item--${meta.tone}`}>
                  <div className="cal-day-item__top">
                    <h3>{event.title}</h3>
                    <time>{formatTimeRange(event.startMinutes, event.endMinutes)}</time>
                  </div>
                  {event.description ? <p>{event.description}</p> : null}
                  {event.attendees?.length ? <AttendeeStack attendees={event.attendees} /> : null}
                  {event.canJoin ? (
                    <button type="button" className="cal-join-btn">
                      Join
                    </button>
                  ) : null}
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
              {event.attendees?.length ? <AttendeeStack attendees={event.attendees} /> : null}
              {event.canJoin ? (
                <button type="button" className="cal-join-btn">
                  Join
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
};
