import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DropRequestExpirationProcessor } from './drop-request-expiration.processor';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

describe('DropRequestExpirationProcessor', () => {
  let processor: DropRequestExpirationProcessor;
  let mockSwapService: { expireDropRequests: Mock };

  beforeEach(() => {
    // Create mock swap service
    mockSwapService = {
      expireDropRequests: vi.fn(),
    };

    // Directly instantiate the processor with the mock
    processor = new DropRequestExpirationProcessor(mockSwapService as any);

    // Mock logger to avoid console output during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  describe('process', () => {
    it('should call expireDropRequests and return success result', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-123',
        data: undefined,
      } as unknown as Job<void>;

      mockSwapService.expireDropRequests.mockResolvedValue(3);

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(mockSwapService.expireDropRequests).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        expiredCount: 3,
        timestamp: expect.any(String),
      });
    });

    it('should return zero expired count when no requests expired', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-456',
        data: undefined,
      } as unknown as Job<void>;

      mockSwapService.expireDropRequests.mockResolvedValue(0);

      // Act
      const result = await processor.process(mockJob);

      // Assert
      expect(mockSwapService.expireDropRequests).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        expiredCount: 0,
        timestamp: expect.any(String),
      });
    });

    it('should throw error when expireDropRequests fails', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-789',
        data: undefined,
      } as unknown as Job<void>;

      const error = new Error('Database connection failed');
      mockSwapService.expireDropRequests.mockRejectedValue(error);

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Database connection failed');
      expect(mockSwapService.expireDropRequests).toHaveBeenCalledTimes(1);
    });

    it('should log processing start and completion', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-log',
        data: undefined,
      } as unknown as Job<void>;

      mockSwapService.expireDropRequests.mockResolvedValue(2);
      const logSpy = vi.spyOn(Logger.prototype, 'log');

      // Act
      await processor.process(mockJob);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Processing drop request expiration job test-job-log');
      expect(logSpy).toHaveBeenCalledWith(
        'Drop request expiration job test-job-log completed successfully. Expired 2 requests.'
      );
    });

    it('should log error when processing fails', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-error',
        data: undefined,
      } as unknown as Job<void>;

      const error = new Error('Service error');
      mockSwapService.expireDropRequests.mockRejectedValue(error);
      const errorSpy = vi.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(processor.process(mockJob)).rejects.toThrow('Service error');
      expect(errorSpy).toHaveBeenCalledWith(
        'Drop request expiration job test-job-error failed:',
        error
      );
    });
  });
});
