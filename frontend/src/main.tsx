import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { ErrorBoundary } from './components';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { initSentry } from './utils/sentry';
import { initWebVitals } from './utils/webVitals';
import App from './App';

// Initialize Sentry error tracking (must be first)
initSentry();

// Initialize Web Vitals monitoring for Built for Shopify compliance
initWebVitals();

// React Query client with default error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppProvider i18n={enTranslations}>
            <ToastProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </ToastProvider>
          </AppProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
