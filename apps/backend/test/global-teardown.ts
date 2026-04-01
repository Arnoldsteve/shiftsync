/**
 * Global Test Teardown
 *
 * Runs once after all tests:
 * - Disconnects from database
 * - Disconnects from Redis
 * - Cleans up resources
 */

import { disconnectDatabase } from './helpers/database.helper';
import { disconnectRedis } from './helpers/redis.helper';

export default async function globalTeardown() {
  console.log('\n=== Global Test Teardown ===');

  // Disconnect from database
  try {
    await disconnectDatabase();
    console.log('Database disconnected');
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
  }

  // Disconnect from Redis
  try {
    await disconnectRedis();
    console.log('Redis disconnected');
  } catch (error) {
    console.error('Failed to disconnect from Redis:', error);
  }

  console.log('=== Global Test Teardown Complete ===');
}
