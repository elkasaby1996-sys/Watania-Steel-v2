import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

type UseIsAdminResult = {
  isAdmin: boolean;
  role: string | null;
};

export function useIsAdmin(): UseIsAdminResult {
  const role = useAuthStore((state) => state.user?.profile?.role ?? null);

  const isAdmin = useMemo(() => role === 'admin', [role]);

  return { isAdmin, role };
}
