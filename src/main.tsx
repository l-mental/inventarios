import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { installLocalApiInterceptor } from './lib/localApi';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Install global /api/* interceptor immediately so Vercel/static deployments never trigger 404
installLocalApiInterceptor();

// Normalize path URLs (e.g. /login or /dashboard) to hash routes if opened directly
if (
  typeof window !== 'undefined' &&
  window.location.pathname !== '/' &&
  window.location.pathname !== '/index.html' &&
  !window.location.hash
) {
  const targetHash = '#' + window.location.pathname + window.location.search;
  window.history.replaceState(null, '', '/' + targetHash);
}

// Silence benign development errors and warnings in the preview environment
const silentLogs = [
  'WebSocket closed without opened',
  'The width(-1) and height(-1) of chart should be greater than 0'
];

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && silentLogs.some(log => args[0].includes(log))) return;
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && silentLogs.some(log => args[0].includes(log))) return;
  originalError(...args);
};

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message && silentLogs.some(log => event.reason.message.includes(log))) {
    event.preventDefault();
  }
});

// Register PWA service worker and force update if a new build is deployed
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
