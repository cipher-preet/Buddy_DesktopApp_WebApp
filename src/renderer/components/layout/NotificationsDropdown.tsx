import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { FiBell } from 'react-icons/fi';

type NotificationTab = 'inbox' | 'unread';

type NotificationsDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
};

type DropdownCoords = {
  top: number;
  left: number;
};

export const NotificationsDropdown = ({ isOpen, onClose, anchorRef }: NotificationsDropdownProps) => {
  const [activeTab, setActiveTab] = useState<NotificationTab>('inbox');
  const [coords, setCoords] = useState<DropdownCoords>({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) {
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const width = 360;
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

  return (
    <div
      ref={panelRef}
      className="notifications-dropdown"
      role="dialog"
      aria-label="Notifications"
      style={{ top: coords.top, left: coords.left }}
    >
      <header className="notifications-dropdown__header">
        <h2>Notifications</h2>
        <button type="button" className="notifications-dropdown__mark-read">
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
        </button>
      </div>

      <div className="notifications-dropdown__empty">
        <span className="notifications-dropdown__empty-icon" aria-hidden="true">
          <FiBell size={28} />
        </span>
        <strong>No notifications</strong>
        <p>
          Here&apos;s where you&apos;ll get notified when someone mentions you, assigns an action item
          to you, shares a conversation with you, and more.
        </p>
      </div>
    </div>
  );
};
