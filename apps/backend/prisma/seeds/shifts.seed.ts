import { PrismaClient } from '@prisma/client';

interface SeedData {
  managers: any[];
  staffMembers: any[];
  skills: any[];
  locations: any[];
}

export async function seedShifts(prisma: PrismaClient, data: SeedData) {
  console.log('🌱 Seeding shifts and assignments...');

  const { managers, staffMembers, skills, locations } = data;

  // Map skills by name
  const skillMap = {
    bartending: skills.find((s) => s.name === 'Bartending')!,
    lineCook: skills.find((s) => s.name === 'Line Cook')!,
    server: skills.find((s) => s.name === 'Server')!,
    host: skills.find((s) => s.name === 'Host')!,
  };

  // Helper to create date in UTC
  const createShiftDate = (daysFromNow: number, hour: number, minute: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setUTCHours(hour, minute, 0, 0);
    return date;
  };

  // Create shifts for the next 2 weeks
  const shifts = [];

  // SCENARIO 1: Normal week schedule (this week)
  for (let day = 0; day < 7; day++) {
    // Downtown Location (Eastern Time)
    // Lunch shift - Server
    shifts.push({
      locationId: locations[0].id,
      startTime: createShiftDate(day, 16, 0), // 11am EST = 4pm UTC
      endTime: createShiftDate(day, 20, 0), // 3pm EST = 8pm UTC
      createdBy: managers[0].id,
      skillIds: [skillMap.server.id],
    });
    // Dinner shift - Server
    shifts.push({
      locationId: locations[0].id,
      startTime: createShiftDate(day, 22, 0), // 5pm EST = 10pm UTC
      endTime: createShiftDate(day + 1, 3, 0), // 10pm EST = 3am UTC next day
      createdBy: managers[0].id,
      skillIds: [skillMap.server.id],
    });
    // Evening shift - Bartender
    shifts.push({
      locationId: locations[0].id,
      startTime: createShiftDate(day, 23, 0), // 6pm EST = 11pm UTC
      endTime: createShiftDate(day + 1, 4, 0), // 11pm EST = 4am UTC next day
      createdBy: managers[0].id,
      skillIds: [skillMap.bartending.id],
    });
    // Kitchen shift - Line Cook
    shifts.push({
      locationId: locations[0].id,
      startTime: createShiftDate(day, 15, 0), // 10am EST = 3pm UTC
      endTime: createShiftDate(day, 23, 0), // 6pm EST = 11pm UTC
      createdBy: managers[0].id,
      skillIds: [skillMap.lineCook.id],
    });

    // Midtown Location (Eastern Time)
    shifts.push({
      locationId: locations[1].id,
      startTime: createShiftDate(day, 16, 0),
      endTime: createShiftDate(day + 1, 0, 0),
      createdBy: managers[0].id,
      skillIds: [skillMap.server.id],
    });
    shifts.push({
      locationId: locations[1].id,
      startTime: createShiftDate(day, 22, 0),
      endTime: createShiftDate(day + 1, 4, 0),
      createdBy: managers[0].id,
      skillIds: [skillMap.bartending.id],
    });

    // Santa Monica Location (Pacific Time)
    shifts.push({
      locationId: locations[2].id,
      startTime: createShiftDate(day, 20, 0), // 12pm PST = 8pm UTC
      endTime: createShiftDate(day + 1, 4, 0), // 8pm PST = 4am UTC next day
      createdBy: managers[1].id,
      skillIds: [skillMap.server.id],
    });
    shifts.push({
      locationId: locations[2].id,
      startTime: createShiftDate(day + 1, 2, 0), // 6pm PST = 2am UTC next day
      endTime: createShiftDate(day + 1, 7, 30), // 11:30pm PST = 7:30am UTC next day
      createdBy: managers[1].id,
      skillIds: [skillMap.bartending.id],
    });

    // La Jolla Location (Pacific Time)
    shifts.push({
      locationId: locations[3].id,
      startTime: createShiftDate(day, 19, 30),
      endTime: createShiftDate(day + 1, 3, 30),
      createdBy: managers[1].id,
      skillIds: [skillMap.server.id],
    });
    shifts.push({
      locationId: locations[3].id,
      startTime: createShiftDate(day + 1, 0, 0),
      endTime: createShiftDate(day + 1, 6, 0),
      createdBy: managers[1].id,
      skillIds: [skillMap.lineCook.id],
    });
  }

  // SCENARIO 2: Next week with edge cases
  // Premium Friday/Saturday night shifts (days 5 & 6)
  const fridayNight = 5;
  const saturdayNight = 6;

  // Premium shifts (Friday & Saturday evenings) - tag via PremiumShiftCriteria
  shifts.push({
    locationId: locations[0].id,
    startTime: createShiftDate(fridayNight, 23, 0), // 7pm EST
    endTime: createShiftDate(fridayNight + 1, 4, 59), // 11:59pm EST
    createdBy: managers[0].id,
    skillIds: [skillMap.server.id],
  });
  shifts.push({
    locationId: locations[0].id,
    startTime: createShiftDate(saturdayNight, 23, 0),
    endTime: createShiftDate(saturdayNight + 1, 4, 59),
    createdBy: managers[0].id,
    skillIds: [skillMap.server.id],
  });

  // SCENARIO 3: Overnight shift (11pm to 3am)
  shifts.push({
    locationId: locations[2].id,
    startTime: createShiftDate(fridayNight + 1, 7, 0), // 11pm PST
    endTime: createShiftDate(saturdayNight + 1, 11, 0), // 3am PST next day
    createdBy: managers[1].id,
    skillIds: [skillMap.bartending.id],
  });

  // SCENARIO 4: Potential overtime trap - 6 consecutive days for Jessica
  for (let day = 7; day < 13; day++) {
    shifts.push({
      locationId: locations[0].id,
      startTime: createShiftDate(day, 16, 0),
      endTime: createShiftDate(day + 1, 0, 0), // 8 hours each
      createdBy: managers[0].id,
      skillIds: [skillMap.server.id],
    });
  }

  // Create all shifts with skills
  const createdShifts = [];
  for (const shift of shifts) {
    const { skillIds, ...shiftData } = shift;
    const created = await prisma.shift.create({
      data: shiftData,
    });

    // Create ShiftSkill relations
    for (const skillId of skillIds) {
      await prisma.shiftSkill.create({
        data: {
          shiftId: created.id,
          skillId: skillId,
        },
      });
    }

    createdShifts.push(created);
  }

  console.log(`✅ Created ${createdShifts.length} shifts`);

  // SCENARIO 5: Assign staff to shifts (some with potential conflicts)
  const assignments = [];

  // Assign first week shifts to staff
  // Downtown lunch shifts - Emily
  assignments.push({
    shiftId: createdShifts[0].id,
    staffId: staffMembers[4].id, // Emily
    assignedBy: managers[0].id,
  });

  // Downtown dinner shifts - Jessica
  assignments.push({
    shiftId: createdShifts[1].id,
    staffId: staffMembers[6].id, // Jessica
    assignedBy: managers[0].id,
  });

  // Downtown bartender - Alex
  assignments.push({
    shiftId: createdShifts[2].id,
    staffId: staffMembers[0].id, // Alex
    assignedBy: managers[0].id,
  });

  // Downtown kitchen - James
  assignments.push({
    shiftId: createdShifts[3].id,
    staffId: staffMembers[2].id, // James
    assignedBy: managers[0].id,
  });

  // Santa Monica server - Michael
  assignments.push({
    shiftId: createdShifts[10].id,
    staffId: staffMembers[5].id, // Michael
    assignedBy: managers[1].id,
  });

  // Santa Monica bartender - Maria
  assignments.push({
    shiftId: createdShifts[11].id,
    staffId: staffMembers[1].id, // Maria
    assignedBy: managers[1].id,
  });

  // Assign consecutive shifts to Jessica (overtime scenario)
  for (let i = 0; i < 6; i++) {
    const shiftIndex = shifts.length - 6 + i;
    if (createdShifts[shiftIndex]) {
      assignments.push({
        shiftId: createdShifts[shiftIndex].id,
        staffId: staffMembers[6].id, // Jessica
        assignedBy: managers[0].id,
      });
    }
  }

  await prisma.assignment.createMany({
    data: assignments,
    skipDuplicates: true,
  });

  console.log(`✅ Created ${assignments.length} shift assignments`);

  // Leave some shifts unassigned for coverage scenarios
  const unassignedCount = createdShifts.length - assignments.length;
  console.log(`📋 ${unassignedCount} shifts left unassigned for coverage testing`);

  return { shifts: createdShifts, assignments };
}
