import { resetQuerySession } from '../lib/queryCache';
import { useDriversStore } from './driversStore';
import { useInventoryStore } from './inventoryStore';
import { create } from 'zustand';
import { authService, type AuthUser } from '../lib/auth';
import { useDashboardStore } from './dashboardStore';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;
let initializeRequest: Promise<void> | null = null;
let authRevision = 0;
let signingOut = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  error: null,

  signIn: async (email: string, password: string) => {
    const revision = ++authRevision;
    set({ loading: true, error: null });
    
    try {
      const { user, error } = await authService.signIn(email, password);
      if (revision !== authRevision) return;
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ user, loading: false });
      
      // If no profile exists, try to refresh it
      if (!user?.profile) {
        setTimeout(async () => {
          if (revision !== authRevision || get().user?.id !== user?.id) return;
          await get().refreshProfile();
        }, 1000);
      }
    } catch (error) {
      if (revision !== authRevision) return;
      set({ 
        error: error instanceof Error ? error.message : 'Sign in failed', 
        loading: false 
      });
    }
  },

  signUp: async (email: string, password: string) => {
    const revision = ++authRevision;
    set({ loading: true, error: null });
    
    try {
      const { user, error } = await authService.signUp(email, password);
      if (revision !== authRevision) return;
      
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      
      set({ user, loading: false });
    } catch (error) {
      if (revision !== authRevision) return;
      set({ 
        error: error instanceof Error ? error.message : 'Sign up failed', 
        loading: false 
      });
    }
  },

  signOut: async () => {
    ++authRevision;
    signingOut = true;
    set({ loading: true });
    
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      set({ user: null, loading: false, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Sign out failed', 
        loading: false 
      });
    } finally {
      signingOut = false;
    }
  },

  initialize: () => {
    if (initializeRequest) return initializeRequest;
    if (get().initialized) return Promise.resolve();
    set({ loading: true });
    let eventRevision = 0;
    authSubscription?.unsubscribe();
    const { data: { subscription } } = authService.onAuthStateChange((nextUser) => {
      eventRevision++;
      if (signingOut && nextUser) return;
      if (!nextUser || (get().user && get().user?.id !== nextUser.id)) ++authRevision;
      set({ user: nextUser, loading: false, initialized: true });
    });
    authSubscription = subscription;
    const revision = authRevision;
    const initialEventRevision = eventRevision;
    initializeRequest = (async () => {
      try {
        const user = await authService.getCurrentUser();
        if (revision === authRevision && eventRevision === initialEventRevision) {
          set({ user, loading: false, initialized: true });
        }
      } catch (error) {
        if (revision !== authRevision || eventRevision !== initialEventRevision) return;
        set({
          error: error instanceof Error ? error.message : 'Initialization failed',
          loading: false,
          initialized: true
        });
      } finally {
        initializeRequest = null;
      }
    })();
    return initializeRequest;
  },

  refreshProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) return;
    const revision = authRevision;
    
    try {
      const profile = await authService.refreshUserProfile(currentUser.id);
      
      if (profile && revision === authRevision && get().user?.id === currentUser.id) {
        const updatedUser = {
          ...get().user!,
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

// Clear cached data and invalidate pending reads on identity changes, not profile updates.
const unsubscribeDataReset = useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) {
    resetQuerySession();
    useDashboardStore.getState().resetSessionData();
    useDriversStore.getState().resetSessionData();
    useInventoryStore.getState().resetSessionData();
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ++authRevision;
    authSubscription?.unsubscribe();
    unsubscribeDataReset();
  });
}
