/**
 * Test Data Seeding Helper
 *
 * Provides utilities for seeding test data with various scenarios:
 * - Basic seed: Minimal data for most tests
 * - Complex seed: Full data with shifts, assignments, swaps, etc.
 * - Custom seed: Build your own test data
 */

import { PrismaClient } from '@prisma/client';
import { getTestPrismaClient } from './database.helper';
import * as argon2 from 'argon2';

/**
 * Seed result containing created entities
 */
export interface SeedResult {
  locations: {
    location1: any;
    location2: any;
  };
  skills: {
    bartending: any;
    cooking: any;
  };
  users: {
    admin: any;
    manager: any;
    staff1: any;
    staff2: any;
  };
  configs: {
    config1: any;
    config2: any;
  };
}

/**
 * Seed basic test data (same as seedTestData in database.helper)
 * Creates minimal entities needed for most tests
 */
export async function seedBasicData(): Promise<SeedResult> {
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
  const config1 = await client.locationConfig.create({
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

  const config2 = await client.locationConfig.create({
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
  const bartending = await client.skill.create({
    data: {
      name: 'Bartending',
      description: 'Ability to prepare and serve drinks',
    },
  });

  const cooking = await client.skill.create({
    data: {
      name: 'Cooking',
      description: 'Ability to prepare food',
    },
  });

  // Hash password for test users
  const passwordHash = await argon2.hash('Test123!');

  // Create test users
  const admin = await client.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const manager = await client.user.create({
    data: {
      email: 'manager@test.com',
      passwordHash,
      role: 'MANAGER',
      firstName: 'Manager',
      lastName: 'User',
    },
  });

  const staff1 = await client.user.create({
    data: {
      email: 'staff1@test.com',
      passwordHash,
      role: 'STAFF',
      firstName: 'Staff',
      lastName: 'One',
      desiredWeeklyHours: 40,
    },
  });

  const staff2 = await client.user.create({
    data: {
      email: 'staff2@test.com',
      passwordHash,
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
      { userId: staff1.id, skillId: bartending.id, assignedBy: admin.id },
      { userId: staff1.id, skillId: cooking.id, assignedBy: admin.id },
      { userId: staff2.id, skillId: bartending.id, assignedBy: admin.id },
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

  return {
    locations: { location1, location2 },
    skills: { bartending, cooking },
    users: { admin, manager, staff1, staff2 },
    configs: { config1, config2 },
  };
}

/**
 * Seed complex test data with shifts, assignments, and workflows
 * Useful for testing full integration scenarios
 */
export async function seedComplexData(): Promise<SeedResult & { shifts: any[] }> {
  const basicData = await seedBasicData();
  const client = getTestPrismaClient();

  const { location1, location2 } = basicData.locations;
  const { bartending, cooking } = basicData.skills;
  const { manager, staff1, staff2 } = basicData.users;

  // Create shifts for the next week
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const shifts = [];

  // Create 5 shifts over the next week
  for (let i = 0; i < 5; i++) {
    const shiftDate = new Date(tomorrow);
    shiftDate.setDate(shiftDate.getDate() + i);

    const startTime = new Date(shiftDate);
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date(shiftDate);
    endTime.setHours(17, 0, 0, 0);

    const shift = await client.shift.create({
      data: {
        locationId: i % 2 === 0 ? location1.id : location2.id,
        startTime,
        endTime,
        requiredHeadcount: 2,
        isPublished: i < 3, // First 3 shifts are published
        publishedAt: i < 3 ? new Date() : null,
        createdBy: manager.id,
      },
    });

    // Add required skills
    await client.shiftSkill.create({
      data: {
        shiftId: shift.id,
        skillId: i % 2 === 0 ? bartending.id : cooking.id,
      },
    });

    // Assign staff to first 2 shifts
    if (i < 2) {
      await client.assignment.create({
        data: {
          shiftId: shift.id,
          staffId: staff1.id,
          assignedBy: manager.id,
        },
      });
    }

    shifts.push(shift);
  }

  // Create availability windows for staff
  await client.availabilityWindow.createMany({
    data: [
      // Staff1: Available Mon-Fri 9am-5pm
      { userId: staff1.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { userId: staff1.id, dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
      { userId: staff1.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
      { userId: staff1.id, dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
      { userId: staff1.id, dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      // Staff2: Available Mon-Wed 10am-6pm
      { userId: staff2.id, dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
      { userId: staff2.id, dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
      { userId: staff2.id, dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
    ],
  });

  // Create notification preferences
  await client.notificationPreference.createMany({
    data: [
      { userId: staff1.id, inAppEnabled: true, emailEnabled: false },
      { userId: staff2.id, inAppEnabled: true, emailEnabled: true },
      { userId: manager.id, inAppEnabled: true, emailEnabled: true },
    ],
  });

  return {
    ...basicData,
    shifts,
  };
}

/**
 * Create a test shift with specified parameters
 */
export async function createTestShift(params: {
  locationId: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  skillIds?: string[];
  requiredHeadcount?: number;
  isPublished?: boolean;
}): Promise<any> {
  const client = getTestPrismaClient();

  const shift = await client.shift.create({
    data: {
      locationId: params.locationId,
      startTime: params.startTime,
      endTime: params.endTime,
      createdBy: params.createdBy,
      requiredHeadcount: params.requiredHeadcount ?? 1,
      isPublished: params.isPublished ?? false,
      publishedAt: params.isPublished ? new Date() : null,
    },
  });

  // Add required skills if provided
  if (params.skillIds && params.skillIds.length > 0) {
    await client.shiftSkill.createMany({
      data: params.skillIds.map((skillId) => ({
        shiftId: shift.id,
        skillId,
      })),
    });
  }

  return shift;
}

/**
 * Create a test assignment
 */
export async function createTestAssignment(params: {
  shiftId: string;
  staffId: string;
  assignedBy: string;
}): Promise<any> {
  const client = getTestPrismaClient();

  return client.assignment.create({
    data: {
      shiftId: params.shiftId,
      staffId: params.staffId,
      assignedBy: params.assignedBy,
    },
  });
}

/**
 * Create a test swap request
 */
export async function createTestSwapRequest(params: {
  shiftId: string;
  requestorId: string;
  targetStaffId: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}): Promise<any> {
  const client = getTestPrismaClient();

  return client.swapRequest.create({
    data: {
      shiftId: params.shiftId,
      requestorId: params.requestorId,
      targetStaffId: params.targetStaffId,
      status: params.status ?? 'PENDING',
    },
  });
}

/**
 * Create a test drop request
 */
export async function createTestDropRequest(params: {
  shiftId: string;
  requestorId: string;
  expiresAt: Date;
  status?: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
}): Promise<any> {
  const client = getTestPrismaClient();

  return client.dropRequest.create({
    data: {
      shiftId: params.shiftId,
      requestorId: params.requestorId,
      expiresAt: params.expiresAt,
      status: params.status ?? 'PENDING',
    },
  });
}

/**
 * Create a test notification
 */
export async function createTestNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead?: boolean;
  metadata?: any;
}): Promise<any> {
  const client = getTestPrismaClient();

  return client.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      isRead: params.isRead ?? false,
      metadata: params.metadata,
    },
  });
}
