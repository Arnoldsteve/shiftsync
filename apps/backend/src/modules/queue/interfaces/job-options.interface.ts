/**
 * Job Options Interface
 * Defines the configuration options for BullMQ jobs
 */
export interface JobOptions {
  /**
   * Number of retry attempts for failed jobs
   */
  attempts: number;

  /**
   * Backoff strategy for retrying failed jobs
   */
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };

  /**
   * Retention policy for completed jobs
   */
  removeOnComplete: {
    age: number; // seconds
    count: number; // max number of jobs to keep
  };

  /**
   * Retention policy for failed jobs
   */
  removeOnFail: {
    age: number; // seconds
    count: number; // max number of jobs to keep
  };
}

/**
 * Default job options used across all queues
 * Requirements: 24.1
 */
export const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 days
    count: 500,
  },
};
