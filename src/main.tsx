import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length === 0) return;

      await Promise.all(
        regs.map((registration) => registration.unregister())
      );

      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => caches.delete(key))
      );

      location.reload();
    });
  }
}