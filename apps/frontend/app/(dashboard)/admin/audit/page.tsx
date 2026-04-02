'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Input,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shiftsync/ui';
import { Shield, Download } from 'lucide-react';
import { useAuditLogs, useVerifyAuditRecord, useExportAuditLogs } from '@/hooks/use-audit';
import { ProtectedPage } from '@/components/auth/protected-page';
import { Can } from '@/components/auth/can';
import { Action } from '@/lib/ability';
import type { AuditFilters } from '@/types/audit.types';

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>({
    // Temporarily remove date filters to see all audit logs
    // startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    // endDate: new Date().toISOString().split('T')[0],
  });
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: auditData, isLoading } = useAuditLogs(filters);

  console.log('Audit log', auditData);
  const verifyRecord = useVerifyAuditRecord();
  const exportLogs = useExportAuditLogs();

  const logs = auditData?.data;

  const handleVerify = (recordId: string) => {
    setVerifyingId(recordId);
    verifyRecord.mutate(recordId, {
      onSettled: () => setVerifyingId(null),
    });
  };

  const handleExport = () => {
    exportLogs.mutate(filters);
  };

  return (
    <ProtectedPage
      action={Action.Read}
      subject="Audit"
      fallbackMessage="Only administrators and managers can view audit logs."
    >
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Log Viewer</h1>
            <p className="text-muted-foreground">
              View and verify system audit logs for compliance and security
            </p>
          </div>
          <Can I={Action.Read} a="Audit">
            <Button
              onClick={handleExport}
              disabled={exportLogs.isPending || isLoading}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportLogs.isPending ? 'Exporting...' : 'Export CSV'}
            </Button>
          </Can>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter audit logs by date, entity, action, or user</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entityType">Entity Type</Label>
                <Select
                  value={filters.entityType || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, entityType: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    <SelectItem value="shift">Shift</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="swap">Swap</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="config">Config</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={filters.action || 'all'}
                  onValueChange={(value) =>
                    setFilters({ ...filters, action: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Records</CardTitle>
            <CardDescription>{auditData?.total || 0} records found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
            ) : logs && logs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Verify</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{log.userName}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              log.action === 'create'
                                ? 'bg-green-100 text-green-700'
                                : log.action === 'delete'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{log.entityType}</TableCell>
                        <TableCell className="text-sm font-mono">{log.entityId}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {log.previousState && (
                            <div className="text-red-600">
                              From: {JSON.stringify(log.previousState).substring(0, 50)}...
                            </div>
                          )}
                          {log.newState && (
                            <div className="text-green-600">
                              To: {JSON.stringify(log.newState).substring(0, 50)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerify(log.id)}
                            disabled={verifyingId === log.id}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {verifyingId === log.id ? 'Verifying...' : 'Verify'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found for the selected filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
