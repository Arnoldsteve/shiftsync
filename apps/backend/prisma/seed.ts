import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Import seed modules
import { seedSkills } from './seeds/skills.seed';
import { seedLocations } from './seeds/locations.seed';
import { seedUsers } from './seeds/users.seed';
import { seedManagerAssignments } from './seeds/manager-assignments.seed';
import { seedAssignments } from './seeds/assignments.seed';
import { seedShifts } from './seeds/shifts.seed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('🌱 Starting Coastal Eats database seeding...\n');

  // 1. Seed skills
  const skills = await seedSkills(prisma);

  // 2. Seed locations
  const locations = await seedLocations(prisma);

  // 3. Seed users (admin, managers, staff)
  const { admin, managers, staffMembers } = await seedUsers(prisma);

  // 4. Assign managers to locations
  await seedManagerAssignments(prisma, { managers, locations });

  // 5. Assign skills and location certifications to staff
  await seedAssignments(prisma, { admin, managers, staffMembers, skills, locations });

  // 6. Seed shifts and assignments
  await seedShifts(prisma, { managers, staffMembers, skills, locations });

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 TEST CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('👤 ADMIN (Corporate Oversight)');
  console.log('   Email: admin@coastaleats.com');
  console.log('   Password: Admin123!@#');
  console.log('   Access: All locations\n');

  console.log('👔 MANAGERS');
  console.log('   John Martinez (Eastern Time Zone)');
  console.log('   Email: john.manager@coastaleats.com');
  console.log('   Password: Manager123!@#');
  console.log('   Locations: Downtown & Midtown\n');

  console.log('   Sarah Chen (Pacific Time Zone)');
  console.log('   Email: sarah.manager@coastaleats.com');
  console.log('   Password: Manager123!@#');
  console.log('   Locations: Santa Monica & La Jolla\n');

  console.log('👥 STAFF (Password: Staff123!@# for all)');
  console.log('   Bartenders:');
  console.log('   - alex.bartender@coastaleats.com (Downtown, Midtown)');
  console.log('   - maria.bartender@coastaleats.com (Santa Monica, La Jolla)\n');

  console.log('   Line Cooks:');
  console.log('   - james.cook@coastaleats.com (Downtown, Santa Monica)');
  console.log('   - lisa.cook@coastaleats.com (Midtown, La Jolla)\n');

  console.log('   Servers:');
  console.log('   - emily.server@coastaleats.com (Downtown, Midtown)');
  console.log('   - michael.server@coastaleats.com (Santa Monica, La Jolla)');
  console.log('   - jessica.server@coastaleats.com (All locations)');
  console.log('   - david.server@coastaleats.com (Downtown, Santa Monica)\n');

  console.log('   Hosts:');
  console.log('   - sophia.host@coastaleats.com (Midtown, La Jolla)');
  console.log('   - ryan.host@coastaleats.com (Downtown, Santa Monica)\n');

  console.log('   Multi-Skilled:');
  console.log('   - olivia.multi@coastaleats.com (All locations, multiple skills)');
  console.log('   - daniel.multi@coastaleats.com (Downtown, Santa Monica)\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TEST SCENARIOS INCLUDED');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('✓ Cross-timezone staff certifications');
  console.log('✓ Premium Friday/Saturday night shifts');
  console.log('✓ Overnight shifts (11pm-3am)');
  console.log('✓ Consecutive day assignments (overtime trap scenario)');
  console.log('✓ Unassigned shifts for coverage testing');
  console.log('✓ Multi-location staff for swap scenarios');
  console.log('✓ Compliance rules configured per location\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
