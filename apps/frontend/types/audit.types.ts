export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  hash: string;
  timestamp: string;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  entityType?: string;
  action?: string;
}

export interface AuditVerificationResult {
  isValid: boolean;
  message: string;
  recordId: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
