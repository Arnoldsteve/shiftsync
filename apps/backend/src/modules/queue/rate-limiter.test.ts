import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QueueRateLimiter } from './rate-limiter';

describe('QueueRateLimiter', () => {
  let rateLimiter: QueueRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      rateLimiter = new QueueRateLimiter();

      const status = rateLimiter.getStatus();
      expect(status.maxJobsPerSecond).toBe(50);
      expect(status.jobsProcessedThisSecond).toBe(0);
    });

    it('should initialize with custom values', () => {
      rateLimiter = new QueueRateLimiter(100, 20);

      const status = rateLimiter.getStatus();
      expect(status.maxJobsPerSecond).toBe(100);
    });
  });

  describe('canProcessJob', () => {
    beforeEach(() => {
      rateLimiter = new QueueRateLimiter(5, 2); // 5 jobs/sec for easier testing
    });

    it('should allow processing when under limit', () => {
      expect(rateLimiter.canProcessJob()).toBe(true);
      expect(rateLimiter.canProcessJob()).toBe(true);
      expect(rateLimiter.canProcessJob()).toBe(true);

      const status = rateLimiter.getStatus();
      expect(status.jobsProcessedThisSecond).toBe(3);
    });

    it('should deny processing when limit reached', () => {
      // Process 5 jobs (at limit)
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.canProcessJob()).toBe(true);
      }

      // 6th job should be denied
      expect(rateLimiter.canProcessJob()).toBe(false);

      const status = rateLimiter.getStatus();
      expect(status.jobsProcessedThisSecond).toBe(5);
    });

    it('should reset counter after 1 second', () => {
      // Process 5 jobs (at limit)
      for (let i = 0; i < 5; i++) {
        rateLimiter.canProcessJob();
      }

      // Should be denied
      expect(rateLimiter.canProcessJob()).toBe(false);

      // Advance time by 1 second
      vi.advanceTimersByTime(1000);

      // Should be allowed again
      expect(rateLimiter.canProcessJob()).toBe(true);

      const status = rateLimiter.getStatus();
      expect(status.jobsProcessedThisSecond).toBe(1);
    });

    it('should handle multiple reset cycles', () => {
      // First second: process 3 jobs
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();

      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(3);

      // Advance to next second
      vi.advanceTimersByTime(1000);

      // Second second: process 2 jobs
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();

      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(2);

      // Advance to third second
      vi.advanceTimersByTime(1000);

      // Third second: process 5 jobs (at limit)
      for (let i = 0; i < 5; i++) {
        rateLimiter.canProcessJob();
      }

      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(5);
      expect(rateLimiter.canProcessJob()).toBe(false);
    });

    it('should not reset counter before 1 second elapsed', () => {
      // Process 5 jobs
      for (let i = 0; i < 5; i++) {
        rateLimiter.canProcessJob();
      }

      // Advance time by 999ms (just under 1 second)
      vi.advanceTimersByTime(999);

      // Should still be denied
      expect(rateLimiter.canProcessJob()).toBe(false);
      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(5);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      rateLimiter = new QueueRateLimiter(10, 5);
    });

    it('should return correct status with no jobs processed', () => {
      const status = rateLimiter.getStatus();

      expect(status).toEqual({
        jobsProcessedThisSecond: 0,
        maxJobsPerSecond: 10,
        utilizationPercent: 0,
      });
    });

    it('should return correct status with some jobs processed', () => {
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();

      const status = rateLimiter.getStatus();

      expect(status).toEqual({
        jobsProcessedThisSecond: 3,
        maxJobsPerSecond: 10,
        utilizationPercent: 30,
      });
    });

    it('should return correct status at 100% utilization', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.canProcessJob();
      }

      const status = rateLimiter.getStatus();

      expect(status).toEqual({
        jobsProcessedThisSecond: 10,
        maxJobsPerSecond: 10,
        utilizationPercent: 100,
      });
    });

    it('should calculate utilization percentage correctly', () => {
      rateLimiter = new QueueRateLimiter(100, 10);

      // Process 25 jobs
      for (let i = 0; i < 25; i++) {
        rateLimiter.canProcessJob();
      }

      const status = rateLimiter.getStatus();
      expect(status.utilizationPercent).toBe(25);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      rateLimiter = new QueueRateLimiter(5, 2);
    });

    it('should reset counter to zero', () => {
      // Process some jobs
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();
      rateLimiter.canProcessJob();

      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(3);

      // Reset
      rateLimiter.reset();

      expect(rateLimiter.getStatus().jobsProcessedThisSecond).toBe(0);
    });

    it('should allow processing after reset', () => {
      // Process to limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.canProcessJob();
      }

      // Should be denied
      expect(rateLimiter.canProcessJob()).toBe(false);

      // Reset
      rateLimiter.reset();

      // Should be allowed again
      expect(rateLimiter.canProcessJob()).toBe(true);
    });

    it('should reset timer reference', () => {
      // Process some jobs
      rateLimiter.canProcessJob();

      // Advance time
      vi.advanceTimersByTime(500);

      // Reset
      rateLimiter.reset();

      // Process more jobs
      for (let i = 0; i < 5; i++) {
        rateLimiter.canProcessJob();
      }

      // Should be at limit
      expect(rateLimiter.canProcessJob()).toBe(false);

      // Advance by 1 second from reset point
      vi.advanceTimersByTime(1000);

      // Should be allowed again
      expect(rateLimiter.canProcessJob()).toBe(true);
    });
  });

  describe('high load scenarios', () => {
    it('should handle burst traffic correctly', () => {
      rateLimiter = new QueueRateLimiter(50, 10);

      // Simulate burst of 100 requests
      let allowed = 0;
      let denied = 0;

      for (let i = 0; i < 100; i++) {
        if (rateLimiter.canProcessJob()) {
          allowed++;
        } else {
          denied++;
        }
      }

      expect(allowed).toBe(50);
      expect(denied).toBe(50);
    });

    it('should maintain rate limit across multiple seconds', () => {
      rateLimiter = new QueueRateLimiter(10, 5);

      let totalProcessed = 0;

      // Simulate 5 seconds of traffic
      for (let second = 0; second < 5; second++) {
        // Try to process 15 jobs per second
        for (let i = 0; i < 15; i++) {
          if (rateLimiter.canProcessJob()) {
            totalProcessed++;
          }
        }

        // Advance to next second
        vi.advanceTimersByTime(1000);
      }

      // Should have processed exactly 10 jobs per second * 5 seconds = 50 jobs
      expect(totalProcessed).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle zero max jobs per second', () => {
      rateLimiter = new QueueRateLimiter(0, 0);

      expect(rateLimiter.canProcessJob()).toBe(false);
    });

    it('should handle very high limits', () => {
      rateLimiter = new QueueRateLimiter(10000, 1000);

      // Process 1000 jobs
      for (let i = 0; i < 1000; i++) {
        expect(rateLimiter.canProcessJob()).toBe(true);
      }

      const status = rateLimiter.getStatus();
      expect(status.jobsProcessedThisSecond).toBe(1000);
    });

    it('should handle single job limit', () => {
      rateLimiter = new QueueRateLimiter(1, 1);

      expect(rateLimiter.canProcessJob()).toBe(true);
      expect(rateLimiter.canProcessJob()).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(rateLimiter.canProcessJob()).toBe(true);
    });
  });
});
