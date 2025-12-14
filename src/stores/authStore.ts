import { create } from 'zustand';
import { authService, type AuthUser } from '../lib/auth';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { user, error } = await authService.signIn(email, password);
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ user, loading: false });
      
      // If no profile exists, try to refresh it
      if (!user?.profile) {
        setTimeout(async () => {
          await get().refreshProfile();
        }, 1000);
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign in failed', 
        loading: false 
      });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      const { user, error } = await authService.signUp(email, password);
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ user, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign up failed', 
        loading: false 
      });
    }
  },

  signOut: async () => {
    set({ loading: true });
    
    try {
      await authService.signOut();
      set({ user: null, loading: false, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign out failed', 
        loading: false 
      });
    }
  },

  initialize: async () => {
    set({ loading: true });
    
    try {
      const user = await authService.getCurrentUser();
      set({ user, loading: false });
      
      // Listen for auth state changes
      authService.onAuthStateChange((user) => {
        set({ user });
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Initialization failed', 
        loading: false 
      });
    }
  },

  refreshProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) return;
    
    try {
      const profile = await authService.refreshUserProfile(currentUser.id);
      
      if (profile) {
        const updatedUser = {
          ...currentUser,
          profile
        };
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  },

  clearError: () => set({ error: null })
}));
