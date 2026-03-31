import { PrismaClient } from '@prisma/client';

interface SeedData {
  managers: any[];
  locations: any[];
}

export async function seedManagerAssignments(prisma: PrismaClient, data: SeedData) {
  console.log('🌱 Seeding manager-location assignments...');

  const { managers, locations } = data;

  // John manages Eastern time zone locations (Downtown & Midtown)
  // Sarah manages Pacific time zone locations (Santa Monica & La Jolla)
  const assignments = [
    { managerId: managers[0].id, locationId: locations[0].id }, // John -> Downtown
    { managerId: managers[0].id, locationId: locations[1].id }, // John -> Midtown
    { managerId: managers[1].id, locationId: locations[2].id }, // Sarah -> Santa Monica
    { managerId: managers[1].id, locationId: locations[3].id }, // Sarah -> La Jolla
  ];

  await prisma.managerLocation.createMany({
    data: assignments,
    skipDuplicates: true,
  });

  console.log(`✅ Assigned managers to locations`);
  console.log('   - John Martinez: Downtown & Midtown (Eastern Time)');
  console.log('   - Sarah Chen: Santa Monica & La Jolla (Pacific Time)');

  return assignments;
}
