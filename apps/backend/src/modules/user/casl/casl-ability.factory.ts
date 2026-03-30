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

      // Manager can manage skills for staff at their authorized locations
      can(Action.Create, 'UserSkill');
      can(Action.Delete, 'UserSkill');

      // Manager can manage location certifications for their authorized locations only
      can(Action.Create, 'LocationCertification');
      can(Action.Delete, 'LocationCertification');

      // Manager cannot manage users, roles, or other managers
      cannot(Action.Create, 'User');
      cannot(Action.Update, 'User');
      cannot(Action.Delete, 'User');
    } else if (user.role === Role.STAFF) {
      // Staff can only read their own profile
      can(Action.Read, 'User');

      // Staff cannot modify anything
      cannot(Action.Create, 'all');
      cannot(Action.Update, 'all');
      cannot(Action.Delete, 'all');
    }

    return build();
  }
}
