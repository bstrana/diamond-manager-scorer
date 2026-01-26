
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWithAuth from './App';

// Override process.env with runtime environment variables injected by server.js
if (typeof window !== 'undefined' && (window as any).__ENV__) {
  const runtimeEnv = (window as any).__ENV__;
  // Update process.env with runtime values (for client-side code)
  if (typeof process !== 'undefined' && process.env) {
    Object.assign(process.env, runtimeEnv);
  }
  // Also make available globally
  (window as any).process = { env: runtimeEnv };
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('[index.tsx] window.__ENV__ not found! Environment variables may not be available.');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppWithAuth />
  </React.StrictMode>
);
