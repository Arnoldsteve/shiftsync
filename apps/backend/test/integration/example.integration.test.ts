/**
 * Example Integration Test
 *
 * Demonstrates how to write integration tests using the test helpers:
 * - Database setup and cleanup
 * - Redis setup and cleanup
 * - Test data seeding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestPrismaClient,
  cleanDatabase,
  seedTestData,
  getTestRedisClient,
  cleanRedis,
} from '../helpers';

describe('Integration Test Example', () => {
  const prisma = getTestPrismaClient();
  const redis = getTestRedisClient();

  // Clean up before each test to ensure isolation
  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();
  });

  // Optional: Clean up after each test
  afterEach(async () => {
    await cleanDatabase();
    await cleanRedis();
  });

  it('should connect to test database', async () => {
    // Verify database connection
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('should connect to test Redis', async () => {
    // Verify Redis connection
    const result = await redis.ping();
    expect(result).toBe('PONG');
  });

  it('should seed test data', async () => {
    // Seed test data
    await seedTestData();

    // Verify data was seeded
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);

    const locations = await prisma.location.findMany();
    expect(locations.length).toBeGreaterThan(0);

    const skills = await prisma.skill.findMany();
    expect(skills.length).toBeGreaterThan(0);
  });

  it('should clean database between tests', async () => {
    // Create some data
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'STAFF',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    // Verify data exists
    let users = await prisma.user.findMany();
    expect(users.length).toBe(1);

    // Clean database
    await cleanDatabase();

    // Verify data is gone
    users = await prisma.user.findMany();
    expect(users.length).toBe(0);
  });

  it('should clean Redis between tests', async () => {
    // Set some data
    await redis.set('test:key', 'test-value');

    // Verify data exists
    let value = await redis.get('test:key');
    expect(value).toBe('test-value');

    // Clean Redis
    await cleanRedis();

    // Verify data is gone
    value = await redis.get('test:key');
    expect(value).toBeNull();
  });

  it('should handle transactions', async () => {
    await seedTestData();

    // Use a transaction to create related data
    const result = await prisma.$transaction(async (tx) => {
      const location = await tx.location.findFirst();
      if (!location) throw new Error('No location found');

      const shift = await tx.shift.create({
        data: {
          locationId: location.id,
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T17:00:00Z'),
          createdBy: 'test-user',
        },
      });

      return shift;
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Verify shift was created
    const shift = await prisma.shift.findUnique({
      where: { id: result.id },
    });
    expect(shift).toBeDefined();
  });
});
