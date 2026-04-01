/**
 * Headcount Status Interface
 * Represents the headcount status of a shift
 * Requirements: 42.3, 42.4, 42.5
 */
export interface HeadcountStatus {
  shiftId: string;
  requiredHeadcount: number;
  filledHeadcount: number;
  isFullyCovered: boolean;
  isPartiallyCovered: boolean;
}
