import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle } from 'react-icons/fi';

type ConfirmDialogProps = {
  title: string;
  description?: ReactNode;
  /** Extra content between the description and the footer (warnings, inputs). */
  children?: ReactNode;
  icon?: ReactNode;
  tone?: 'danger' | 'default';
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({
  title,
  description,
  children,
  icon,
  tone = 'default',
  confirmLabel,
  pendingLabel,
  cancelLabel = 'Cancel',
  isPending = false,
  confirmDisabled = false,
  error,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(isPending);
  const onCancelRef = useRef(onCancel);
  isPendingRef.current = isPending;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Destructive dialogs start on Cancel so a stray Enter can't confirm.
    const autoFocusTarget =
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? cancelRef.current;
    autoFocusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPendingRef.current) {
        event.stopPropagation();
        onCancelRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="confirm-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`confirm-dialog confirm-dialog--${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={isPending}
      >
        <div className="confirm-dialog__body">
          <span className="confirm-dialog__icon" aria-hidden="true">
            {icon ?? <FiAlertTriangle />}
          </span>
          <div className="confirm-dialog__text">
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <div id={descriptionId} className="confirm-dialog__description">
                {description}
              </div>
            ) : null}
          </div>
        </div>

        {children ? <div className="confirm-dialog__extra">{children}</div> : null}

        {error ? (
          <p className="confirm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="confirm-dialog__footer">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-dialog__button confirm-dialog__button--secondary"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-dialog__button confirm-dialog__button--primary"
            onClick={() => void onConfirm()}
            disabled={isPending || confirmDisabled}
          >
            {isPending ? <span className="confirm-dialog__spinner" aria-hidden="true" /> : null}
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
