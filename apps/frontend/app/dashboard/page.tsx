'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shiftsync/ui';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ShiftSync</CardTitle>
            <CardDescription>Your staff scheduling platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Dashboard features coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
