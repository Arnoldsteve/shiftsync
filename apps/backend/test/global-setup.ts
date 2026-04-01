/**
 * Global Test Setup
 *
 * Runs once before all tests:
 * - Validates test environment
 * - Runs database migrations
 * - Verifies Redis connection
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { runMigrations } from './helpers/database.helper';
import { isRedisReady } from './helpers/redis.helper';

export default async function globalSetup() {
  console.log('=== Global Test Setup ===');

  // Load test environment
  config({ path: resolve(__dirname, '../.env.test') });

  // Validate environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must run with NODE_ENV=test');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured for tests');
  }

  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL not configured for tests');
  }

  console.log('Environment validated');

  // Run database migrations
  try {
    await runMigrations();
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // Verify Redis connection
  try {
    const redisReady = await isRedisReady();
    if (!redisReady) {
      throw new Error('Redis is not ready');
    }
    console.log('Redis connection verified');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }

  console.log('=== Global Test Setup Complete ===\n');
}
