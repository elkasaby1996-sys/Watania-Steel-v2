import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error };
      }

      // Wait for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get user profile with role from profiles table
      const profile = await this.getUserProfile(data.user.id);
      
      const authUser = {
        id: data.user.id,
        email: data.user.email!,
        profile
      };
      
      return { user: authUser, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign up with email and password
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        return { user: null, error };
      }

      if (data.user) {
        // Wait for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get user profile with role from profiles table
        const profile = await this.getUserProfile(data.user.id);
        
        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            profile
          },
          error: null
        };
      }

      return { user: null, error: new Error('User creation failed') };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign out
  async signOut() {
    if (!supabase) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Get user profile with role from profiles table
      const profile = await this.getUserProfile(user.id);
      
      return {
        id: user.id,
        email: user.email!,
        profile
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // Get user profile with role
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, try to create it as fallback
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          return await this.createFallbackProfile(userId);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  },

  // Create fallback profile when database trigger fails
  async createFallbackProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email;
      
      if (!userEmail) return null;

      // Determine role based on email patterns
      let role: 'viewer' | 'editor' | 'admin' = 'viewer';
      
      if (userEmail === 'ahmed@watania.com') {
        role = 'admin';
      } else if (userEmail.toLowerCase().includes('admin')) {
        role = 'admin';
      } else if (userEmail.toLowerCase().includes('editor') || userEmail.toLowerCase().includes('manager')) {
        role = 'editor';
      }
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userEmail,
          role: role,
          full_name: userEmail.split('@')[0]
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('Failed to create fallback profile:', createError);
        return null;
      }
      
      return newProfile;
    } catch (error) {
      console.error('Error in createFallbackProfile:', error);
      return null;
    }
  },


  // Sign out
  async signOut() {
    console.log('Signing out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }
      return { error };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { error: error as Error };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Wait for any database operations to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const profile = await this.getUserProfile(session.user.id);
        const authUser = {
          id: session.user.id,
          email: session.user.email!,
          profile
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });

    return { data: { subscription } };
  },

  // Force refresh user profile
  async refreshUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      return null;
    }
  }
};

// Permission helpers
export const hasPermission = (userRole: string | undefined, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
  if (!userRole) return false;

  switch (action) {
    case 'view':
      return ['viewer', 'editor', 'admin'].includes(userRole);
    case 'create':
    case 'edit':
      return ['editor', 'admin'].includes(userRole);
    case 'delete':
      return userRole === 'admin';
    default:
      return false;
  }
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'viewer':
      return 'Viewer';
    case 'editor':
      return 'Editor';
    case 'admin':
      return 'Administrator';
    default:
      return 'Unknown';
  }
};
