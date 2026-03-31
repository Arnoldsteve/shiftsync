import { PrismaClient } from '@prisma/client';

export async function seedLocations(prisma: PrismaClient) {
  console.log('🌱 Seeding locations...');

  // 4 locations across 2 time zones (Eastern and Pacific)
  const locations = await Promise.all([
    // Eastern Time Zone (2 locations)
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Coastal Eats Downtown',
        timezone: 'America/New_York',
        address: '123 Harbor Street, New York, NY 10001',
      },
    }),
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Coastal Eats Midtown',
        timezone: 'America/New_York',
        address: '456 Broadway Avenue, New York, NY 10012',
      },
    }),
    // Pacific Time Zone (2 locations)
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Coastal Eats Santa Monica',
        timezone: 'America/Los_Angeles',
        address: '789 Ocean Boulevard, Santa Monica, CA 90401',
      },
    }),
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Coastal Eats La Jolla',
        timezone: 'America/Los_Angeles',
        address: '321 Sunset Drive, La Jolla, CA 92037',
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations across 2 time zones`);

  // Create location configs with compliance rules
  for (const location of locations) {
    await prisma.locationConfig.upsert({
      where: { locationId: location.id },
      update: {},
      create: {
        locationId: location.id,
        dailyLimitEnabled: true,
        dailyLimitHours: 12, // Hard block at 12 hours
        weeklyLimitEnabled: true,
        weeklyLimitHours: 40, // Warning at 35+, overtime after 40
        consecutiveDaysEnabled: true,
        consecutiveDaysLimit: 6, // Warning at 6, requires override at 7
        restPeriodHours: 10, // Minimum 10 hours between shifts
      },
    });
  }

  console.log('✅ Created location configs with compliance rules');
  return locations;
}
