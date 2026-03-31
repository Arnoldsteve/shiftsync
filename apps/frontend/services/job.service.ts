import { apiClient } from '@/lib/api-client';
import type { Job, JobListFilters } from '@/types/job.types';

export const jobService = {
  async getJobs(filters: JobListFilters): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters.queue) params.append('queue', filters.queue);
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get(`/jobs?${params.toString()}`);
    return response.data as Job[];
  },

  async getJob(queue: string, jobId: string): Promise<Job> {
    const response = await apiClient.get(`/jobs/${queue}/${jobId}`);
    return response.data as Job;
  },

  async retryJob(queue: string, jobId: string): Promise<Job> {
    const response = await apiClient.post(`/jobs/${queue}/${jobId}/retry`);
    return response.data as Job;
  },
};
