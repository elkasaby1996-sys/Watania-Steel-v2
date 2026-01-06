// Environment variable helper that works in all contexts
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

    return undefined;
  } catch (error) {
    console.warn(`Failed to get environment variable ${key}:`, error);
    return undefined;
  }
};
