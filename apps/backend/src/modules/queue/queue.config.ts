import { QueueOptions } from 'bullmq';

/**
 * Get BullMQ Queue Configuration
 *
 * Configures Redis connection and default job options for all queues.
 * Uses REDIS_URL from environment variables.
 *
 * ⚡ Performance: Optimized for cloud Redis providers (Redis Cloud, Upstash)
 * ⚡ Resilience: Exponential backoff for failed jobs
 * ⚡ Housekeeping: Auto-cleanup of old completed/failed jobs
 */
export const getQueueConfig = (): QueueOptions => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  return {
    connection: {
      url: redisUrl,
      // ⚡ Handle secure Redis (rediss://)
      tls: redisUrl.startsWith('rediss') ? {} : undefined,
      // ⚡ Required for BullMQ blocking operations
      maxRetriesPerRequest: null,
      // ⚡ Performance: Disable ready check for cloud providers
      enableReadyCheck: false,
      connectTimeout: 30000,
      keepAlive: 30000,
    },
    defaultJobOptions: {
      // ⚡ Resilience: Exponential backoff for failed jobs
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      // ⚡ Housekeeping: Keep history for debugging but clean up old data
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        count: 500,
      },
    },
  };
};
