import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create skills
  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: 'Bartending' },
      update: {},
      create: { name: 'Bartending', description: 'Mixing and serving drinks' },
    }),
    prisma.skill.upsert({
      where: { name: 'Line Cook' },
      update: {},
      create: { name: 'Line Cook', description: 'Preparing food in the kitchen' },
    }),
    prisma.skill.upsert({
      where: { name: 'Server' },
      update: {},
      create: { name: 'Server', description: 'Taking orders and serving customers' },
    }),
    prisma.skill.upsert({
      where: { name: 'Host' },
      update: {},
      create: { name: 'Host', description: 'Greeting and seating customers' },
    }),
    prisma.skill.upsert({
      where: { name: 'Dishwasher' },
      update: {},
      create: { name: 'Dishwasher', description: 'Cleaning dishes and kitchen equipment' },
    }),
  ]);

  console.log(`✅ Created ${skills.length} skills`);

  // Create locations (4 locations across 2 time zones)
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Downtown Location',
        timezone: 'America/New_York',
        address: '123 Main St, New York, NY 10001',
      },
    }),
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Uptown Location',
        timezone: 'America/New_York',
        address: '456 Broadway, New York, NY 10012',
      },
    }),
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'West Coast Location',
        timezone: 'America/Los_Angeles',
        address: '789 Ocean Ave, Los Angeles, CA 90001',
      },
    }),
    prisma.location.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Beach Location',
        timezone: 'America/Los_Angeles',
        address: '321 Beach Blvd, San Diego, CA 92101',
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create location configs
  for (const location of locations) {
    await prisma.locationConfig.upsert({
      where: { locationId: location.id },
      update: {},
      create: {
        locationId: location.id,
        dailyLimitEnabled: true,
        dailyLimitHours: 12,
        weeklyLimitEnabled: true,
        weeklyLimitHours: 40,
        consecutiveDaysEnabled: true,
        consecutiveDaysLimit: 6,
      },
    });
  }

  console.log('✅ Created location configs');

  // Create admin user
  const adminPassword = await argon2.hash('Admin123!@#');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shiftsync.com' },
    update: {},
    create: {
      email: 'admin@shiftsync.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Created admin user (admin@shiftsync.com / Admin123!@#)');

  // Create manager users
  const managerPassword = await argon2.hash('Manager123!@#');
  const managers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manager1@shiftsync.com' },
      update: {},
      create: {
        email: 'manager1@shiftsync.com',
        passwordHash: managerPassword,
        role: Role.MANAGER,
        firstName: 'John',
        lastName: 'Manager',
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager2@shiftsync.com' },
      update: {},
      create: {
        email: 'manager2@shiftsync.com',
        passwordHash: managerPassword,
        role: Role.MANAGER,
        firstName: 'Jane',
        lastName: 'Manager',
      },
    }),
  ]);

  // Assign managers to locations
  await prisma.managerLocation.createMany({
    data: [
      { managerId: managers[0].id, locationId: locations[0].id },
      { managerId: managers[0].id, locationId: locations[1].id },
      { managerId: managers[1].id, locationId: locations[2].id },
      { managerId: managers[1].id, locationId: locations[3].id },
    ],
    skipDuplicates: true,
  });

  console.log(
    '✅ Created 2 managers (manager1@shiftsync.com, manager2@shiftsync.com / Manager123!@#)'
  );

  // Create staff users
  const staffPassword = await argon2.hash('Staff123!@#');
  const staffMembers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah@shiftsync.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Sarah',
        lastName: 'Johnson',
      },
    }),
    prisma.user.create({
      data: {
        email: 'mike@shiftsync.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Mike',
        lastName: 'Smith',
      },
    }),
    prisma.user.create({
      data: {
        email: 'emily@shiftsync.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Emily',
        lastName: 'Davis',
      },
    }),
  ]);

  // Assign skills to staff
  await prisma.userSkill.createMany({
    data: [
      { userId: staffMembers[0].id, skillId: skills[0].id, assignedBy: admin.id }, // Sarah - Bartending
      { userId: staffMembers[0].id, skillId: skills[2].id, assignedBy: admin.id }, // Sarah - Server
      { userId: staffMembers[1].id, skillId: skills[1].id, assignedBy: admin.id }, // Mike - Line Cook
      { userId: staffMembers[1].id, skillId: skills[4].id, assignedBy: admin.id }, // Mike - Dishwasher
      { userId: staffMembers[2].id, skillId: skills[2].id, assignedBy: admin.id }, // Emily - Server
      { userId: staffMembers[2].id, skillId: skills[3].id, assignedBy: admin.id }, // Emily - Host
    ],
    skipDuplicates: true,
  });

  // Assign location certifications to staff
  await prisma.locationCertification.createMany({
    data: [
      { userId: staffMembers[0].id, locationId: locations[0].id, certifiedBy: admin.id },
      { userId: staffMembers[0].id, locationId: locations[1].id, certifiedBy: admin.id },
      { userId: staffMembers[1].id, locationId: locations[0].id, certifiedBy: admin.id },
      { userId: staffMembers[1].id, locationId: locations[2].id, certifiedBy: admin.id },
      { userId: staffMembers[2].id, locationId: locations[2].id, certifiedBy: admin.id },
      { userId: staffMembers[2].id, locationId: locations[3].id, certifiedBy: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created ${staffMembers.length} staff members with skills and certifications`);
  console.log('   - sarah@shiftsync.com (Bartending, Server)');
  console.log('   - mike@shiftsync.com (Line Cook, Dishwasher)');
  console.log('   - emily@shiftsync.com (Server, Host)');
  console.log('   - Password for all staff: Staff123!@#');

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@shiftsync.com / Admin123!@#');
  console.log('   Manager 1: manager1@shiftsync.com / Manager123!@#');
  console.log('   Manager 2: manager2@shiftsync.com / Manager123!@#');
  console.log(
    '   Staff: sarah@shiftsync.com, mike@shiftsync.com, emily@shiftsync.com / Staff123!@#'
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
