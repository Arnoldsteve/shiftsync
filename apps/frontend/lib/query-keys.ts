// Query keys for different resources
export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    desiredHours: (userId: string) => [...queryKeys.users.all, 'desired-hours', userId] as const,
    availability: (userId: string) => [...queryKeys.users.all, 'availability', userId] as const,
  },

  // Shifts
  shifts: {
    all: ['shifts'] as const,
    lists: () => [...queryKeys.shifts.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.shifts.lists(), filters] as const,
    details: () => [...queryKeys.shifts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.shifts.details(), id] as const,
    available: () => [...queryKeys.shifts.all, 'available'] as const,
    published: (staffId: string, filters?: Record<string, any>) =>
      [...queryKeys.shifts.all, 'published', staffId, filters] as const,
    staff: (staffId: string, filters?: Record<string, any>) =>
      [...queryKeys.shifts.all, 'staff', staffId, filters] as const,
  },

  // Schedules
  schedules: {
    all: ['schedules'] as const,
    lists: () => [...queryKeys.schedules.all, 'list'] as const,
    list: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.schedules.lists(), { locationId, startDate, endDate }] as const,
    staff: (staffId: string, startDate?: string, endDate?: string) =>
      [...queryKeys.schedules.all, 'staff', staffId, { startDate, endDate }] as const,
  },

  // Swaps
  swaps: {
    all: ['swaps'] as const,
    pending: () => [...queryKeys.swaps.all, 'pending'] as const,
    byStaff: (staffId: string) => [...queryKeys.swaps.all, 'staff', staffId] as const,
    drops: () => [...queryKeys.swaps.all, 'drops'] as const,
    dropsByStaff: (staffId: string) => [...queryKeys.swaps.all, 'drops', 'staff', staffId] as const,
    pendingCount: (staffId: string) => [...queryKeys.swaps.all, 'pending-count', staffId] as const,
  },

  // Overtime
  overtime: {
    all: ['overtime'] as const,
    staff: (staffId: string, startDate: string, endDate: string) =>
      [...queryKeys.overtime.all, 'staff', staffId, { startDate, endDate }] as const,
    report: (locationId: string, weekStart: string) =>
      [...queryKeys.overtime.all, 'report', locationId, weekStart] as const,
  },

  // Fairness
  fairness: {
    all: ['fairness'] as const,
    hours: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.fairness.all, 'hours', locationId, { startDate, endDate }] as const,
    premium: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.fairness.all, 'premium', locationId, { startDate, endDate }] as const,
    desiredHours: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.fairness.all, 'desired-hours', locationId, { startDate, endDate }] as const,
    underScheduled: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.fairness.all, 'under-scheduled', locationId, { startDate, endDate }] as const,
    overScheduled: (locationId: string, startDate: string, endDate: string) =>
      [...queryKeys.fairness.all, 'over-scheduled', locationId, { startDate, endDate }] as const,
  },

  // Callouts
  callouts: {
    all: ['callouts'] as const,
    coverage: () => [...queryKeys.callouts.all, 'coverage'] as const,
    upcoming: () => [...queryKeys.callouts.all, 'upcoming'] as const,
    availableStaff: (shiftId: string) =>
      [...queryKeys.callouts.all, 'available-staff', shiftId] as const,
  },

  // Config
  config: {
    all: ['config'] as const,
    location: (locationId: string) => [...queryKeys.config.all, 'location', locationId] as const,
  },

  // Audit
  audit: {
    all: ['audit'] as const,
    logs: (filters: Record<string, any>) => [...queryKeys.audit.all, 'logs', filters] as const,
  },

  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: (queue: string, state: string) => [...queryKeys.jobs.all, 'list', queue, state] as const,
    detail: (queue: string, jobId: string) =>
      [...queryKeys.jobs.all, 'detail', queue, jobId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (includeRead: boolean) => [...queryKeys.notifications.all, 'list', includeRead] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },
} as const;
