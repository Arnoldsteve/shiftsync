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
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shiftsync/ui';
import { RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useJobs, useRetryJob } from '@/hooks/use-jobs';
import { useJobRealtime } from '@/hooks/use-job-realtime';
import type { JobListFilters, JobStatus } from '@/types/job.types';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobListFilters>({
    queue: 'all',
    status: undefined,
  });

  const { data: jobs, isLoading } = useJobs(filters);
  const retryJob = useRetryJob();
  useJobRealtime();

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: JobStatus) => {
    const baseClasses = 'px-2 py-1 rounded text-xs font-medium';
    switch (status) {
      case 'queued':
        return `${baseClasses} bg-gray-100 text-gray-700`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return baseClasses;
    }
  };

  const handleRetry = (queue: string, jobId: string) => {
    retryJob.mutate({ queue, jobId });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Job Queue Monitor</h1>
        <p className="text-muted-foreground">
          Monitor and manage background jobs across all queues
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter jobs by queue and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="queue">Queue</Label>
              <Select
                value={filters.queue || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, queue: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All queues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All queues</SelectItem>
                  <SelectItem value="fairness">Fairness Reports</SelectItem>
                  <SelectItem value="overtime">Overtime Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === 'all' ? undefined : (value as JobStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>{jobs?.length || 0} jobs found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
          ) : jobs && jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Queue</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className={getStatusBadge(job.status)}>{job.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{job.type}</TableCell>
                      <TableCell className="text-sm">{job.queue}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(job.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.progress !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{job.progress}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {job.error && (
                          <div className="text-xs text-red-600 truncate" title={job.error}>
                            {job.error}
                          </div>
                        )}
                        {job.result && (
                          <div className="text-xs text-green-600 truncate">
                            {JSON.stringify(job.result).substring(0, 50)}...
                          </div>
                        )}
                        {!job.error && !job.result && job.data && (
                          <div className="text-xs text-muted-foreground truncate">
                            {JSON.stringify(job.data).substring(0, 50)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {job.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(job.queue, job.id)}
                            disabled={retryJob.isPending}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Retry
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No jobs found for the selected filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
