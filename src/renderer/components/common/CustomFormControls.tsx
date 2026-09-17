import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiCheckSquare, FiChevronDown, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';

export type DropdownOption = {
  id: string;
  label: string;
  description?: string;
};

type CustomDropdownProps = {
  label: string;
  options: DropdownOption[];
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
  placeholder?: string;
};

type CustomDatePickerProps = {
  label: string;
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
};

type CustomTimePickerProps = {
  label: string;
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
  stepMinutes?: number;
};

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
};

type TextInputProps = {
  label: string;
  icon?: ReactNode;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>;

type TextTextareaProps = {
  label: string;
  hint?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

type MenuCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const formatPickerDate = (key: string) =>
  parseDateKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatMonthYear = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const minutesToLabel = (minutes: number) => {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
};

const timeValueToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const minutesToTimeValue = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const getMonthGrid = (monthDate: Date) => {
  const first = startOfMonth(monthDate);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

const splitTimeParts = (value: string) => {
  const total = timeValueToMinutes(value);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return { hour12, minutes, period };
};

const buildTimeValue = (hour12: number, minutes: number, period: 'AM' | 'PM') => {
  const normalizedHour = ((hour12 - 1) % 12) + 1;
  let hours24 = normalizedHour % 12;
  if (period === 'PM') hours24 += 12;
  return minutesToTimeValue(hours24 * 60 + minutes);
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const useAnchoredMenu = (
  isOpen: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  preferredHeight = 280,
) => {
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setCoords(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const viewportPad = 12;
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
      const spaceAbove = rect.top - gap - viewportPad;
      const placeAbove = spaceBelow < Math.min(preferredHeight, 200) && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(preferredHeight, placeAbove ? spaceAbove : spaceBelow));
      const width = Math.max(rect.width, 220);
      const left = Math.min(
        Math.max(viewportPad, rect.left),
        window.innerWidth - width - viewportPad,
      );
      const top = placeAbove ? rect.top - gap - maxHeight : rect.bottom + gap;

      setCoords({ top, left, width, maxHeight });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, preferredHeight, triggerRef]);

  return coords;
};

const useDismissibleMenu = (
  isOpen: boolean,
  onOpenChange: (isOpen: boolean) => void,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
) => {
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, menuRef, onOpenChange, triggerRef]);
};

const menuStyle = (coords: MenuCoords): CSSProperties => ({
  position: 'fixed',
  top: coords.top,
  left: coords.left,
  width: coords.width,
  maxHeight: coords.maxHeight,
  zIndex: 90,
});

export const FormField = ({ label, htmlFor, hint, icon, children }: FormFieldProps) => (
  <label className="custom-field" htmlFor={htmlFor}>
    <span className="custom-field__label">{label}</span>
    <span className={`custom-field__control${icon ? ' has-icon' : ''}`}>
      {icon ? <span className="custom-field__icon">{icon}</span> : null}
      {children}
    </span>
    {hint ? <span className="custom-field__hint">{hint}</span> : null}
  </label>
);

export const TextInput = ({ label, icon, hint, id, className, ...props }: TextInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField label={label} htmlFor={inputId} hint={hint} icon={icon}>
      <input id={inputId} className={`custom-field__input${className ? ` ${className}` : ''}`} {...props} />
    </FormField>
  );
};

export const TextTextarea = ({ label, hint, id, className, ...props }: TextTextareaProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField label={label} htmlFor={inputId} hint={hint}>
      <textarea id={inputId} className={`custom-field__textarea${className ? ` ${className}` : ''}`} {...props} />
    </FormField>
  );
};

export const CustomDropdown = ({
  label,
  options,
  value,
  isOpen,
  onOpenChange,
  onChange,
  placeholder = 'Select an option',
}: CustomDropdownProps) => {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const coords = useAnchoredMenu(isOpen, triggerRef, 240);
  const selectedOption = options.find((option) => option.id === value);

  useDismissibleMenu(isOpen, onOpenChange, triggerRef, menuRef);

  return (
    <div className={`custom-field custom-dropdown${isOpen ? ' is-open' : ''}`}>
      <span className="custom-field__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        className={`custom-dropdown__trigger${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${listId}-label`}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="custom-dropdown__value">
          <strong>{selectedOption?.label ?? placeholder}</strong>
          {selectedOption?.description ? <small>{selectedOption.description}</small> : null}
        </span>
        <FiChevronDown aria-hidden="true" size={16} />
      </button>

      {isOpen && coords
        ? createPortal(
            <div
              ref={menuRef}
              className="custom-picker-portal custom-dropdown__menu"
              role="listbox"
              aria-labelledby={`${listId}-label`}
              style={menuStyle(coords)}
            >
              {options.map((option) => {
                const selected = option.id === value;

                return (
                  <button
                    className={`custom-dropdown__option${selected ? ' is-selected' : ''}`}
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.id);
                      onOpenChange(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      {option.description ? <small>{option.description}</small> : null}
                    </span>
                    {selected ? <FiCheckSquare aria-hidden="true" size={15} /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export const CustomDatePicker = ({
  label,
  value,
  isOpen,
  onOpenChange,
  onChange,
}: CustomDatePickerProps) => {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const coords = useAnchoredMenu(isOpen, triggerRef, 360);
  const selectedDate = useMemo(() => parseDateKey(value), [value]);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  }, []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate));

  useDismissibleMenu(isOpen, onOpenChange, triggerRef, menuRef);

  useEffect(() => {
    if (isOpen) setViewMonth(startOfMonth(selectedDate));
  }, [isOpen, selectedDate]);

  const monthDays = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  return (
    <div className={`custom-field custom-date-picker${isOpen ? ' is-open' : ''}`}>
      <span className="custom-field__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        className={`custom-dropdown__trigger custom-date-picker__trigger${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={`${listId}-label`}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="custom-dropdown__value">
          <strong>{formatPickerDate(value)}</strong>
          <small>Choose a calendar date</small>
        </span>
        <FiCalendar aria-hidden="true" size={16} />
      </button>

      {isOpen && coords
        ? createPortal(
            <div
              ref={menuRef}
              className="custom-picker-portal custom-date-picker__menu"
              role="dialog"
              aria-labelledby={`${listId}-label`}
              style={menuStyle(coords)}
            >
              <div className="custom-date-picker__nav">
                <button
                  type="button"
                  className="custom-date-picker__nav-btn"
                  aria-label="Previous month"
                  onClick={() => setViewMonth((current) => addMonths(current, -1))}
                >
                  <FiChevronLeft size={16} aria-hidden="true" />
                </button>
                <strong>{formatMonthYear(viewMonth)}</strong>
                <button
                  type="button"
                  className="custom-date-picker__nav-btn"
                  aria-label="Next month"
                  onClick={() => setViewMonth((current) => addMonths(current, 1))}
                >
                  <FiChevronRight size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="custom-date-picker__weekdays" aria-hidden="true">
                {WEEKDAY_SHORT.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="custom-date-picker__grid" role="grid">
                {monthDays.map((day) => {
                  const key = toDateKey(day);
                  const selected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const outside = !isSameMonth(day, viewMonth);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'custom-date-picker__day',
                        selected ? 'is-selected' : '',
                        isToday ? 'is-today' : '',
                        outside ? 'is-outside' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={formatPickerDate(key)}
                      aria-pressed={selected}
                      onClick={() => {
                        onChange(key);
                        onOpenChange(false);
                        triggerRef.current?.focus();
                      }}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="custom-date-picker__footer">
                <button
                  type="button"
                  className="custom-date-picker__today"
                  onClick={() => {
                    const key = toDateKey(today);
                    onChange(key);
                    onOpenChange(false);
                    triggerRef.current?.focus();
                  }}
                >
                  Today
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export const CustomTimePicker = ({
  label,
  value,
  isOpen,
  onOpenChange,
  onChange,
  stepMinutes = 15,
}: CustomTimePickerProps) => {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const coords = useAnchoredMenu(isOpen, triggerRef, 340);
  const parts = useMemo(() => splitTimeParts(value), [value]);
  const minuteOptions = useMemo(() => {
    const step = Math.max(5, Math.min(30, stepMinutes));
    return Array.from({ length: Math.floor(60 / step) }, (_, index) => index * step);
  }, [stepMinutes]);

  useDismissibleMenu(isOpen, onOpenChange, triggerRef, menuRef);

  const commit = (next: { hour12?: number; minutes?: number; period?: 'AM' | 'PM' }) => {
    onChange(
      buildTimeValue(
        next.hour12 ?? parts.hour12,
        next.minutes ?? parts.minutes,
        next.period ?? parts.period,
      ),
    );
  };

  const nearestMinute =
    minuteOptions.find((minute) => minute === parts.minutes) ??
    minuteOptions.reduce((closest, minute) =>
      Math.abs(minute - parts.minutes) < Math.abs(closest - parts.minutes) ? minute : closest,
    );

  return (
    <div className={`custom-field custom-dropdown custom-time-picker${isOpen ? ' is-open' : ''}`}>
      <span className="custom-field__label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        ref={triggerRef}
        id={`${listId}-trigger`}
        className={`custom-dropdown__trigger${isOpen ? ' is-open' : ''}`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={`${listId}-label`}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="custom-dropdown__value">
          <strong>{minutesToLabel(timeValueToMinutes(value))}</strong>
        </span>
        <FiClock aria-hidden="true" size={16} />
      </button>

      {isOpen && coords
        ? createPortal(
            <div
              ref={menuRef}
              className="custom-picker-portal custom-time-picker__menu"
              role="dialog"
              aria-labelledby={`${listId}-label`}
              style={{
                ...menuStyle(coords),
                width: Math.max(coords.width, 280),
                maxHeight: 'none',
              }}
            >
              <div className="custom-time-picker__period" role="group" aria-label="AM or PM">
                <button
                  type="button"
                  className={`custom-time-picker__period-btn${parts.period === 'AM' ? ' is-selected' : ''}`}
                  aria-pressed={parts.period === 'AM'}
                  onClick={() => commit({ period: 'AM' })}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`custom-time-picker__period-btn${parts.period === 'PM' ? ' is-selected' : ''}`}
                  aria-pressed={parts.period === 'PM'}
                  onClick={() => commit({ period: 'PM' })}
                >
                  PM
                </button>
              </div>

              <div className="custom-time-picker__section">
                <span className="custom-time-picker__section-label">Hour</span>
                <div className="custom-time-picker__chips" role="listbox" aria-label="Hour">
                  {HOUR_OPTIONS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      className={`custom-time-picker__chip${parts.hour12 === hour ? ' is-selected' : ''}`}
                      role="option"
                      aria-selected={parts.hour12 === hour}
                      onClick={() => commit({ hour12: hour })}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-time-picker__section">
                <span className="custom-time-picker__section-label">Minutes</span>
                <div
                  className="custom-time-picker__chips custom-time-picker__chips--minutes"
                  role="listbox"
                  aria-label="Minutes"
                >
                  {minuteOptions.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      className={`custom-time-picker__chip${nearestMinute === minute ? ' is-selected' : ''}`}
                      role="option"
                      aria-selected={nearestMinute === minute}
                      onClick={() => commit({ minutes: minute })}
                    >
                      {String(minute).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-time-picker__footer">
                <strong>{minutesToLabel(timeValueToMinutes(value))}</strong>
                <button
                  type="button"
                  className="custom-time-picker__done"
                  onClick={() => {
                    onOpenChange(false);
                    triggerRef.current?.focus();
                  }}
                >
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};
