import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type UserRole = 'viewer' | 'editor' | 'admin';

type UserRoleResult = {
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
};

export function useUserRole(): UserRoleResult {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadRole = async () => {
      setIsLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isActive) return;

      if (sessionError) {
        setError(sessionError.message);
        setRole(null);
        setIsLoading(false);
        return;
      }

      const userId = sessionData.session?.user?.id;
      if (!userId) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      const { data, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!isActive) return;

      if (roleError) {
        setError(roleError.message);
        setRole(null);
      } else {
        setRole((data?.role as UserRole) ?? null);
      }
      setIsLoading(false);
    };

    loadRole();

    return () => {
      isActive = false;
    };
  }, []);

  return { role, isLoading, error };
}
