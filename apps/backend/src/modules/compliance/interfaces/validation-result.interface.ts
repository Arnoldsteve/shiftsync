import { ValidationType } from '../types';

export interface ValidationResult {
  isValid: boolean;
  validationType: ValidationType;
  message?: string;
  details?: {
    currentValue?: number;
    limitValue?: number;
    violatingShiftId?: string;
    [key: string]: any;
  };
}
