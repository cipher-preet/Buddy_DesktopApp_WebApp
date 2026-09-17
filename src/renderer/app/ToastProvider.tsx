import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { AppToast, type ToastType } from '@/components/common/AppToast';

export type ShowToastParams = {
  message: string;
  description?: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextValue = {
  showToast: (params: ShowToastParams) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

type ToastState = {
  visible: boolean;
  message: string;
  description?: string;
  type: ToastType;
  duration: number;
};

const INITIAL_TOAST: ToastState = {
  visible: false,
  message: '',
  description: undefined,
  type: 'success',
  duration: 3000,
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState>(INITIAL_TOAST);
  const [toastKey, setToastKey] = useState(0);

  const hideToast = useCallback(() => {
    setToast((current) => ({ ...current, visible: false }));
  }, []);

  const showToast = useCallback(({ message, description, type = 'success', duration = 3000 }: ShowToastParams) => {
    setToastKey((current) => current + 1);
    setToast({
      visible: true,
      message,
      description,
      type,
      duration,
    });
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [hideToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AppToast
        key={toastKey}
        visible={toast.visible}
        message={toast.message}
        description={toast.description}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
