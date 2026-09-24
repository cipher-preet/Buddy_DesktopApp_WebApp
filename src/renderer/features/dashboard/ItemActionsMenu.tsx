import { useEffect, useRef } from 'react';
import { FiEdit2, FiMoreVertical, FiTrash2 } from 'react-icons/fi';

type ItemActionsMenuProps = {
  itemLabel: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const ItemActionsMenu = ({
  itemLabel,
  isOpen,
  onOpen,
  onClose,
  onEdit,
  onDelete,
}: ItemActionsMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
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

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`item-actions-menu${isOpen ? ' is-open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className={`item-actions-menu__trigger${isOpen ? ' is-open' : ''}`}
        aria-label={`Actions for ${itemLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            onClose();
          } else {
            onOpen();
          }
        }}
      >
        <FiMoreVertical size={16} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="item-actions-menu__panel"
          role="menu"
          aria-label={`Actions for ${itemLabel}`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="item-actions-menu__option"
            role="menuitem"
            onClick={() => {
              onEdit?.();
              onClose();
            }}
          >
            <FiEdit2 size={14} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            className="item-actions-menu__option item-actions-menu__option--danger"
            role="menuitem"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            <FiTrash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
};
