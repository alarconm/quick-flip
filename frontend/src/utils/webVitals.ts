/**
 * Web Vitals Monitoring for Built for Shopify Compliance
 *
 * Tracks Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint) - must be <= 2.5s
 * - CLS (Cumulative Layout Shift) - must be <= 0.1
 * - INP (Interaction to Next Paint) - must be <= 200ms
 *
 * Reports to console in development and Sentry in production.
 */
import { onLCP, onCLS, onINP, type Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

const vitalsThresholds = {
  LCP: 2500, // 2.5 seconds
  CLS: 0.1,
  INP: 200, // 200ms
};

function sendToAnalytics(metric: Metric) {
  const { name, value, rating } = metric;

  // Log in development
  if (import.meta.env.DEV) {
    const threshold = vitalsThresholds[name as keyof typeof vitalsThresholds];
    const status = rating === 'good' ? '[GOOD]' : rating === 'needs-improvement' ? '[WARN]' : '[POOR]';
    console.log(`[Web Vitals] ${status} ${name}: ${value.toFixed(2)} (threshold: ${threshold})`);
  }

  // Send to Sentry in production
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${name}: ${value}`,
      level: 'info',
      data: {
        value,
        rating,
        threshold: vitalsThresholds[name as keyof typeof vitalsThresholds],
      },
    });

    // Track as custom measurement
    // CLS is unitless, LCP and INP are in milliseconds
    Sentry.setMeasurement(name, value, name === 'CLS' ? '' : 'millisecond');
  }
}

export function initWebVitals() {
  onLCP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);

  if (import.meta.env.DEV) {
    console.log('[TradeUp] Web Vitals monitoring initialized');
  }
}
