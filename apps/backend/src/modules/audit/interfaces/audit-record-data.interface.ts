import { AuditAction } from '../types/audit-action.type';
import { AuditEntityType } from '../types/audit-entity-type.type';

export interface AuditRecordData {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId: string;
  timestamp: Date;
  previousState?: any;
  newState?: any;
}
