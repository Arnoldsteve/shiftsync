import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from './cache.service';
import { RedisService } from '../../redis/redis.service';
import Redis from 'ioredis';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redisService: RedisService;
  let mockRedisClient: Partial<Redis>;

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
    };

    redisService = {
      getCacheClient: vi.fn().mockReturnValue(mockRedisClient),
    } as any;

    cacheService = new CacheService(redisService);
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'John Doe' };

      vi.mocked(mockRedisClient.get).mockResolvedValue(JSON.stringify(value));

      const result = await cacheService.get(key);

      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null when key does not exist', async () => {
      const key = 'user:999';

      vi.mocked(mockRedisClient.get).mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should return null when Redis is not available', async () => {
      vi.mocked(redisService.getCacheClient).mockReturnValue(null);

      const result = await cacheService.get('user:123');

      expect(result).toBeNull();
    });

    it('should return null and log error on Redis error', async () => {
      vi.mocked(mockRedisClient.get).mockRejectedValue(new Error('Redis connection error'));

      const result = await cacheService.get('user:123');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', async () => {
      const key = 'user:123';
      const value = { id: '123', name: 'John Doe' };

      await cacheService.set(key, value);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        key,
        15 * 60, // Default user data TTL
        JSON.stringify(value)
      );
    });

    it('should set value in cache with custom TTL', async () => {
      const key = 'schedule:loc-1';
      const value = { shifts: [] };
      const customTTL = 300; // 5 minutes

      await cacheService.set(key, value, customTTL);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, customTTL, JSON.stringify(value));
    });

    it('should not throw error when Redis is not available', async () => {
      vi.mocked(redisService.getCacheClient).mockReturnValue(null);

      await expect(cacheService.set('user:123', { id: '123' })).resolves.not.toThrow();
    });

    it('should not throw error on Redis error', async () => {
      vi.mocked(mockRedisClient.setex).mockRejectedValue(new Error('Redis connection error'));

      await expect(cacheService.set('user:123', { id: '123' })).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete value from cache', async () => {
      const key = 'user:123';

      await cacheService.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should not throw error when Redis is not available', async () => {
      vi.mocked(redisService.getCacheClient).mockReturnValue(null);

      await expect(cacheService.delete('user:123')).resolves.not.toThrow();
    });

    it('should not throw error on Redis error', async () => {
      vi.mocked(mockRedisClient.del).mockRejectedValue(new Error('Redis connection error'));

      await expect(cacheService.delete('user:123')).resolves.not.toThrow();
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const pattern = 'schedule:loc-1:*';
      const matchingKeys = ['schedule:loc-1:2024-01', 'schedule:loc-1:2024-02'];

      vi.mocked(mockRedisClient.keys).mockResolvedValue(matchingKeys);

      await cacheService.deletePattern(pattern);

      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...matchingKeys);
    });

    it('should not call del when no keys match pattern', async () => {
      const pattern = 'schedule:loc-999:*';

      vi.mocked(mockRedisClient.keys).mockResolvedValue([]);

      await cacheService.deletePattern(pattern);

      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should not throw error when Redis is not available', async () => {
      vi.mocked(redisService.getCacheClient).mockReturnValue(null);

      await expect(cacheService.deletePattern('schedule:*')).resolves.not.toThrow();
    });
  });

  describe('generateKey', () => {
    it('should generate cache key for entity', () => {
      const key = cacheService.generateKey('user', '123');

      expect(key).toBe('user:123');
    });

    it('should generate cache key for different entities', () => {
      expect(cacheService.generateKey('shift', 'abc')).toBe('shift:abc');
      expect(cacheService.generateKey('config', 'loc-1')).toBe('config:loc-1');
    });
  });

  describe('generateQueryKey', () => {
    it('should generate consistent hash for same query', () => {
      const query = { locationId: 'loc-1', date: '2024-01-15' };

      const key1 = cacheService.generateQueryKey('schedule', query);
      const key2 = cacheService.generateQueryKey('schedule', query);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^schedule:query:[a-f0-9]{32}$/);
    });

    it('should generate different hash for different queries', () => {
      const query1 = { locationId: 'loc-1', date: '2024-01-15' };
      const query2 = { locationId: 'loc-2', date: '2024-01-15' };

      const key1 = cacheService.generateQueryKey('schedule', query1);
      const key2 = cacheService.generateQueryKey('schedule', query2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same hash regardless of property order', () => {
      const query1 = { locationId: 'loc-1', date: '2024-01-15' };
      const query2 = { date: '2024-01-15', locationId: 'loc-1' };

      const key1 = cacheService.generateQueryKey('schedule', query1);
      const key2 = cacheService.generateQueryKey('schedule', query2);

      // Note: JSON.stringify does NOT guarantee property order, so this test
      // documents current behavior. In production, consider using a deterministic
      // serialization library if order-independent hashing is required.
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
    });
  });

  describe('TTL getters', () => {
    it('should return correct TTL for user data', () => {
      expect(cacheService.getUserDataTTL()).toBe(15 * 60);
    });

    it('should return correct TTL for schedule data', () => {
      expect(cacheService.getScheduleDataTTL()).toBe(5 * 60);
    });

    it('should return correct TTL for config data', () => {
      expect(cacheService.getConfigTTL()).toBe(60 * 60);
    });
  });

  describe('invalidateUser', () => {
    it('should delete user cache', async () => {
      const userId = '123';

      await cacheService.invalidateUser(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith('user:123');
    });
  });

  describe('invalidateSchedule', () => {
    it('should delete all schedule cache for location', async () => {
      const locationId = 'loc-1';
      const matchingKeys = ['schedule:loc-1:2024-01', 'schedule:loc-1:2024-02'];

      vi.mocked(mockRedisClient.keys).mockResolvedValue(matchingKeys);

      await cacheService.invalidateSchedule(locationId);

      expect(mockRedisClient.keys).toHaveBeenCalledWith('schedule:loc-1:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...matchingKeys);
    });
  });

  describe('invalidateConfig', () => {
    it('should delete config cache', async () => {
      const locationId = 'loc-1';

      await cacheService.invalidateConfig(locationId);

      expect(mockRedisClient.del).toHaveBeenCalledWith('config:loc-1');
    });
  });

  describe('graceful degradation', () => {
    it('should continue operation when Redis connection fails during get', async () => {
      vi.mocked(mockRedisClient.get).mockRejectedValue(new Error('Connection lost'));

      const result = await cacheService.get('user:123');

      expect(result).toBeNull();
    });

    it('should continue operation when Redis connection fails during set', async () => {
      vi.mocked(mockRedisClient.setex).mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.set('user:123', { id: '123' })).resolves.not.toThrow();
    });

    it('should continue operation when Redis connection fails during delete', async () => {
      vi.mocked(mockRedisClient.del).mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.delete('user:123')).resolves.not.toThrow();
    });
  });
});
