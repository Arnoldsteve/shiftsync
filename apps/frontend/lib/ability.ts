import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';

// Define actions
export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Define subjects (resources)
export type Subjects =
  | 'User'
  | 'Shift'
  | 'Assignment'
  | 'SwapRequest'
  | 'CalloutRequest'
  | 'UserSkill'
  | 'LocationCertification'
  | 'Schedule'
  | 'Overtime'
  | 'Fairness'
  | 'Config'
  | 'Audit'
  | 'all';

// Define ability type
export type AppAbility = MongoAbility<[Action, Subjects]>;

// Create ability factory
export function createAbility(role: string, _managerLocationIds?: string[]): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === 'ADMIN') {
    // Admin can do everything
    can(Action.Manage, 'all');
  } else if (role === 'MANAGER') {
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

    // Manager can approve/reject swap requests
    can(Action.Read, 'SwapRequest');
    can(Action.Update, 'SwapRequest');

    // Manager can manage callout requests
    can(Action.Read, 'CalloutRequest');
    can(Action.Update, 'CalloutRequest');

    // Manager can manage skills and certifications
    can(Action.Create, 'UserSkill');
    can(Action.Delete, 'UserSkill');
    can(Action.Create, 'LocationCertification');
    can(Action.Delete, 'LocationCertification');

    // Manager can view schedules, overtime, fairness
    can(Action.Read, 'Schedule');
    can(Action.Read, 'Overtime');
    can(Action.Read, 'Fairness');

    // Manager can update config for their locations
    can(Action.Read, 'Config');
    can(Action.Update, 'Config');

    // Manager can view audit logs
    can(Action.Read, 'Audit');

    // Manager cannot manage users or other managers
    cannot(Action.Create, 'User');
    cannot(Action.Update, 'User');
    cannot(Action.Delete, 'User');
  } else if (role === 'STAFF') {
    // Staff can read their own profile
    can(Action.Read, 'User');

    // Staff can view shifts and schedules
    can(Action.Read, 'Shift');
    can(Action.Read, 'Schedule');

    // Staff can create swap requests
    can(Action.Create, 'SwapRequest');
    can(Action.Read, 'SwapRequest');

    // Staff can create callout requests
    can(Action.Create, 'CalloutRequest');
    can(Action.Read, 'CalloutRequest');

    // Staff can view their overtime
    can(Action.Read, 'Overtime');

    // Staff cannot modify anything else
    cannot(Action.Create, 'Shift');
    cannot(Action.Update, 'Shift');
    cannot(Action.Delete, 'Shift');
    cannot(Action.Create, 'Assignment');
    cannot(Action.Delete, 'Assignment');
    cannot(Action.Update, 'SwapRequest');
    cannot(Action.Update, 'CalloutRequest');
    cannot(Action.Read, 'Fairness');
    cannot(Action.Read, 'Config');
    cannot(Action.Update, 'Config');
    cannot(Action.Read, 'Audit');
  }

  return build();
}
