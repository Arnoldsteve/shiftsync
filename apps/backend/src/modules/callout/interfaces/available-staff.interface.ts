export interface AvailableStaff {
  staffId: string;
  staffName: string;
  currentHours: number;
  skills: string[];
  certifications: string[];
  constraintViolations?: string[]; 
}