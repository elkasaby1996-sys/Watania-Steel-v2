import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Make environment variables available globally
if (typeof window !== 'undefined') {
  (window as any).__VITE_ENV__ = {
    VITE_SUPABASE_URL: 'https://lzjzdogiuxenlojeudjt.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6anpkb2dpdXhlbmxvamV1ZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTMyMjksImV4cCI6MjA3NDE4OTIyOX0.q3kAu-fEJbcYel_H8vxcc0RP3QxAWgCkTF6aqpSCZH4'
  };
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
