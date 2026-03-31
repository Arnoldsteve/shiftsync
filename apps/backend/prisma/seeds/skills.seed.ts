import { PrismaClient } from '@prisma/client';

export async function seedSkills(prisma: PrismaClient) {
  console.log('🌱 Seeding skills...');

  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: 'Bartending' },
      update: {},
      create: {
        name: 'Bartending',
        description: 'Mixing and serving alcoholic and non-alcoholic beverages',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Line Cook' },
      update: {},
      create: {
        name: 'Line Cook',
        description: 'Preparing food items on the cooking line',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Server' },
      update: {},
      create: {
        name: 'Server',
        description: 'Taking orders and serving food to customers',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Host' },
      update: {},
      create: {
        name: 'Host',
        description: 'Greeting customers and managing seating arrangements',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Dishwasher' },
      update: {},
      create: {
        name: 'Dishwasher',
        description: 'Cleaning dishes, utensils, and kitchen equipment',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Prep Cook' },
      update: {},
      create: {
        name: 'Prep Cook',
        description: 'Preparing ingredients and mise en place',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Cashier' },
      update: {},
      create: {
        name: 'Cashier',
        description: 'Processing payments and handling cash register',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Manager' },
      update: {},
      create: {
        name: 'Manager',
        description: 'Supervising staff and managing operations',
      },
    }),
  ]);

  console.log(`✅ Created ${skills.length} skills`);
  return skills;
}
