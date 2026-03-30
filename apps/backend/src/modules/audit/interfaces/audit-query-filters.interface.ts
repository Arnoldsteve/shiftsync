export interface AuditQueryFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  entityType?: string;
  action?: string;
  entityId?: string;
}
