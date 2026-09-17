import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheck, FiInfo } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'info';

export type AppToastProps = {
  visible: boolean;
  message: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
};

const TYPE_LABEL: Record<ToastType, string> = {
  success: 'Completed successfully',
  error: 'Something went wrong',
  info: 'Please take a look',
};

export const AppToast = ({
  visible,
  message,
  description,
  type = 'success',
  duration = 3000,
  onHide,
}: AppToastProps) => {
  const [isRendered, setIsRendered] = useState(visible);
  const [isOpen, setIsOpen] = useState(false);

  const subtitle = useMemo(() => {
    if (description?.trim()) {
      return description.trim();
    }
    return TYPE_LABEL[type];
  }, [description, type]);

  useEffect(() => {
    if (!visible) {
      setIsOpen(false);
      const unmountTimer = window.setTimeout(() => setIsRendered(false), 220);
      return () => window.clearTimeout(unmountTimer);
    }

    setIsRendered(true);
    const openTimer = window.setTimeout(() => setIsOpen(true), 16);
    const hideTimer = window.setTimeout(() => {
      setIsOpen(false);
      window.setTimeout(() => onHide?.(), 220);
    }, duration);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(hideTimer);
    };
  }, [duration, onHide, visible]);

  if (!isRendered || !message) {
    return null;
  }

  return (
    <div
      className={`app-toast${isOpen ? ' is-open' : ''}`}
      data-type={type}
      role="status"
      aria-live="polite"
    >
      <span className="app-toast__icon" aria-hidden="true">
        {type === 'success' ? (
          <FiCheck size={16} />
        ) : type === 'error' ? (
          <FiAlertCircle size={16} />
        ) : (
          <FiInfo size={16} />
        )}
      </span>
      <div className="app-toast__text">
        <strong>{message}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
};
