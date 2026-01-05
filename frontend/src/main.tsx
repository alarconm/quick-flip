import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider i18n={enTranslations}>
      <App />
    </AppProvider>
  </StrictMode>,
);
