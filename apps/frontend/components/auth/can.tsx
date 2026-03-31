'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { Action, Subjects } from '@/lib/ability';

interface CanProps {
  I: Action;
  a: Subjects;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render based on permissions
 * Usage: <Can I={Action.Create} a="Shift">Create Shift Button</Can>
 */
export function Can({ I, a, children, fallback = null }: CanProps) {
  const { can } = usePermissions();

  if (can(I, a)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
