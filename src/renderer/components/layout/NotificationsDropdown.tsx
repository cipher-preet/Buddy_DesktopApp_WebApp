import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { FiBell, FiCheckSquare, FiFileText, FiRefreshCw, FiVideo } from 'react-icons/fi';

import type { SearchNavigationTarget } from '@/features/search/searchTypes';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
  type NotificationItem,
  type NotificationType,
} from '@/services/notificationsApi';

type NotificationTab = 'inbox' | 'unread';

type NotificationsDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  onNavigate?: (target: SearchNavigationTarget) => void;
};

type DropdownCoords = {
  top: number;
  left: number;
};

const TYPE_ICONS: Record<NotificationType, typeof FiBell> = {
  task: FiCheckSquare,
  note: FiFileText,
  meeting: FiVideo,
};

const toTarget = (item: NotificationItem): SearchNavigationTarget | null => {
  if (item.type === 'meeting') {
    return { kind: 'meeting', meetingId: item.entityId };
  }
  if (item.spaceId) {
    return { kind: item.type, spaceId: item.spaceId, itemId: item.entityId };
  }
  return item.meetingId
    ? { kind: 'meeting', meetingId: item.meetingId, tab: item.type === 'task' ? 'tasks' : 'notes' }
    : null;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const sectionLabel = (iso: string, now: Date) => {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This week';
  return 'Earlier';
};

const relativeTime = (iso: string, now: Date) => {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const NotificationsDropdown = ({ isOpen, onClose, anchorRef, onNavigate }: NotificationsDropdownProps) => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [coords, setCoords] = useState<DropdownCoords>({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const filter = activeTab === 'unread' ? 'unread' : 'all';
  const { data, isLoading, isError, isFetching, refetch } = useGetNotificationsQuery(filter, {
    skip: !isOpen,
    refetchOnMountOrArgChange: 15,
  });
  const [markRead] = useMarkNotificationsReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

  // Read items stay listed in the Unread tab until its next refetch, so rows don't jump on click.
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const unreadCount = data?.unreadCount ?? 0;

  const sections = useMemo(() => {
    const now = new Date();
    const grouped: Array<{ label: string; items: NotificationItem[] }> = [];
    for (const item of items) {
      const label = sectionLabel(item.createdAt, now);
      const last = grouped[grouped.length - 1];
      if (last?.label === label) {
        last.items.push(item);
      } else {
        grouped.push({ label, items: [item] });
      }
    }
    return grouped;
  }, [items]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = 380;
      const gap = 10;
      const viewportPadding = 16;
      // Prefer opening into the main content area (to the right of the sidebar icon).
      const preferredLeft = Math.max(rect.left, rect.right - 48);
      const maxLeft = window.innerWidth - width - viewportPadding;
      const left = Math.max(viewportPadding, Math.min(preferredLeft, maxLeft));

      setCoords({
        top: rect.bottom + gap,
        left,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOpenItem = (item: NotificationItem) => {
    if (!item.read) {
      void markRead(item.memberIds);
    }
    const target = toTarget(item);
    if (target && onNavigate) {
      onNavigate(target);
      onClose();
    }
  };

  const now = new Date();

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="notifications-dropdown__list" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="notification-skeleton">
              <span className="notification-skeleton__icon" />
              <span className="notification-skeleton__lines">
                <span />
                <span />
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="notifications-dropdown__empty">
          <strong>Couldn&apos;t load notifications</strong>
          <p>Check your connection and try again.</p>
          <button type="button" className="notifications-dropdown__retry" onClick={() => void refetch()}>
            <FiRefreshCw aria-hidden="true" size={14} /> Try again
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="notifications-dropdown__empty">
          <span className="notifications-dropdown__empty-icon" aria-hidden="true">
            <FiBell size={26} />
          </span>
          <strong>{activeTab === 'unread' ? "You're all caught up" : 'No notifications yet'}</strong>
          <p>
            {activeTab === 'unread'
              ? 'New tasks, notes, and meetings will show up here.'
              : "When tasks, notes, or meetings are created, you'll see them here."}
          </p>
        </div>
      );
    }

    return (
      <div className="notifications-dropdown__list">
        {sections.map((section) => (
          <section key={section.label} className="notifications-section" aria-label={section.label}>
            <h3 className="notifications-section__label">{section.label}</h3>
            <ul>
              {section.items.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                const context = [item.message, item.spaceName].filter(Boolean).join(' · ');
                return (
                  <li key={item.id} className={`notification-item${item.read ? '' : ' is-unread'}`}>
                    <button
                      type="button"
                      className="notification-item__main"
                      onClick={() => handleOpenItem(item)}
                    >
                      <span className={`notification-item__icon notification-item__icon--${item.type}`} aria-hidden="true">
                        <Icon size={16} />
                        {item.count > 1 ? <span className="notification-item__count">{item.count}</span> : null}
                      </span>
                      <span className="notification-item__text">
                        <span className="notification-item__title">{item.title}</span>
                        {item.preview ? <span className="notification-item__preview">{item.preview}</span> : null}
                        <span className="notification-item__meta">{context}</span>
                      </span>
                      <time className="notification-item__time" dateTime={item.createdAt}>
                        {relativeTime(item.createdAt, now)}
                      </time>
                    </button>
                    {item.read ? null : (
                      <button
                        type="button"
                        className="notification-item__dot"
                        aria-label="Mark as read"
                        title="Mark as read"
                        onClick={() => void markRead(item.memberIds)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div
      ref={panelRef}
      className="notifications-dropdown"
      role="dialog"
      aria-label="Notifications"
      style={{ top: coords.top, left: coords.left }}
    >
      <header className="notifications-dropdown__header">
        <h2>
          Notifications
          {isFetching && !isLoading ? <span className="notifications-dropdown__syncing" aria-hidden="true" /> : null}
        </h2>
        <button
          type="button"
          className="notifications-dropdown__mark-read"
          onClick={() => void markAllRead()}
          disabled={unreadCount === 0 || isMarkingAll}
        >
          Mark all as read
        </button>
      </header>

      <div className="notifications-dropdown__tabs" role="tablist" aria-label="Notification filters">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'inbox'}
          className={activeTab === 'inbox' ? 'is-active' : undefined}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'unread'}
          className={activeTab === 'unread' ? 'is-active' : undefined}
          onClick={() => setActiveTab('unread')}
        >
          Unread
          {unreadCount > 0 ? (
            <span className="notifications-dropdown__tab-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
          ) : null}
        </button>
      </div>

      {renderBody()}
    </div>
  );
};
