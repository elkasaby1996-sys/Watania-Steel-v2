// Environment variable helper that works in all contexts
const DEFAULT_SUPABASE_URL = 'https://lzjzdogiuxenlojeudjt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6anpkb2dpdXhlbmxvamV1ZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTMyMjksImV4cCI6MjA3NDE4OTIyOX0.q3kAu-fEJbcYel_H8vxcc0RP3QxAWgCkTF6aqpSCZH4';

export const getEnvVar = (key: string): string | undefined => {
  // Try different ways to access environment variables
  try {
    // First try runtime-injected env (e.g. window.__VITE_ENV__)
    if (typeof window !== 'undefined' && (window as any).__VITE_ENV__?.[key]) {
      return (window as any).__VITE_ENV__[key];
    }

    // Fall back to Vite build-time env when available
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }

    if (key === 'VITE_SUPABASE_URL') {
      return DEFAULT_SUPABASE_URL;
    }
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      return DEFAULT_SUPABASE_ANON_KEY;
    }

    return undefined;
  } catch (error) {
    console.warn(`Failed to get environment variable ${key}:`, error);
    return undefined;
  }
};
