/**
 * Test Application Helper
 *
 * Provides utilities for creating and managing NestJS test applications:
 * - Test module creation
 * - Application lifecycle management
 * - Service mocking utilities
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTestPrismaClient } from './database.helper';
import { getTestRedisClient } from './redis.helper';

/**
 * Create a test NestJS application
 * Configures the app with test database and Redis connections
 */
export async function createTestApp(moduleMetadata: any): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule(moduleMetadata).compile();

  const app = moduleFixture.createNestApplication();

  // Apply global pipes (same as production)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  await app.init();

  return app;
}

/**
 * Close test application and cleanup resources
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Get Prisma client from test app
 */
export function getPrismaFromApp(app: INestApplication): PrismaClient {
  return app.get(PrismaClient);
}

/**
 * Create a mock service for testing
 */
export function createMockService<T>(methods: (keyof T)[]): Partial<T> {
  const mock: any = {};

  for (const method of methods) {
    mock[method] = vi.fn();
  }

  return mock;
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
