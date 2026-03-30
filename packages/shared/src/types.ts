// Common types used across the platform

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum EntityType {
  SHIFT = 'SHIFT',
  ASSIGNMENT = 'ASSIGNMENT',
  SWAP_REQUEST = 'SWAP_REQUEST',
  USER = 'USER',
  CALLOUT = 'CALLOUT',
  CONFIG = 'CONFIG',
}
