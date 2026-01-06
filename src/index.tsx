import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Make environment variables available globally without overriding runtime injection
if (typeof window !== 'undefined') {
  const existingEnv = (window as any).__VITE_ENV__ ?? {};
  const buildEnv = (import.meta as any).env ?? {};

  (window as any).__VITE_ENV__ = {
    ...existingEnv,
    ...(buildEnv.VITE_SUPABASE_URL
      ? { VITE_SUPABASE_URL: buildEnv.VITE_SUPABASE_URL }
      : {}),
    ...(buildEnv.VITE_SUPABASE_ANON_KEY
      ? { VITE_SUPABASE_ANON_KEY: buildEnv.VITE_SUPABASE_ANON_KEY }
      : {}),
  };
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
