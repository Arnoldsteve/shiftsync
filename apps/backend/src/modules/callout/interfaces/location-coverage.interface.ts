export interface LocationCoverage {
  locationId: string;
  locationName: string;
  totalShifts: number;
  coveredShifts: number;
  uncoveredShifts: number;
  availableStaffCount: number;
  uncoveredShiftDetails: Array<{
    shiftId: string;
    startTime: Date;
    endTime: Date;
    requiredSkills: string[];
  }>;
}
