import { PrismaClient } from '@prisma/client';

export async function seedAvailability(prisma: PrismaClient, context: { staffMembers: any[] }) {
  console.log('📅 Seeding availability windows and exceptions...');

  const { staffMembers } = context;

  // Sample availability windows for staff members
  const availabilityData = [
    {
      // Alex Bartender - Available weekdays evenings
      userId: staffMembers[0].id,
      windows: [
        { dayOfWeek: 1, startTime: '17:00', endTime: '23:59' }, // Monday
        { dayOfWeek: 2, startTime: '17:00', endTime: '23:59' }, // Tuesday
        { dayOfWeek: 3, startTime: '17:00', endTime: '23:59' }, // Wednesday
        { dayOfWeek: 4, startTime: '17:00', endTime: '23:59' }, // Thursday
        { dayOfWeek: 5, startTime: '17:00', endTime: '23:59' }, // Friday
      ],
      exceptions: [
        // Taking a day off next week
        {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          startTime: null,
          endTime: null,
        },
      ],
    },
    {
      // Maria Bartender - Available weekends
      userId: staffMembers[1].id,
      windows: [
        { dayOfWeek: 5, startTime: '10:00', endTime: '23:59' }, // Friday
        { dayOfWeek: 6, startTime: '10:00', endTime: '23:59' }, // Saturday
        { dayOfWeek: 0, startTime: '10:00', endTime: '22:00' }, // Sunday
      ],
    },
    {
      // Emily Server - Morning shifts only
      userId: staffMembers[4].id,
      windows: [
        { dayOfWeek: 1, startTime: '06:00', endTime: '14:00' },
        { dayOfWeek: 2, startTime: '06:00', endTime: '14:00' },
        { dayOfWeek: 3, startTime: '06:00', endTime: '14:00' },
        { dayOfWeek: 4, startTime: '06:00', endTime: '14:00' },
        { dayOfWeek: 5, startTime: '06:00', endTime: '14:00' },
      ],
    },
    {
      // Michael Server - Flexible availability
      userId: staffMembers[5].id,
      windows: [
        { dayOfWeek: 0, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 1, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 2, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 3, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 4, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 5, startTime: '00:00', endTime: '23:59' },
        { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
      ],
    },
  ];

  for (const data of availabilityData) {
    // Create availability windows
    for (const window of data.windows) {
      await prisma.availabilityWindow.create({
        data: {
          userId: data.userId,
          dayOfWeek: window.dayOfWeek,
          startTime: window.startTime,
          endTime: window.endTime,
        },
      });
    }

    // Create availability exceptions if any
    if (data.exceptions) {
      for (const exception of data.exceptions) {
        await prisma.availabilityException.create({
          data: {
            userId: data.userId,
            date: exception.date,
            startTime: exception.startTime,
            endTime: exception.endTime,
          },
        });
      }
    }
  }

  console.log(`   ✓ Created availability windows for ${availabilityData.length} staff members`);
}

export async function seedNotificationPreferences(
  prisma: PrismaClient,
  context: { admin: any; managers: any[]; staffMembers: any[] }
) {
  console.log('🔔 Seeding notification preferences...');

  const { admin, managers, staffMembers } = context;
  const allUsers = [admin, ...managers, ...staffMembers];

  let count = 0;
  for (const user of allUsers) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {
        inAppEnabled: true,
        emailEnabled: user.role === 'MANAGER' || user.role === 'ADMIN', // Managers and admins get emails
      },
      create: {
        userId: user.id,
        inAppEnabled: true,
        emailEnabled: user.role === 'MANAGER' || user.role === 'ADMIN', // Managers and admins get emails
      },
    });
    count++;
  }

  console.log(`   ✓ Created notification preferences for ${count} users`);
}

export async function seedDesiredHours(prisma: PrismaClient, context: { staffMembers: any[] }) {
  console.log('⏰ Seeding desired weekly hours...');

  const { staffMembers } = context;

  // Set desired hours for some staff members
  const desiredHoursData = [
    { userId: staffMembers[0].id, hours: 40 }, // Alex - Full time
    { userId: staffMembers[1].id, hours: 25 }, // Maria - Part time
    { userId: staffMembers[2].id, hours: 40 }, // James - Full time
    { userId: staffMembers[3].id, hours: 30 }, // Lisa - Part time
    { userId: staffMembers[4].id, hours: 20 }, // Emily - Part time
    { userId: staffMembers[5].id, hours: 40 }, // Michael - Full time
    { userId: staffMembers[6].id, hours: 35 }, // Jessica
    { userId: staffMembers[7].id, hours: 40 }, // David - Full time
    { userId: staffMembers[8].id, hours: 25 }, // Sophia - Part time
    { userId: staffMembers[9].id, hours: 30 }, // Ryan
    { userId: staffMembers[10].id, hours: 40 }, // Olivia - Full time
    { userId: staffMembers[11].id, hours: 35 }, // Daniel
  ];

  for (const data of desiredHoursData) {
    await prisma.user.update({
      where: { id: data.userId },
      data: { desiredWeeklyHours: data.hours },
    });
  }

  console.log(`   ✓ Set desired hours for ${desiredHoursData.length} staff members`);
}
