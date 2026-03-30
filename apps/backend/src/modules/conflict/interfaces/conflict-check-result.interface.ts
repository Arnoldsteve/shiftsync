import { Shift, Assignment } from '@prisma/client';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingShifts: Array<Shift & { assignment: Assignment | null }>;
}
