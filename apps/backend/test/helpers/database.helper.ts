/**
 * Database Test Helper
 *
 * Provides utilities for managing test database:
 * - Running migrations
 * - Cleaning up data between tests
 * - Seeding test data
 * - Database connection management
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { execSync } from 'child_process';

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

/**
 * Get or create Prisma client for tests
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prisma) {
    // Create PostgreSQL connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    // Create Prisma client with adapter
    prisma = new PrismaClient({
      adapter,
    });
  }
  return prisma;
}

/**
 * Run database migrations
 * Should be called once before all tests
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }
}

/**
 * Clean all data from the database
 * Should be called between tests to ensure isolation
 */
export async function cleanDatabase(): Promise<void> {
  const client = getTestPrismaClient();

  try {
    // Delete in order to respect foreign key constraints
    // Start with dependent tables first
    await client.auditLog.deleteMany();
    await client.notification.deleteMany();
    await client.notificationPreference.deleteMany();
    await client.callout.deleteMany();
    await client.dropRequest.deleteMany();
    await client.swapRequest.deleteMany();
    await client.assignment.deleteMany();
    await client.shiftSkill.deleteMany();
    await client.shift.deleteMany();
    await client.availabilityWindow.deleteMany();
    await client.availabilityException.deleteMany();
    await client.userSkill.deleteMany();
    await client.locationCertification.deleteMany();
    await client.managerLocation.deleteMany();
    await client.premiumShiftCriteria.deleteMany();
    await client.locationConfig.deleteMany();
    await client.user.deleteMany();
    await client.skill.deleteMany();
    await client.location.deleteMany();
  } catch (error) {
    console.error('Failed to clean database:', error);
    throw error;
  }
}

/**
 * Disconnect from database
 * Should be called after all tests complete
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Reset database to clean state
 * Combines clean and optionally seed
 */
export async function resetDatabase(seed = false): Promise<void> {
  await cleanDatabase();
  if (seed) {
    await seedTestData();
  }
}

/**
 * Seed minimal test data
 * Creates basic entities needed for most tests
 */
export async function seedTestData(): Promise<void> {
  const client = getTestPrismaClient();

  // Create test locations
  const location1 = await client.location.create({
    data: {
      name: 'Test Location 1',
      timezone: 'America/New_York',
      address: '123 Test St',
    },
  });

  const location2 = await client.location.create({
    data: {
      name: 'Test Location 2',
      timezone: 'America/Los_Angeles',
      address: '456 Test Ave',
    },
  });

  // Create location configs
  await client.locationConfig.create({
    data: {
      locationId: location1.id,
      dailyLimitEnabled: true,
      dailyLimitHours: 12,
      weeklyLimitEnabled: true,
      weeklyLimitHours: 40,
      consecutiveDaysEnabled: true,
      consecutiveDaysLimit: 6,
      restPeriodHours: 10,
      schedulePublishCutoffHours: 48,
      maxPendingRequests: 3,
    },
  });

  await client.locationConfig.create({
    data: {
      locationId: location2.id,
      dailyLimitEnabled: false,
      weeklyLimitEnabled: true,
      weeklyLimitHours: 40,
      consecutiveDaysEnabled: false,
      restPeriodHours: 10,
      schedulePublishCutoffHours: 48,
      maxPendingRequests: 3,
    },
  });

  // Create test skills
  const skill1 = await client.skill.create({
    data: {
      name: 'Bartending',
      description: 'Ability to prepare and serve drinks',
    },
  });

  const skill2 = await client.skill.create({
    data: {
      name: 'Cooking',
      description: 'Ability to prepare food',
    },
  });

  // Create test users
  const admin = await client.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test', // Placeholder hash
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const manager = await client.user.create({
    data: {
      email: 'manager@test.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test',
      role: 'MANAGER',
      firstName: 'Manager',
      lastName: 'User',
    },
  });

  const staff1 = await client.user.create({
    data: {
      email: 'staff1@test.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test',
      role: 'STAFF',
      firstName: 'Staff',
      lastName: 'One',
      desiredWeeklyHours: 40,
    },
  });

  const staff2 = await client.user.create({
    data: {
      email: 'staff2@test.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test',
      role: 'STAFF',
      firstName: 'Staff',
      lastName: 'Two',
      desiredWeeklyHours: 30,
    },
  });

  // Assign manager to locations
  await client.managerLocation.createMany({
    data: [
      { managerId: manager.id, locationId: location1.id },
      { managerId: manager.id, locationId: location2.id },
    ],
  });

  // Assign skills to staff
  await client.userSkill.createMany({
    data: [
      { userId: staff1.id, skillId: skill1.id, assignedBy: admin.id },
      { userId: staff1.id, skillId: skill2.id, assignedBy: admin.id },
      { userId: staff2.id, skillId: skill1.id, assignedBy: admin.id },
    ],
  });

  // Assign location certifications
  await client.locationCertification.createMany({
    data: [
      { userId: staff1.id, locationId: location1.id, certifiedBy: admin.id },
      { userId: staff1.id, locationId: location2.id, certifiedBy: admin.id },
      { userId: staff2.id, locationId: location1.id, certifiedBy: admin.id },
    ],
  });

  console.log('Test data seeded successfully');
}
