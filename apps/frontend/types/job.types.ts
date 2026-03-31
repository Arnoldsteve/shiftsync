export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobType = 'fairness-report' | 'overtime-report';

export interface Job {
  id: string;
  queue: string;
  type: JobType;
  data: Record<string, any>;
  status: JobStatus;
  progress?: number;
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
}

export interface JobListFilters {
  queue?: string;
  status?: JobStatus;
}
