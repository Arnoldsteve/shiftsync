import { PrismaClient } from '@prisma/client';

interface SeedData {
  admin: any;
  managers: any[];
  staffMembers: any[];
  skills: any[];
  locations: any[];
}

export async function seedAssignments(prisma: PrismaClient, data: SeedData) {
  console.log('🌱 Seeding staff assignments (skills & certifications)...');

  const { admin, staffMembers, skills, locations } = data;

  // Map skills by name for easy reference
  const skillMap = {
    bartending: skills.find((s) => s.name === 'Bartending')!,
    lineCook: skills.find((s) => s.name === 'Line Cook')!,
    server: skills.find((s) => s.name === 'Server')!,
    host: skills.find((s) => s.name === 'Host')!,
    dishwasher: skills.find((s) => s.name === 'Dishwasher')!,
    prepCook: skills.find((s) => s.name === 'Prep Cook')!,
    cashier: skills.find((s) => s.name === 'Cashier')!,
    manager: skills.find((s) => s.name === 'Manager')!,
  };

  // Assign skills to staff members
  const skillAssignments = [
    // Alex - Bartender (certified at Downtown & Midtown)
    { userId: staffMembers[0].id, skillId: skillMap.bartending.id },
    { userId: staffMembers[0].id, skillId: skillMap.cashier.id },
    // Maria - Bartender (certified at Santa Monica & La Jolla)
    { userId: staffMembers[1].id, skillId: skillMap.bartending.id },
    { userId: staffMembers[1].id, skillId: skillMap.server.id },
    // James - Line Cook (certified at Downtown & Santa Monica)
    { userId: staffMembers[2].id, skillId: skillMap.lineCook.id },
    { userId: staffMembers[2].id, skillId: skillMap.prepCook.id },
    // Lisa - Line Cook (certified at Midtown & La Jolla)
    { userId: staffMembers[3].id, skillId: skillMap.lineCook.id },
    { userId: staffMembers[3].id, skillId: skillMap.prepCook.id },
    // Emily - Server (certified at Downtown & Midtown)
    { userId: staffMembers[4].id, skillId: skillMap.server.id },
    { userId: staffMembers[4].id, skillId: skillMap.host.id },
    // Michael - Server (certified at Santa Monica & La Jolla)
    { userId: staffMembers[5].id, skillId: skillMap.server.id },
    { userId: staffMembers[5].id, skillId: skillMap.cashier.id },
    // Jessica - Server (certified at all locations)
    { userId: staffMembers[6].id, skillId: skillMap.server.id },
    { userId: staffMembers[6].id, skillId: skillMap.host.id },
    // David - Server (certified at Downtown & Santa Monica)
    { userId: staffMembers[7].id, skillId: skillMap.server.id },
    { userId: staffMembers[7].id, skillId: skillMap.bartending.id },
    // Sophia - Host (certified at Midtown & La Jolla)
    { userId: staffMembers[8].id, skillId: skillMap.host.id },
    { userId: staffMembers[8].id, skillId: skillMap.cashier.id },
    // Ryan - Host (certified at Downtown & Santa Monica)
    { userId: staffMembers[9].id, skillId: skillMap.host.id },
    { userId: staffMembers[9].id, skillId: skillMap.server.id },
    // Olivia - Multi-skilled (certified at all locations)
    { userId: staffMembers[10].id, skillId: skillMap.server.id },
    { userId: staffMembers[10].id, skillId: skillMap.host.id },
    { userId: staffMembers[10].id, skillId: skillMap.bartending.id },
    { userId: staffMembers[10].id, skillId: skillMap.cashier.id },
    // Daniel - Multi-skilled (certified at Downtown & Santa Monica)
    { userId: staffMembers[11].id, skillId: skillMap.lineCook.id },
    { userId: staffMembers[11].id, skillId: skillMap.prepCook.id },
    { userId: staffMembers[11].id, skillId: skillMap.dishwasher.id },
  ];

  await prisma.userSkill.createMany({
    data: skillAssignments.map((assignment) => ({
      ...assignment,
      assignedBy: admin.id,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Assigned ${skillAssignments.length} skills to staff`);

  // Assign location certifications
  const locationCertifications = [
    // Alex - Downtown & Midtown (Eastern time)
    { userId: staffMembers[0].id, locationId: locations[0].id },
    { userId: staffMembers[0].id, locationId: locations[1].id },
    // Maria - Santa Monica & La Jolla (Pacific time)
    { userId: staffMembers[1].id, locationId: locations[2].id },
    { userId: staffMembers[1].id, locationId: locations[3].id },
    // James - Downtown & Santa Monica (cross-timezone)
    { userId: staffMembers[2].id, locationId: locations[0].id },
    { userId: staffMembers[2].id, locationId: locations[2].id },
    // Lisa - Midtown & La Jolla (cross-timezone)
    { userId: staffMembers[3].id, locationId: locations[1].id },
    { userId: staffMembers[3].id, locationId: locations[3].id },
    // Emily - Downtown & Midtown
    { userId: staffMembers[4].id, locationId: locations[0].id },
    { userId: staffMembers[4].id, locationId: locations[1].id },
    // Michael - Santa Monica & La Jolla
    { userId: staffMembers[5].id, locationId: locations[2].id },
    { userId: staffMembers[5].id, locationId: locations[3].id },
    // Jessica - All locations
    { userId: staffMembers[6].id, locationId: locations[0].id },
    { userId: staffMembers[6].id, locationId: locations[1].id },
    { userId: staffMembers[6].id, locationId: locations[2].id },
    { userId: staffMembers[6].id, locationId: locations[3].id },
    // David - Downtown & Santa Monica (cross-timezone)
    { userId: staffMembers[7].id, locationId: locations[0].id },
    { userId: staffMembers[7].id, locationId: locations[2].id },
    // Sophia - Midtown & La Jolla (cross-timezone)
    { userId: staffMembers[8].id, locationId: locations[1].id },
    { userId: staffMembers[8].id, locationId: locations[3].id },
    // Ryan - Downtown & Santa Monica (cross-timezone)
    { userId: staffMembers[9].id, locationId: locations[0].id },
    { userId: staffMembers[9].id, locationId: locations[2].id },
    // Olivia - All locations
    { userId: staffMembers[10].id, locationId: locations[0].id },
    { userId: staffMembers[10].id, locationId: locations[1].id },
    { userId: staffMembers[10].id, locationId: locations[2].id },
    { userId: staffMembers[10].id, locationId: locations[3].id },
    // Daniel - Downtown & Santa Monica (cross-timezone)
    { userId: staffMembers[11].id, locationId: locations[0].id },
    { userId: staffMembers[11].id, locationId: locations[2].id },
  ];

  await prisma.locationCertification.createMany({
    data: locationCertifications.map((cert) => ({
      ...cert,
      certifiedBy: admin.id,
    })),
    skipDuplicates: true,
  });

  console.log(`✅ Assigned ${locationCertifications.length} location certifications`);

  return { skillAssignments, locationCertifications };
}
