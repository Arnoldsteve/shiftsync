import { useAuth } from '@/contexts/auth-context';
import { Action, Subjects } from '@/lib/ability';

/**
 * Hook to check permissions using CASL
 */
export function usePermissions() {
  const { ability, user } = useAuth();

  const can = (action: Action, subject: Subjects): boolean => {
    if (!ability) return false;
    return ability.can(action, subject);
  };

  const cannot = (action: Action, subject: Subjects): boolean => {
    if (!ability) return true;
    return ability.cannot(action, subject);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';

  return {
    can,
    cannot,
    isAdmin,
    isManager,
    isStaff,
    ability,
  };
}
