import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueService } from './queue.service';
import { Queue, Job } from 'bullmq';
import { QUEUES, JOB_NAMES } from './queue.constants';

describe('QueueService', () => {
  let queueService: QueueService;
  let mockFairnessQueue: Partial<Queue>;
  let mockOvertimeQueue: Partial<Queue>;
  let mockDropRequestExpirationQueue: Partial<Queue>;

  beforeEach(() => {
    // Mock fairness report queue
    mockFairnessQueue = {
      add: vi.fn(),
      getJob: vi.fn(),
      getWaiting: vi.fn(),
      getActive: vi.fn(),
      getCompleted: vi.fn(),
      getFailed: vi.fn(),
    };

    // Mock overtime report queue
    mockOvertimeQueue = {
      add: vi.fn(),
      getJob: vi.fn(),
      getWaiting: vi.fn(),
      getActive: vi.fn(),
      getCompleted: vi.fn(),
      getFailed: vi.fn(),
    };

    // Mock drop request expiration queue
    mockDropRequestExpirationQueue = {
      add: vi.fn(),
      getJob: vi.fn(),
      getWaiting: vi.fn(),
      getActive: vi.fn(),
      getCompleted: vi.fn(),
      getFailed: vi.fn(),
    };

    queueService = new QueueService(
      mockFairnessQueue as Queue,
      mockOvertimeQueue as Queue,
      mockDropRequestExpirationQueue as Queue
    );
  });

  describe('queueFairnessReport', () => {
    it('should queue a fairness report job with correct data', async () => {
      const locationId = 'loc-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockJob = { id: 'job-123' } as Job;

      vi.mocked(mockFairnessQueue.add).mockResolvedValue(mockJob);

      const result = await queueService.queueFairnessReport(locationId, startDate, endDate);

      expect(mockFairnessQueue.add).toHaveBeenCalledWith(JOB_NAMES.GENERATE_FAIRNESS_REPORT, {
        locationId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      expect(result).toBe(mockJob);
    });

    it('should handle different date ranges', async () => {
      const locationId = 'loc-2';
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      const mockJob = { id: 'job-456' } as Job;

      vi.mocked(mockFairnessQueue.add).mockResolvedValue(mockJob);

      await queueService.queueFairnessReport(locationId, startDate, endDate);

      expect(mockFairnessQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.GENERATE_FAIRNESS_REPORT,
        expect.objectContaining({
          locationId: 'loc-2',
          startDate: '2024-06-01T00:00:00.000Z',
          endDate: '2024-06-30T00:00:00.000Z',
        })
      );
    });
  });

  describe('queueOvertimeReport', () => {
    it('should queue an overtime report job with correct data', async () => {
      const locationId = 'loc-1';
      const payPeriods = [
        { weekStart: new Date('2024-01-01') },
        { weekStart: new Date('2024-01-08') },
      ];
      const mockJob = { id: 'job-789' } as Job;

      vi.mocked(mockOvertimeQueue.add).mockResolvedValue(mockJob);

      const result = await queueService.queueOvertimeReport(locationId, payPeriods);

      expect(mockOvertimeQueue.add).toHaveBeenCalledWith(JOB_NAMES.GENERATE_OVERTIME_REPORT, {
        locationId,
        payPeriods: [
          { weekStart: '2024-01-01T00:00:00.000Z' },
          { weekStart: '2024-01-08T00:00:00.000Z' },
        ],
      });
      expect(result).toBe(mockJob);
    });

    it('should handle single pay period', async () => {
      const locationId = 'loc-3';
      const payPeriods = [{ weekStart: new Date('2024-03-01') }];
      const mockJob = { id: 'job-single' } as Job;

      vi.mocked(mockOvertimeQueue.add).mockResolvedValue(mockJob);

      await queueService.queueOvertimeReport(locationId, payPeriods);

      expect(mockOvertimeQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.GENERATE_OVERTIME_REPORT,
        expect.objectContaining({
          locationId: 'loc-3',
          payPeriods: [{ weekStart: '2024-03-01T00:00:00.000Z' }],
        })
      );
    });
  });

  describe('getJobStatus', () => {
    it('should get job status for fairness report queue', async () => {
      const jobId = 'job-123';
      const mockJob = {
        id: jobId,
        getState: vi.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: { success: true },
        failedReason: undefined,
      } as any;

      vi.mocked(mockFairnessQueue.getJob).mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus(QUEUES.FAIRNESS_REPORT, jobId);

      expect(mockFairnessQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toEqual({
        id: jobId,
        state: 'completed',
        progress: 100,
        returnvalue: { success: true },
        failedReason: undefined,
      });
    });

    it('should get job status for overtime report queue', async () => {
      const jobId = 'job-456';
      const mockJob = {
        id: jobId,
        getState: vi.fn().mockResolvedValue('active'),
        progress: 50,
        returnvalue: null,
        failedReason: undefined,
      } as any;

      vi.mocked(mockOvertimeQueue.getJob).mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus(QUEUES.OVERTIME_REPORT, jobId);

      expect(mockOvertimeQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toEqual({
        id: jobId,
        state: 'active',
        progress: 50,
        returnvalue: null,
        failedReason: undefined,
      });
    });

    it('should throw error when job not found', async () => {
      const jobId = 'non-existent';

      vi.mocked(mockFairnessQueue.getJob).mockResolvedValue(null);

      await expect(queueService.getJobStatus(QUEUES.FAIRNESS_REPORT, jobId)).rejects.toThrow(
        `Job ${jobId} not found in queue ${QUEUES.FAIRNESS_REPORT}`
      );
    });

    it('should include failed reason for failed jobs', async () => {
      const jobId = 'job-failed';
      const mockJob = {
        id: jobId,
        getState: vi.fn().mockResolvedValue('failed'),
        progress: 0,
        returnvalue: null,
        failedReason: 'Database connection error',
      } as any;

      vi.mocked(mockFairnessQueue.getJob).mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus(QUEUES.FAIRNESS_REPORT, jobId);

      expect(result.failedReason).toBe('Database connection error');
    });
  });

  describe('getJobsByState', () => {
    it('should get waiting jobs from fairness queue', async () => {
      const mockJobs = [
        { id: 'job-1', name: 'fairness-report' },
        { id: 'job-2', name: 'fairness-report' },
      ] as Job[];

      vi.mocked(mockFairnessQueue.getWaiting).mockResolvedValue(mockJobs);

      const result = await queueService.getJobsByState(QUEUES.FAIRNESS_REPORT, 'waiting');

      expect(mockFairnessQueue.getWaiting).toHaveBeenCalled();
      expect(result).toEqual(mockJobs);
    });

    it('should get active jobs from overtime queue', async () => {
      const mockJobs = [{ id: 'job-3', name: 'overtime-report' }] as Job[];

      vi.mocked(mockOvertimeQueue.getActive).mockResolvedValue(mockJobs);

      const result = await queueService.getJobsByState(QUEUES.OVERTIME_REPORT, 'active');

      expect(mockOvertimeQueue.getActive).toHaveBeenCalled();
      expect(result).toEqual(mockJobs);
    });

    it('should get completed jobs', async () => {
      const mockJobs = [{ id: 'job-4', name: 'fairness-report' }] as Job[];

      vi.mocked(mockFairnessQueue.getCompleted).mockResolvedValue(mockJobs);

      const result = await queueService.getJobsByState(QUEUES.FAIRNESS_REPORT, 'completed');

      expect(mockFairnessQueue.getCompleted).toHaveBeenCalled();
      expect(result).toEqual(mockJobs);
    });

    it('should get failed jobs', async () => {
      const mockJobs = [{ id: 'job-5', name: 'overtime-report' }] as Job[];

      vi.mocked(mockOvertimeQueue.getFailed).mockResolvedValue(mockJobs);

      const result = await queueService.getJobsByState(QUEUES.OVERTIME_REPORT, 'failed');

      expect(mockOvertimeQueue.getFailed).toHaveBeenCalled();
      expect(result).toEqual(mockJobs);
    });

    it('should return empty array for invalid state', async () => {
      const result = await queueService.getJobsByState(QUEUES.FAIRNESS_REPORT, 'invalid' as any);

      expect(result).toEqual([]);
    });
  });

  describe('retryJob', () => {
    it('should retry a failed job in fairness queue', async () => {
      const jobId = 'job-failed';
      const mockJob = {
        id: jobId,
        retry: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(mockFairnessQueue.getJob).mockResolvedValue(mockJob);

      await queueService.retryJob(QUEUES.FAIRNESS_REPORT, jobId);

      expect(mockFairnessQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should retry a failed job in overtime queue', async () => {
      const jobId = 'job-failed-2';
      const mockJob = {
        id: jobId,
        retry: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(mockOvertimeQueue.getJob).mockResolvedValue(mockJob);

      await queueService.retryJob(QUEUES.OVERTIME_REPORT, jobId);

      expect(mockOvertimeQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      const jobId = 'non-existent';

      vi.mocked(mockFairnessQueue.getJob).mockResolvedValue(null);

      await expect(queueService.retryJob(QUEUES.FAIRNESS_REPORT, jobId)).rejects.toThrow(
        `Job ${jobId} not found in queue ${QUEUES.FAIRNESS_REPORT}`
      );
    });
  });

  describe('job configuration', () => {
    it('should use correct job name for fairness reports', async () => {
      const mockJob = { id: 'job-123' } as Job;
      vi.mocked(mockFairnessQueue.add).mockResolvedValue(mockJob);

      await queueService.queueFairnessReport('loc-1', new Date(), new Date());

      expect(mockFairnessQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.GENERATE_FAIRNESS_REPORT,
        expect.any(Object)
      );
    });

    it('should use correct job name for overtime reports', async () => {
      const mockJob = { id: 'job-456' } as Job;
      vi.mocked(mockOvertimeQueue.add).mockResolvedValue(mockJob);

      await queueService.queueOvertimeReport('loc-1', [{ weekStart: new Date() }]);

      expect(mockOvertimeQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.GENERATE_OVERTIME_REPORT,
        expect.any(Object)
      );
    });
  });

  describe('scheduleDropRequestExpiration', () => {
    it('should schedule recurring drop request expiration job', async () => {
      const mockJob = { id: 'drop-expiration-recurring' } as Job;
      vi.mocked(mockDropRequestExpirationQueue.add).mockResolvedValue(mockJob);

      await queueService.scheduleDropRequestExpiration();

      expect(mockDropRequestExpirationQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_DROP_REQUESTS,
        undefined,
        {
          repeat: {
            pattern: '*/15 * * * *',
          },
          jobId: 'drop-request-expiration-recurring',
        }
      );
    });

    it('should use correct cron pattern for 15 minute intervals', async () => {
      const mockJob = { id: 'drop-expiration-recurring' } as Job;
      vi.mocked(mockDropRequestExpirationQueue.add).mockResolvedValue(mockJob);

      await queueService.scheduleDropRequestExpiration();

      const callArgs = vi.mocked(mockDropRequestExpirationQueue.add).mock.calls[0];
      expect(callArgs[2]?.repeat?.pattern).toBe('*/15 * * * *');
    });

    it('should use unique job ID to prevent duplicates', async () => {
      const mockJob = { id: 'drop-expiration-recurring' } as Job;
      vi.mocked(mockDropRequestExpirationQueue.add).mockResolvedValue(mockJob);

      await queueService.scheduleDropRequestExpiration();

      const callArgs = vi.mocked(mockDropRequestExpirationQueue.add).mock.calls[0];
      expect(callArgs[2]?.jobId).toBe('drop-request-expiration-recurring');
    });
  });

  describe('triggerDropRequestExpiration', () => {
    it('should manually trigger drop request expiration check', async () => {
      const mockJob = { id: 'manual-trigger-123' } as Job;
      vi.mocked(mockDropRequestExpirationQueue.add).mockResolvedValue(mockJob);

      const result = await queueService.triggerDropRequestExpiration();

      expect(mockDropRequestExpirationQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.EXPIRE_DROP_REQUESTS,
        undefined
      );
      expect(result).toBe(mockJob);
    });

    it('should return job with ID for tracking', async () => {
      const mockJob = { id: 'manual-trigger-456' } as Job;
      vi.mocked(mockDropRequestExpirationQueue.add).mockResolvedValue(mockJob);

      const result = await queueService.triggerDropRequestExpiration();

      expect(result.id).toBe('manual-trigger-456');
    });
  });

  describe('getJobStatus with drop request expiration queue', () => {
    it('should get job status from drop request expiration queue', async () => {
      const jobId = 'drop-job-123';
      const mockJob = {
        id: jobId,
        getState: vi.fn().mockResolvedValue('completed'),
        progress: 100,
        returnvalue: { success: true, expiredCount: 5 },
        failedReason: undefined,
      } as any;

      vi.mocked(mockDropRequestExpirationQueue.getJob).mockResolvedValue(mockJob);

      const result = await queueService.getJobStatus(QUEUES.DROP_REQUEST_EXPIRATION, jobId);

      expect(mockDropRequestExpirationQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toEqual({
        id: jobId,
        state: 'completed',
        progress: 100,
        returnvalue: { success: true, expiredCount: 5 },
        failedReason: undefined,
      });
    });
  });

  describe('getJobsByState with drop request expiration queue', () => {
    it('should get jobs from drop request expiration queue', async () => {
      const mockJobs = [
        { id: 'drop-job-1', name: 'expire-drop-requests' },
        { id: 'drop-job-2', name: 'expire-drop-requests' },
      ] as Job[];

      vi.mocked(mockDropRequestExpirationQueue.getActive).mockResolvedValue(mockJobs);

      const result = await queueService.getJobsByState(QUEUES.DROP_REQUEST_EXPIRATION, 'active');

      expect(mockDropRequestExpirationQueue.getActive).toHaveBeenCalled();
      expect(result).toEqual(mockJobs);
    });
  });

  describe('retryJob with drop request expiration queue', () => {
    it('should retry a failed drop request expiration job', async () => {
      const jobId = 'drop-job-failed';
      const mockJob = {
        id: jobId,
        retry: vi.fn().mockResolvedValue(undefined),
      } as any;

      vi.mocked(mockDropRequestExpirationQueue.getJob).mockResolvedValue(mockJob);

      await queueService.retryJob(QUEUES.DROP_REQUEST_EXPIRATION, jobId);

      expect(mockDropRequestExpirationQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(mockJob.retry).toHaveBeenCalled();
    });
  });
});
