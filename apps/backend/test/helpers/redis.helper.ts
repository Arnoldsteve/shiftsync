/**
 * Redis Test Helper
 *
 * Provides utilities for managing test Redis instance:
 * - Connection management
 * - Cleanup between tests
 * - Test data setup
 *
 * Note: Uses key prefixes (test:*) for isolation instead of separate database
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
const TEST_KEY_PREFIX = 'test:';

/**
 * Get or create Redis client for tests
 * Uses the same Redis instance as development but with prefixed keys
 */
export function getTestRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL not configured in test environment');
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Exponential backoff
      },
      keyPrefix: TEST_KEY_PREFIX, // Prefix all keys with 'test:'
    });

    redis.on('error', (error) => {
      console.error('Redis test client error:', error);
    });
  }

  return redis;
}

/**
 * Clean all test data from Redis
 * Deletes only keys with the test prefix
 */
export async function cleanRedis(): Promise<void> {
  const client = getTestRedisClient();

  try {
    // Get all keys with test prefix
    const keys = await client.keys(`${TEST_KEY_PREFIX}*`);

    if (keys.length > 0) {
      // Remove the prefix from keys since the client already adds it
      const keysWithoutPrefix = keys.map((key) => key.replace(TEST_KEY_PREFIX, ''));
      await client.del(...keysWithoutPrefix);
    }

    console.log(`Redis test data cleaned (${keys.length} keys deleted)`);
  } catch (error) {
    console.error('Failed to clean Redis:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis
 * Should be called after all tests complete
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/**
 * Check if Redis is connected and ready
 */
export async function isRedisReady(): Promise<boolean> {
  try {
    const client = getTestRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

/**
 * Set test cache data
 */
export async function setTestCache(key: string, value: any, ttl?: number): Promise<void> {
  const client = getTestRedisClient();
  const serialized = JSON.stringify(value);

  if (ttl) {
    await client.setex(key, ttl, serialized);
  } else {
    await client.set(key, serialized);
  }
}

/**
 * Get test cache data
 */
export async function getTestCache(key: string): Promise<any | null> {
  const client = getTestRedisClient();
  const value = await client.get(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Delete test cache key
 */
export async function deleteTestCache(key: string): Promise<void> {
  const client = getTestRedisClient();
  await client.del(key);
}
