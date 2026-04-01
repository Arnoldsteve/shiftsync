/**
 * Staff Suggestion Interface
 * Represents an alternative staff member who can be assigned to a shift
 * Requirements: 40.1, 40.2, 40.3, 40.4, 40.5
 */
export interface StaffSuggestion {
  staffId: string;
  staffName: string;
  currentHours: number;
  isAvailable: boolean;
  hasRequiredSkills: boolean;
  hasLocationCertification: boolean;
  passesConstraints: boolean;
}
