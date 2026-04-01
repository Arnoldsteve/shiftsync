export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CREATE_DROP'
  | 'EXPIRE_DROP'
  | 'CLAIM_DROP'
  | 'CANCEL';
