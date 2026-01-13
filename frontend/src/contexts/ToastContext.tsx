/**
 * Toast Context - Global Toast Notifications
 * Provides a global toast notification system using Shopify Polaris Toast.
 * Use for showing success, error, and info messages throughout the app.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Toast, Frame } from '@shopify/polaris';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  content: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (content: string, type?: ToastType, duration?: number) => void;
  showSuccess: (content: string, duration?: number) => void;
  showError: (content: string, duration?: number) => void;
  showInfo: (content: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((content: string, type: ToastType = 'info', duration = 5000) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, content, type, duration }]);
  }, []);

  const showSuccess = useCallback((content: string, duration = 5000) => {
    showToast(content, 'success', duration);
  }, [showToast]);

  const showError = useCallback((content: string, duration = 8000) => {
    // Errors show longer by default
    showToast(content, 'error', duration);
  }, [showToast]);

  const showInfo = useCallback((content: string, duration = 5000) => {
    showToast(content, 'info', duration);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Render all active toasts
  const renderToasts = () => {
    if (toasts.length === 0) return null;

    // Only show the first toast (Polaris shows one at a time)
    const currentToast = toasts[0];
    if (!currentToast) return null;

    return (
      <Toast
        content={currentToast.content}
        error={currentToast.type === 'error'}
        duration={currentToast.duration}
        onDismiss={() => dismissToast(currentToast.id)}
      />
    );
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        dismissToast,
        clearAllToasts,
      }}
    >
      <Frame>
        {children}
        {renderToasts()}
      </Frame>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Export a hook that automatically handles API errors
// eslint-disable-next-line react-refresh/only-export-components
export function useApiErrorHandler() {
  const { showError } = useToast();

  return useCallback((error: unknown, fallbackMessage = 'An error occurred') => {
    let message = fallbackMessage;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj.message === 'string') {
        message = errorObj.message;
      } else if (typeof errorObj.error === 'string') {
        message = errorObj.error;
      }
    }

    // Check for specific error types and provide user-friendly messages
    if (message.includes('Member limit reached') || message.includes('Tier limit reached')) {
      message = `${message}. Visit Settings > Billing to upgrade your plan.`;
    } else if (message.includes('fetch') || message.includes('network')) {
      message = 'Network error. Please check your connection and try again.';
    } else if (message.includes('401') || message.includes('Unauthorized')) {
      message = 'Session expired. Please refresh the page.';
    } else if (message.includes('403') || message.includes('Forbidden')) {
      message = 'You do not have permission to perform this action.';
    } else if (message.includes('500') || message.includes('Internal Server')) {
      message = 'Server error. Please try again later.';
    }

    showError(message);
  }, [showError]);
}
