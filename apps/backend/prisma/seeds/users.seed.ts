import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

export async function seedUsers(prisma: PrismaClient) {
  console.log('🌱 Seeding users...');

  const adminPassword = await argon2.hash('Admin123!@#');
  const managerPassword = await argon2.hash('Manager123!@#');
  const staffPassword = await argon2.hash('Staff123!@#');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@coastaleats.com' },
    update: {},
    create: {
      email: 'admin@coastaleats.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      firstName: 'Corporate',
      lastName: 'Admin',
    },
  });

  console.log('✅ Created admin user (admin@coastaleats.com / Admin123!@#)');

  // Create manager users (2 managers, each managing 2 locations)
  const managers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john.manager@coastaleats.com' },
      update: {},
      create: {
        email: 'john.manager@coastaleats.com',
        passwordHash: managerPassword,
        role: Role.MANAGER,
        firstName: 'John',
        lastName: 'Martinez',
      },
    }),
    prisma.user.upsert({
      where: { email: 'sarah.manager@coastaleats.com' },
      update: {},
      create: {
        email: 'sarah.manager@coastaleats.com',
        passwordHash: managerPassword,
        role: Role.MANAGER,
        firstName: 'Sarah',
        lastName: 'Chen',
      },
    }),
  ]);

  console.log('✅ Created 2 managers');

  // Create diverse staff members with various skills and certifications
  const staffMembers = await Promise.all([
    // Bartenders
    prisma.user.upsert({
      where: { email: 'alex.bartender@coastaleats.com' },
      update: {},
      create: {
        email: 'alex.bartender@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Alex',
        lastName: 'Thompson',
      },
    }),
    prisma.user.upsert({
      where: { email: 'maria.bartender@coastaleats.com' },
      update: {},
      create: {
        email: 'maria.bartender@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Maria',
        lastName: 'Rodriguez',
      },
    }),
    // Line Cooks
    prisma.user.upsert({
      where: { email: 'james.cook@coastaleats.com' },
      update: {},
      create: {
        email: 'james.cook@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'James',
        lastName: 'Wilson',
      },
    }),
    prisma.user.upsert({
      where: { email: 'lisa.cook@coastaleats.com' },
      update: {},
      create: {
        email: 'lisa.cook@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Lisa',
        lastName: 'Anderson',
      },
    }),
    // Servers
    prisma.user.upsert({
      where: { email: 'emily.server@coastaleats.com' },
      update: {},
      create: {
        email: 'emily.server@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Emily',
        lastName: 'Davis',
      },
    }),
    prisma.user.upsert({
      where: { email: 'michael.server@coastaleats.com' },
      update: {},
      create: {
        email: 'michael.server@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Michael',
        lastName: 'Brown',
      },
    }),
    prisma.user.upsert({
      where: { email: 'jessica.server@coastaleats.com' },
      update: {},
      create: {
        email: 'jessica.server@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Jessica',
        lastName: 'Taylor',
      },
    }),
    prisma.user.upsert({
      where: { email: 'david.server@coastaleats.com' },
      update: {},
      create: {
        email: 'david.server@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'David',
        lastName: 'Lee',
      },
    }),
    // Hosts
    prisma.user.upsert({
      where: { email: 'sophia.host@coastaleats.com' },
      update: {},
      create: {
        email: 'sophia.host@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Sophia',
        lastName: 'Garcia',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ryan.host@coastaleats.com' },
      update: {},
      create: {
        email: 'ryan.host@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Ryan',
        lastName: 'Miller',
      },
    }),
    // Multi-skilled staff (can work multiple positions)
    prisma.user.upsert({
      where: { email: 'olivia.multi@coastaleats.com' },
      update: {},
      create: {
        email: 'olivia.multi@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Olivia',
        lastName: 'Johnson',
      },
    }),
    prisma.user.upsert({
      where: { email: 'daniel.multi@coastaleats.com' },
      update: {},
      create: {
        email: 'daniel.multi@coastaleats.com',
        passwordHash: staffPassword,
        role: Role.STAFF,
        firstName: 'Daniel',
        lastName: 'Martinez',
      },
    }),
  ]);

  console.log(`✅ Created ${staffMembers.length} staff members`);

  return { admin, managers, staffMembers };
}
