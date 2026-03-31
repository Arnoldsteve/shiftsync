import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // TTL values in seconds
  private readonly TTL = {
    USER_DATA: 15 * 60, // 15 minutes
    SCHEDULE_DATA: 5 * 60, // 5 minutes
    CONFIG: 60 * 60, // 1 hour
  };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get value from cache
   * Requirements: 25.4
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.redisService.getCacheClient();
      if (!client) {
        this.logger.warn('Redis not available, cache get skipped');
        return null;
      }

      const value = await client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  /**
   * Set value in cache with TTL
   * Requirements: 25.4, 25.5
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = this.redisService.getCacheClient();
      if (!client) {
        this.logger.warn('Redis not available, cache set skipped');
        return;
      }

      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl || this.TTL.USER_DATA;

      await client.setex(key, ttlSeconds, serialized);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Delete value from cache
   * Requirements: 25.5
   */
  async delete(key: string): Promise<void> {
    try {
      const client = this.redisService.getCacheClient();
      if (!client) {
        this.logger.warn('Redis not available, cache delete skipped');
        return;
      }

      await client.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * Requirements: 25.5
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = this.redisService.getCacheClient();
      if (!client) {
        this.logger.warn('Redis not available, cache delete pattern skipped');
        return;
      }

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      // Graceful degradation - don't throw error
    }
  }

  /**
   * Generate cache key for entity
   * Format: {entity}:{id}
   * Requirements: 25.4
   */
  generateKey(entity: string, id: string): string {
    return `${entity}:${id}`;
  }

  /**
   * Generate cache key for query
   * Format: {entity}:query:{hash}
   * Requirements: 25.4
   */
  generateQueryKey(entity: string, query: Record<string, any>): string {
    const queryString = JSON.stringify(query);
    const hash = createHash('md5').update(queryString).digest('hex');
    return `${entity}:query:${hash}`;
  }

  /**
   * Get TTL for user data
   */
  getUserDataTTL(): number {
    return this.TTL.USER_DATA;
  }

  /**
   * Get TTL for schedule data
   */
  getScheduleDataTTL(): number {
    return this.TTL.SCHEDULE_DATA;
  }

  /**
   * Get TTL for config data
   */
  getConfigTTL(): number {
    return this.TTL.CONFIG;
  }

  /**
   * Invalidate cache for user
   * Requirements: 25.5
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delete(this.generateKey('user', userId));
  }

  /**
   * Invalidate cache for schedule
   * Requirements: 25.5
   */
  async invalidateSchedule(locationId: string): Promise<void> {
    await this.deletePattern(`schedule:location:${locationId}:*`);
  }

  /**
   * Invalidate cache for config
   * Requirements: 25.5
   */
  async invalidateConfig(locationId: string): Promise<void> {
    await this.delete(this.generateKey('config', locationId));
  }
}
