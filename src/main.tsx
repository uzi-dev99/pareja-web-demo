import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './fonts.css';
import './index.css';

// ponytail: register the pass-through service worker so Chrome treats the
// site as installable. Feature-gated so it no-ops on browsers without SW
// support, and the .catch(() => {}) swallows failures so a blocked SW
// registration never breaks the app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);