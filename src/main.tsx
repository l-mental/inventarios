import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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

// Register PWA service worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
