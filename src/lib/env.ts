// Environment variable helper that works in all contexts
export const getEnvVar = (key: string): string | undefined => {
  // Try different ways to access environment variables
  try {
    // First try import.meta.env (Vite)
    if (typeof window !== 'undefined' && (window as any).__VITE_ENV__) {
      return (window as any).__VITE_ENV__[key];
    }
    
    // Fallback to hardcoded values for development
    if (key === 'VITE_SUPABASE_URL') {
      return 'https://lzjzdogiuxenlojeudjt.supabase.co';
    }
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6anpkb2dpdXhlbmxvamV1ZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MTMyMjksImV4cCI6MjA3NDE4OTIyOX0.q3kAu-fEJbcYel_H8vxcc0RP3QxAWgCkTF6aqpSCZH4';
    }
    
    return undefined;
  } catch (error) {
    console.warn(`Failed to get environment variable ${key}:`, error);
    return undefined;
  }
};
