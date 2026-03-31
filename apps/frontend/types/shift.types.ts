export interface Shift {
  id: string;
  locationId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  requiredSkills: string[];
  assignment?: Assignment;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  shiftId: string;
  staffId: string;
  staffName: string;
  createdAt: string;
}

export interface CreateShiftDto {
  locationId: string;
  startTime: string;
  endTime: string;
  requiredSkillIds: string[];
}

export interface UpdateShiftDto {
  startTime?: string;
  endTime?: string;
  requiredSkills?: string[];
}

export interface ShiftFilters {
  locationId?: string;
  startDate?: string;
  endDate?: string;
  staffId?: string;
  status?: 'assigned' | 'uncovered';
}

export interface AssignStaffDto {
  shiftId: string;
  staffId: string;
}
