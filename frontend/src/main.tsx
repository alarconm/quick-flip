import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { ErrorBoundary } from './components';
import App from './App';

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider i18n={enTranslations}>
          <App />
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
