import { PrismaClient, SwapStatus, DropStatus } from '@prisma/client';

/**
 * Seed comprehensive staff-facing data:
 * - Swap requests (pending, approved, rejected)
 * - Drop requests (pending, claimed, expired)
 * - Callouts
 * - Notifications
 */
export async function seedStaffData(
  prisma: PrismaClient,
  context: { staffMembers: any[]; shifts: any[] }
) {
  console.log('👥 Seeding staff-facing data (swaps, drops, callouts, notifications)...');

  const { staffMembers } = context;

  // Get some shifts that have assignments
  const assignedShifts = await prisma.shift.findMany({
    where: {
      assignments: {
        some: {},
      },
    },
    include: {
      assignments: true,
    },
    take: 10,
  });

  if (assignedShifts.length === 0) {
    console.log('   ⚠️  No assigned shifts found, skipping staff data seeding');
    return;
  }

  // 1. Create Swap Requests
  console.log('   🔄 Creating swap requests...');
  const swapRequests = [];

  // Pending swap request - Alex wants to swap with Maria
  if (assignedShifts[0] && staffMembers[0] && staffMembers[1]) {
    const swap1 = await prisma.swapRequest.create({
      data: {
        shiftId: assignedShifts[0].id,
        requestorId: staffMembers[0].id, // Alex
        targetStaffId: staffMembers[1].id, // Maria
        status: SwapStatus.PENDING,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });
    swapRequests.push(swap1);
  }

  // Approved swap request - Emily and Michael
  if (assignedShifts[1] && staffMembers[4] && staffMembers[5]) {
    const swap2 = await prisma.swapRequest.create({
      data: {
        shiftId: assignedShifts[1].id,
        requestorId: staffMembers[4].id, // Emily
        targetStaffId: staffMembers[5].id, // Michael
        status: SwapStatus.APPROVED,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        reviewedBy: staffMembers[0].id,
      },
    });
    swapRequests.push(swap2);
  }

  // Rejected swap request - James tried to swap
  if (assignedShifts[2] && staffMembers[2] && staffMembers[3]) {
    const swap3 = await prisma.swapRequest.create({
      data: {
        shiftId: assignedShifts[2].id,
        requestorId: staffMembers[2].id, // James
        targetStaffId: staffMembers[3].id, // Lisa
        status: SwapStatus.REJECTED,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
        reviewedBy: staffMembers[0].id,
        rejectionReason: 'Target staff not available during this time',
      },
    });
    swapRequests.push(swap3);
  }

  console.log(`   ✓ Created ${swapRequests.length} swap requests`);

  // 2. Create Drop Requests
  console.log('   📦 Creating drop requests...');
  const dropRequests = [];

  // Pending drop request - Alex wants to drop a shift
  if (assignedShifts[3]) {
    const drop1 = await prisma.dropRequest.create({
      data: {
        shiftId: assignedShifts[3].id,
        requestorId: staffMembers[0].id, // Alex
        status: DropStatus.PENDING,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Expires in 6 days
        reason: 'Family emergency',
      },
    });
    dropRequests.push(drop1);
  }

  // Claimed drop request - Maria dropped, Michael claimed
  if (assignedShifts[4] && staffMembers[1] && staffMembers[5]) {
    const drop2 = await prisma.dropRequest.create({
      data: {
        shiftId: assignedShifts[4].id,
        requestorId: staffMembers[1].id, // Maria
        status: DropStatus.CLAIMED,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        claimedBy: staffMembers[5].id, // Michael
        claimedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        reason: 'Schedule conflict',
      },
    });
    dropRequests.push(drop2);
  }

  // Another pending drop request - Emily
  if (assignedShifts[5]) {
    const drop3 = await prisma.dropRequest.create({
      data: {
        shiftId: assignedShifts[5].id,
        requestorId: staffMembers[4].id, // Emily
        status: DropStatus.PENDING,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        reason: 'Need to attend a class',
      },
    });
    dropRequests.push(drop3);
  }

  console.log(`   ✓ Created ${dropRequests.length} drop requests`);

  // 3. Create Callouts
  console.log('   📞 Creating callouts...');
  const callouts = [];

  // Recent callout - David called out sick
  if (assignedShifts[6] && staffMembers[7]) {
    const callout1 = await prisma.callout.create({
      data: {
        shiftId: assignedShifts[6].id,
        staffId: staffMembers[7].id, // David
        reason: 'Feeling sick',
        reportedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
    });
    callouts.push(callout1);
  }

  // Another callout - Sophia had car trouble
  if (assignedShifts[7] && staffMembers[8]) {
    const callout2 = await prisma.callout.create({
      data: {
        shiftId: assignedShifts[7].id,
        staffId: staffMembers[8].id, // Sophia
        reason: 'Car broke down',
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });
    callouts.push(callout2);
  }

  console.log(`   ✓ Created ${callouts.length} callouts`);

  // 4. Create Notifications for staff members
  console.log('   🔔 Creating notifications...');
  let notificationCount = 0;

  for (const staff of staffMembers.slice(0, 6)) {
    // Create various notification types
    const notifications = [
      {
        userId: staff.id,
        type: 'SHIFT_ASSIGNED',
        title: 'New Shift Assigned',
        message: 'You have been assigned to a new shift on Friday evening',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        metadata: { shiftId: assignedShifts[0]?.id },
      },
      {
        userId: staff.id,
        type: 'SCHEDULE_PUBLISHED',
        title: 'Schedule Published',
        message: 'The schedule for next week has been published',
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        userId: staff.id,
        type: 'SWAP_REQUEST_UPDATE',
        title: 'Swap Request Approved',
        message: 'Your swap request has been approved by the manager',
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        metadata: { swapRequestId: swapRequests[0]?.id },
      },
    ];

    for (const notif of notifications) {
      await prisma.notification.create({ data: notif });
      notificationCount++;
    }
  }

  console.log(`   ✓ Created ${notificationCount} notifications`);

  console.log('✅ Staff-facing data seeding completed');
}
