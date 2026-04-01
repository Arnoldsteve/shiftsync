/**
 * Integration Test Setup
 *
 * This file configures the test environment for integration tests:
 * - Loads test environment variables
 * - Sets up database connection
 * - Runs migrations before tests
 * - Provides cleanup utilities
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '../.env.test') });

// Ensure we're in test mode
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integration tests must run with NODE_ENV=test');
}

// Global test timeout (30 seconds for integration tests)
export const TEST_TIMEOUT = 30000;
