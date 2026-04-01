'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@shiftsync/ui';
import { useUsers } from '@/hooks/use-users';
import { UserTable } from '@/components/users/user-table';
import { CreateUserDialog } from '@/components/users/create-user-dialog';
import { ProtectedPage } from '@/components/auth/protected-page';
import { Action } from '@/lib/ability';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: users, isLoading } = useUsers();

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedPage
      action={Action.Manage}
      subject="User"
      fallbackMessage="Only administrators can manage users."
    >
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and permissions</p>
          </div>
          <CreateUserDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <UserTable users={filteredUsers} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
