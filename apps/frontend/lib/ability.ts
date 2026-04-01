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
  | 'DropRequest'
  | 'CalloutRequest'
  | 'UserSkill'
  | 'LocationCertification'
  | 'Schedule'
  | 'Overtime'
  | 'Fairness'
  | 'Config'
  | 'Audit'
  | 'Availability'
  | 'DesiredHours'
  | 'Notification'
  | 'Job'
  | 'CSV'
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

    // Manager can approve/reject swap and drop requests
    can(Action.Read, 'SwapRequest');
    can(Action.Update, 'SwapRequest');
    can(Action.Manage, 'SwapRequest');
    can(Action.Read, 'DropRequest');
    can(Action.Update, 'DropRequest');

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

    // Manager can view staff availability and desired hours
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

    // Staff cannot modify anything else
    cannot(Action.Create, 'Shift');
    cannot(Action.Update, 'Shift');
    cannot(Action.Delete, 'Shift');
    cannot(Action.Create, 'Assignment');
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
