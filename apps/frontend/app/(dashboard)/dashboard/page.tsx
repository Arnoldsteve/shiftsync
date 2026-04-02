'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@shiftsync/ui';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Can } from '@/components/auth/can';
import { Action } from '@/lib/ability';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin, isManager, isStaff } = usePermissions();
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.firstName} {user?.lastName}
        </h1>
        <p className="text-muted-foreground">
          Role: <span className="font-medium">{user?.role}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Admin Dashboard */}
        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage users, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/admin/users')} className="w-full">
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Configure system settings and locations</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/admin/config')} className="w-full">
                  System Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>View system audit trail</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/admin/audit')} className="w-full">
                  View Audit Logs
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Manager Dashboard */}
        {isManager && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Schedule Management</CardTitle>
                <CardDescription>Create and manage shift schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/schedule')} className="w-full">
                  Manage Schedules
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Swap Requests</CardTitle>
                <CardDescription>Approve or reject shift swap requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/swaps')} className="w-full">
                  View Requests
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Callout Management</CardTitle>
                <CardDescription>Handle staff callouts and find coverage</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/callouts')} className="w-full">
                  Manage Callouts
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overtime Tracking</CardTitle>
                <CardDescription>Monitor overtime and labor costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/overtime')} className="w-full">
                  View Overtime
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fairness Analytics</CardTitle>
                <CardDescription>View shift distribution and fairness metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/fairness')} className="w-full">
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Staff Dashboard */}
        {isStaff && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>My Schedule</CardTitle>
                <CardDescription>View your upcoming shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/schedule')} className="w-full">
                  View Schedule
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shift Swaps</CardTitle>
                <CardDescription>Request shift swaps or pick up shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/swaps')} className="w-full">
                  Manage Swaps
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Call Out</CardTitle>
                <CardDescription>Report unavailability for shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/callouts')} className="w-full">
                  Submit Callout
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Overtime</CardTitle>
                <CardDescription>View your hours and overtime</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/overtime')} className="w-full">
                  View Hours
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Common Cards for All Roles */}
        <Can I={Action.Read} a="Shift">
          <Card>
            <CardHeader>
              <CardTitle>Available Shifts</CardTitle>
              <CardDescription>View all available shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/shifts')} className="w-full">
                Browse Shifts
              </Button>
            </CardContent>
          </Card>
        </Can>
      </div>
    </div>
  );
}
