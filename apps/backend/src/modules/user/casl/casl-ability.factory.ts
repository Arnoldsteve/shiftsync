import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { User, Role } from '@prisma/client';
import { Action, AppAbility } from './types';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User & { managerLocations?: { locationId: string }[] }) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.ADMIN) {
      // Admin can do everything
      can(Action.Manage, 'all');
    } else if (user.role === Role.MANAGER) {
      // Manager can read all users
      can(Action.Read, 'User');

      // Manager can create and manage shifts at their locations
      can(Action.Create, 'Shift');
      can(Action.Read, 'Shift');
      can(Action.Update, 'Shift');
      can(Action.Delete, 'Shift');

      // Manager can manage assignments
      can(Action.Create, 'Assignment');
      can(Action.Delete, 'Assignment');

      // Manager can approve/reject swap and drop requests
      can(Action.Read, 'SwapRequest');
      can(Action.Update, 'SwapRequest');
      can(Action.Read, 'DropRequest');
      can(Action.Update, 'DropRequest');

      // Manager can manage callout requests
      can(Action.Read, 'CalloutRequest');
      can(Action.Update, 'CalloutRequest');

      // Manager can manage skills for staff at their authorized locations
      can(Action.Create, 'UserSkill');
      can(Action.Delete, 'UserSkill');

      // Manager can manage location certifications for their authorized locations only
      can(Action.Create, 'LocationCertification');
      can(Action.Delete, 'LocationCertification');

      // Manager can view schedules, overtime, fairness
      can(Action.Read, 'Schedule');
      can(Action.Update, 'Schedule');
      can(Action.Read, 'Overtime');
      can(Action.Read, 'Fairness');

      // Manager can view staff availability and desired hours (read-only)
      can(Action.Read, 'Availability');
      can(Action.Read, 'DesiredHours');

      // Manager can update config for their locations
      can(Action.Read, 'Config');
      can(Action.Update, 'Config');

      // Manager can view audit logs
      can(Action.Read, 'Audit');

      // Manager can view and manage jobs
      can(Action.Read, 'Job');
      can(Action.Update, 'Job');

      // Manager can import/export CSV
      can(Action.Create, 'CSV');
      can(Action.Read, 'CSV');

      // Manager can view notifications
      can(Action.Read, 'Notification');
      can(Action.Update, 'Notification');

      // Manager cannot manage users, roles, or other managers
      cannot(Action.Create, 'User');
      cannot(Action.Update, 'User');
      cannot(Action.Delete, 'User');

      // Manager cannot set their own availability (they don't work shifts)
      cannot(Action.Create, 'Availability');
      cannot(Action.Update, 'Availability');
      cannot(Action.Delete, 'Availability');
      cannot(Action.Create, 'DesiredHours');
      cannot(Action.Update, 'DesiredHours');
    } else if (user.role === Role.STAFF) {
      // Staff can read their own profile
      can(Action.Read, 'User');

      // Staff can view shifts and schedules
      can(Action.Read, 'Shift');
      can(Action.Read, 'Schedule');

      // Staff can create assignments for themselves (shift pickup)
      can(Action.Create, 'Assignment');

      // Staff can create swap requests and drop requests
      can(Action.Create, 'SwapRequest');
      can(Action.Read, 'SwapRequest');
      can(Action.Update, 'SwapRequest'); // Can cancel their own swaps
      can(Action.Create, 'DropRequest');
      can(Action.Read, 'DropRequest');

      // Staff can create callout requests
      can(Action.Create, 'CalloutRequest');
      can(Action.Read, 'CalloutRequest');

      // Staff can view their overtime
      can(Action.Read, 'Overtime');

      // Staff can manage their own availability and desired hours
      can(Action.Create, 'Availability');
      can(Action.Read, 'Availability');
      can(Action.Update, 'Availability');
      can(Action.Delete, 'Availability');
      can(Action.Create, 'DesiredHours');
      can(Action.Read, 'DesiredHours');
      can(Action.Update, 'DesiredHours');

      // Staff can view and manage their notifications
      can(Action.Read, 'Notification');
      can(Action.Update, 'Notification');

      // Staff cannot modify shifts or delete assignments
      cannot(Action.Create, 'Shift');
      cannot(Action.Update, 'Shift');
      cannot(Action.Delete, 'Shift');
      cannot(Action.Delete, 'Assignment');
      cannot(Action.Read, 'Fairness');
      cannot(Action.Read, 'Config');
      cannot(Action.Update, 'Config');
      cannot(Action.Read, 'Audit');
      cannot(Action.Read, 'Job');
      cannot(Action.Create, 'CSV');
      cannot(Action.Read, 'CSV');
    }

    return build();
  }
}
