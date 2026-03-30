import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LockService } from './lock.service';
import { RedisService } from '../../redis/redis.service';
import type { Lock } from 'redlock';

// Mock Redlock module
vi.mock('redlock', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      acquire: vi.fn(),
      on: vi.fn(),
    })),
  };
});

describe('LockService', () => {
  let lockService: LockService;
  let redisService: RedisService;
  let mockAcquire: ReturnType<typeof vi.fn>;
  let mockRelease: ReturnType<typeof vi.fn>;
  let mockLock: Lock;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    mockRelease = vi.fn().mockResolvedValue(undefined);
    mockLock = {
      release: mockRelease,
    } as any;

    mockAcquire = vi.fn().mockResolvedValue(mockLock);

    const mockRedisClient = {} as any;

    redisService = {
      getLockClient: vi.fn().mockReturnValue(mockRedisClient),
    } as any;

    // Create service (this will initialize Redlock)
    lockService = new LockService(redisService);

    // Override the redlock instance with our mock
    const mockRedlock = {
      acquire: mockAcquire,
      on: vi.fn(),
    };
    (lockService as any).redlock = mockRedlock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      const resource = 'lock:staff:123';
      const ttl = 5000;

      const lock = await lockService.acquireLock(resource, ttl);

      expect(lock).toBe(mockLock);
      expect(mockAcquire).toHaveBeenCalledWith([resource], ttl);
    });

    it('should use default TTL when not specified', async () => {
      const resource = 'lock:staff:123';

      await lockService.acquireLock(resource);

      expect(mockAcquire).toHaveBeenCalledWith([resource], 5000);
    });

    it('should return null when lock acquisition fails', async () => {
      const resource = 'lock:staff:123';
      mockAcquire.mockRejectedValue(new Error('Lock already held'));

      const lock = await lockService.acquireLock(resource);

      expect(lock).toBeNull();
    });

    it('should return null when Redlock is not initialized', async () => {
      (lockService as any).redlock = null;

      const lock = await lockService.acquireLock('lock:staff:123');

      expect(lock).toBeNull();
    });
  });

  describe('releaseLock', () => {
    it('should release lock successfully', async () => {
      await lockService.releaseLock(mockLock);

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should not throw error when lock is null', async () => {
      await expect(lockService.releaseLock(null)).resolves.not.toThrow();
    });

    it('should not throw error when lock release fails', async () => {
      mockRelease.mockRejectedValue(new Error('Lock already released'));

      await expect(lockService.releaseLock(mockLock)).resolves.not.toThrow();
    });
  });

  describe('withLock', () => {
    it('should execute function with lock', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await lockService.withLock(resource, mockFn);

      expect(result).toBe('result');
      expect(mockAcquire).toHaveBeenCalledWith([resource], 5000);
      expect(mockFn).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should release lock even if function throws error', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'));

      await expect(lockService.withLock(resource, mockFn)).rejects.toThrow('Function error');

      expect(mockRelease).toHaveBeenCalled();
    });

    it('should return null when lock cannot be acquired', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockResolvedValue('result');
      mockAcquire.mockRejectedValue(new Error('Lock already held'));

      const result = await lockService.withLock(resource, mockFn);

      expect(result).toBeNull();
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should use custom TTL', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockResolvedValue('result');
      const customTTL = 10000;

      await lockService.withLock(resource, mockFn, customTTL);

      expect(mockAcquire).toHaveBeenCalledWith([resource], customTTL);
    });
  });

  describe('generateStaffLockKey', () => {
    it('should generate correct lock key format', () => {
      const staffId = '123';

      const key = lockService.generateStaffLockKey(staffId);

      expect(key).toBe('lock:staff:123');
    });

    it('should generate different keys for different staff IDs', () => {
      const key1 = lockService.generateStaffLockKey('123');
      const key2 = lockService.generateStaffLockKey('456');

      expect(key1).not.toBe(key2);
      expect(key1).toBe('lock:staff:123');
      expect(key2).toBe('lock:staff:456');
    });
  });

  describe('acquireStaffLock', () => {
    it('should acquire lock for staff member', async () => {
      const staffId = '123';

      const lock = await lockService.acquireStaffLock(staffId);

      expect(lock).toBe(mockLock);
      expect(mockAcquire).toHaveBeenCalledWith(['lock:staff:123'], 5000);
    });

    it('should use custom TTL', async () => {
      const staffId = '123';
      const customTTL = 10000;

      await lockService.acquireStaffLock(staffId, customTTL);

      expect(mockAcquire).toHaveBeenCalledWith(['lock:staff:123'], customTTL);
    });
  });

  describe('withStaffLock', () => {
    it('should execute function with staff lock', async () => {
      const staffId = '123';
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await lockService.withStaffLock(staffId, mockFn);

      expect(result).toBe('result');
      expect(mockAcquire).toHaveBeenCalledWith(['lock:staff:123'], 5000);
      expect(mockFn).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should release lock even if function throws error', async () => {
      const staffId = '123';
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'));

      await expect(lockService.withStaffLock(staffId, mockFn)).rejects.toThrow('Function error');

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when Redlock is initialized', () => {
      expect(lockService.isAvailable()).toBe(true);
    });

    it('should return false when Redlock is not initialized', () => {
      (lockService as any).redlock = null;

      expect(lockService.isAvailable()).toBe(false);
    });
  });

  describe('lock timeout and expiration', () => {
    it('should respect lock timeout', async () => {
      const resource = 'lock:staff:123';
      const ttl = 3000; // 3 seconds

      await lockService.acquireLock(resource, ttl);

      expect(mockAcquire).toHaveBeenCalledWith([resource], 3000);
    });
  });

  describe('concurrent lock attempts', () => {
    it('should handle concurrent lock attempts with retry', async () => {
      const resource = 'lock:staff:123';

      // First attempt fails, second succeeds (simulating retry)
      mockAcquire
        .mockRejectedValueOnce(new Error('Lock already held'))
        .mockResolvedValueOnce(mockLock);

      const lock1 = await lockService.acquireLock(resource);
      const lock2 = await lockService.acquireLock(resource);

      expect(lock1).toBeNull();
      expect(lock2).toBe(mockLock);
    });
  });

  describe('automatic cleanup', () => {
    it('should automatically release lock in withLock helper', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockResolvedValue('result');

      await lockService.withLock(resource, mockFn);

      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('should release lock even when function execution fails', async () => {
      const resource = 'lock:staff:123';
      const mockFn = vi.fn().mockRejectedValue(new Error('Execution failed'));

      try {
        await lockService.withLock(resource, mockFn);
      } catch (error) {
        // Expected error
      }

      expect(mockRelease).toHaveBeenCalledTimes(1);
    });
  });
});
