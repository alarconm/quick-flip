/**
 * Sentry Error Tracking Configuration
 *
 * Initializes Sentry for React error tracking.
 * DSN is provided via VITE_SENTRY_DSN environment variable.
 */
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    console.log('[TradeUp] Sentry DSN not configured, error tracking disabled');
    return;
  }

  const environment = import.meta.env.MODE || 'development';

  Sentry.init({
    dsn,
    environment,
    release: `tradeup-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Performance monitoring
    tracesSampleRate: 0.1, // Sample 10% of transactions

    // Session replay (disabled for now to save quota)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1, // Sample 10% of error sessions

    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Skip network errors (handled by axios interceptors)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return null;
      }

      // Skip cancelled requests
      if (error instanceof Error && error.name === 'CanceledError') {
        return null;
      }

      return event;
    },

    // Don't send personal info
    sendDefaultPii: false,

    // Ignore common browser extension errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],
  });

  console.log(`[TradeUp] Sentry initialized (env: ${environment})`);
}

/**
 * Capture an exception with optional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with optional level
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for Sentry events
 */
export function setUser(user: { id?: string; email?: string; shop?: string }) {
  Sentry.setUser(user);
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Export Sentry for advanced usage
export { Sentry };
