export interface Callout {
  id: string;
  shiftId: string;
  staffId: string;
  staffName: string;
  reason?: string;
  reportedAt: string;
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    locationId: string;
    locationName: string;
  };
}

export interface CreateCalloutDto {
  shiftId: string;
  reason?: string;
}

export interface CoverageStatus {
  locationId: string;
  locationName: string;
  totalShifts: number;
  coveredShifts: number;
  uncoveredShifts: number;
  availableStaffCount: number;
}

export interface AvailableStaff {
  staffId: string;
  staffName: string;
  currentHours: number;
  skills: string[];
  certifications: string[];
  constraintViolations?: string[];
}

export interface UpcomingShift {
  id: string;
  locationId: string;
  locationName: string;
  startTime: string;
  endTime: string;
  isCovered: boolean;
  assignedStaff?: {
    staffId: string;
    staffName: string;
  };
}
