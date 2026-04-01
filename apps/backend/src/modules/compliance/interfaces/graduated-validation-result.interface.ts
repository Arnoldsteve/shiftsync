export interface GraduatedValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  requiresOverride: boolean;
  overrideReason?: string;
}

export interface ValidationError {
  type: string;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: string;
  message: string;
  details?: any;
}
