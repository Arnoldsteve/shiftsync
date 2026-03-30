export interface UpcomingShift {
  shiftId: string;
  locationId: string;
  locationName: string;
  startTime: Date;
  endTime: Date;
  isCovered: boolean;
  assignedStaff?: {
    staffId: string;
    staffName: string;
  };
  hasCallout: boolean;
  requiredSkills: string[];
}
