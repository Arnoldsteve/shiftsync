import { Injectable, Logger } from '@nestjs/common';
import Redlock, { Lock } from 'redlock';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private redlock: Redlock | null = null;
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private readonly RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  constructor(private readonly redisService: RedisService) {
    this.initializeRedlock();
  }

  /**
   * Initialize Redlock with Redis client
   */
  private initializeRedlock() {
    const lockClient = this.redisService.getLockClient();

    if (!lockClient) {
      this.logger.warn('Redis lock client not available. Distributed locking disabled.');
      return;
    }

    this.redlock = new Redlock([lockClient], {
      driftFactor: 0.01,
      retryCount: this.RETRY_COUNT,
      retryDelay: this.RETRY_DELAY,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    this.redlock.on('error', (error) => {
      this.logger.error('Redlock error:', error);
    });

    this.logger.log('Redlock initialized successfully');
  }

  /**
   * Acquire a distributed lock
   * Requirements: 16.1, 16.2, 16.3
   *
   * @param resource - Lock key (e.g., 'lock:staff:123')
   * @param ttl - Lock timeout in milliseconds (default: 5000ms)
   * @returns Lock instance or null if lock cannot be acquired
   */
  async acquireLock(resource: string, ttl: number = this.DEFAULT_TIMEOUT): Promise<Lock | null> {
    if (!this.redlock) {
      this.logger.warn('Redlock not initialized. Lock acquisition skipped.');
      return null;
    }

    try {
      const lock = await this.redlock.acquire([resource], ttl);
      this.logger.debug(`Lock acquired for resource: ${resource}`);
      return lock;
    } catch (error) {
      this.logger.error(`Failed to acquire lock for resource: ${resource}`, error);
      return null;
    }
  }

  /**
   * Release a distributed lock
   * Requirements: 16.2
   *
   * @param lock - Lock instance to release
   */
  async releaseLock(lock: Lock | null): Promise<void> {
    if (!lock) {
      return;
    }

    try {
      await lock.release();
      this.logger.debug('Lock released successfully');
    } catch (error) {
      this.logger.error('Failed to release lock:', error);
      // Don't throw - lock will expire automatically
    }
  }

  /**
   * Execute a function with automatic lock acquisition and release
   * Requirements: 16.1, 16.2, 16.5
   *
   * @param resource - Lock key
   * @param fn - Function to execute while holding the lock
   * @param ttl - Lock timeout in milliseconds
   * @returns Result of the function execution
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TIMEOUT
  ): Promise<T | null> {
    const lock = await this.acquireLock(resource, ttl);

    if (!lock) {
      this.logger.warn(`Could not acquire lock for resource: ${resource}. Operation skipped.`);
      return null;
    }

    try {
      const result = await fn();
      return result;
    } catch (error) {
      this.logger.error(`Error executing function with lock for resource: ${resource}`, error);
      throw error;
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Generate lock key for staff member
   * Requirements: 16.1
   *
   * @param staffId - Staff member ID
   * @returns Lock key in format 'lock:staff:{staffId}'
   */
  generateStaffLockKey(staffId: string): string {
    return `lock:staff:${staffId}`;
  }

  /**
   * Acquire lock for staff member with retry logic
   * Requirements: 16.1, 16.3, 16.5
   *
   * @param staffId - Staff member ID
   * @param ttl - Lock timeout in milliseconds
   * @returns Lock instance or null
   */
  async acquireStaffLock(
    staffId: string,
    ttl: number = this.DEFAULT_TIMEOUT
  ): Promise<Lock | null> {
    const lockKey = this.generateStaffLockKey(staffId);
    return this.acquireLock(lockKey, ttl);
  }

  /**
   * Execute function with staff lock
   * Requirements: 16.1, 16.2, 16.5
   *
   * @param staffId - Staff member ID
   * @param fn - Function to execute
   * @param ttl - Lock timeout in milliseconds
   * @returns Result of function execution
   */
  async withStaffLock<T>(
    staffId: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TIMEOUT
  ): Promise<T | null> {
    const lockKey = this.generateStaffLockKey(staffId);
    return this.withLock(lockKey, fn, ttl);
  }

  /**
   * Check if Redlock is available
   */
  isAvailable(): boolean {
    return this.redlock !== null;
  }
}
