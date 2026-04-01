'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { Action, Subjects } from '@/lib/ability';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shiftsync/ui';
import { ShieldAlert } from 'lucide-react';

interface ProtectedPageProps {
  action: Action;
  subject: Subjects;
  children: ReactNode;
  fallbackMessage?: string;
}

/**
 * Component to protect entire pages based on permissions
 * Usage: <ProtectedPage action={Action.Read} subject="Audit">Page Content</ProtectedPage>
 */
export function ProtectedPage({
  action,
  subject,
  children,
  fallbackMessage = 'You do not have permission to access this page.',
}: ProtectedPageProps) {
  const { can } = usePermissions();
  const router = useRouter();

  if (!can(action, subject)) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <ShieldAlert className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Insufficient Permissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{fallbackMessage}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-primary hover:underline"
            >
              Return to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
