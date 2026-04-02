import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuditLog } from '@prisma/client';
import { AuditRepository } from './repositories/audit.repository';
import { AuditAction, AuditEntityType } from './types';
import { AuditRecordData, AuditQueryFilters } from './interfaces';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  /**
   * Log shift changes (create, update, delete)
   * Requirements: 19.1, 20.1, 20.3
   */
  async logShiftChange(
    action: AuditAction,
    shiftId: string,
    userId: string,
    changes: { previousState?: any; newState?: any }
  ): Promise<AuditLog> {
    return this.createAuditRecord({
      action,
      entityType: 'SHIFT',
      entityId: shiftId,
      userId,
      timestamp: new Date(),
      previousState: changes.previousState,
      newState: changes.newState,
    });
  }

  /**
   * Log assignment changes (create, update, delete)
   * Requirements: 19.2, 20.1, 20.3
   */
  async logAssignmentChange(
    action: AuditAction,
    assignmentId: string,
    userId: string,
    changes: { previousState?: any; newState?: any }
  ): Promise<AuditLog> {
    return this.createAuditRecord({
      action,
      entityType: 'ASSIGNMENT',
      entityId: assignmentId,
      userId,
      timestamp: new Date(),
      previousState: changes.previousState,
      newState: changes.newState,
    });
  }

  /**
   * Log swap request actions (create, approve, reject)
   * Requirements: 19.3, 20.1, 20.3
   */
  async logSwapAction(
    action: AuditAction,
    swapRequestId: string,
    userId: string,
    decision?: { previousState?: any; newState?: any }
  ): Promise<AuditLog> {
    return this.createAuditRecord({
      action,
      entityType: 'SWAP_REQUEST',
      entityId: swapRequestId,
      userId,
      timestamp: new Date(),
      previousState: decision?.previousState,
      newState: decision?.newState,
    });
  }

  /**
   * Log user account changes (role, skills, certifications)
   * Requirements: 19.4, 20.1, 20.3
   */
  async logUserChange(
    action: AuditAction,
    targetUserId: string,
    actorUserId: string,
    changes: { previousState?: any; newState?: any }
  ): Promise<AuditLog> {
    return this.createAuditRecord({
      action,
      entityType: 'USER',
      entityId: targetUserId,
      userId: actorUserId,
      timestamp: new Date(),
      previousState: changes.previousState,
      newState: changes.newState,
    });
  }

  /**
   * Query audit logs with filtering
   * Requirements: 19.5
   */
  async queryAuditLog(
    filters: AuditQueryFilters
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const logs = await this.auditRepository.query(filters);

    // Transform logs to include userName
    const transformedLogs = logs.map((log: any) => ({
      id: log.id,
      action: log.action.toLowerCase(),
      entityType: log.entityType.toLowerCase().replace('_', ' '),
      entityId: log.entityId,
      userId: log.userId,
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      previousState: log.previousState,
      newState: log.newState,
      hash: log.hash,
      timestamp: log.timestamp.toISOString(),
    }));

    return {
      data: transformedLogs,
      total: transformedLogs.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
  }

  /**
   * Verify integrity of an audit record by recomputing hash
   * Requirements: 20.4, 20.5
   */
  async verifyIntegrity(recordId: string): Promise<boolean> {
    const record = await this.auditRepository.findById(recordId);

    if (!record) {
      throw new NotFoundException('Audit record not found');
    }

    console.log('=== AUDIT VERIFICATION DEBUG ===');
    console.log('Record ID:', recordId);
    console.log('Action:', record.action);
    console.log('Entity Type:', record.entityType);
    console.log('Entity ID:', record.entityId);
    console.log('User ID:', record.userId);
    console.log('Timestamp:', record.timestamp.toISOString());
    console.log('Previous State:', JSON.stringify(record.previousState));
    console.log('New State:', JSON.stringify(record.newState));
    console.log('Stored Hash:', record.hash);

    const recomputedHash = this.generateHash({
      action: record.action as AuditAction,
      entityType: record.entityType as AuditEntityType,
      entityId: record.entityId,
      userId: record.userId,
      timestamp: record.timestamp,
      previousState: record.previousState,
      newState: record.newState,
    });

    console.log('Recomputed Hash:', recomputedHash);
    console.log('Match:', recomputedHash === record.hash);
    console.log('=== END DEBUG ===');

    return recomputedHash === record.hash;
  }

  /**
   * Export audit logs to CSV format
   * Requirement: 9
   */
  async exportToCSV(filters: AuditQueryFilters): Promise<string> {
    const logs = await this.auditRepository.query(filters);

    // CSV header
    const headers = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Change Summary'];
    const csvRows = [headers.join(',')];

    // CSV data rows
    for (const log of logs) {
      const userName = (log as any).user
        ? `${(log as any).user.firstName} ${(log as any).user.lastName}`
        : 'Unknown';

      const changeSummary = this.generateChangeSummary(log.previousState, log.newState);

      const row = [
        this.escapeCsvField(log.timestamp.toISOString()),
        this.escapeCsvField(userName),
        this.escapeCsvField(log.action),
        this.escapeCsvField(log.entityType),
        this.escapeCsvField(log.entityId),
        this.escapeCsvField(changeSummary),
      ];

      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate human-readable change summary from previous and new states
   * @private
   */
  private generateChangeSummary(previousState: any, newState: any): string {
    if (!previousState && newState) {
      return `Created with: ${this.summarizeState(newState)}`;
    }

    if (previousState && !newState) {
      return `Deleted: ${this.summarizeState(previousState)}`;
    }

    if (previousState && newState) {
      const changes: string[] = [];
      const allKeys = new Set([...Object.keys(previousState), ...Object.keys(newState)]);

      for (const key of allKeys) {
        if (JSON.stringify(previousState[key]) !== JSON.stringify(newState[key])) {
          changes.push(
            `${key}: ${JSON.stringify(previousState[key])} → ${JSON.stringify(newState[key])}`
          );
        }
      }

      return changes.length > 0 ? changes.join('; ') : 'No changes detected';
    }

    return 'No state information';
  }

  /**
   * Summarize state object for display
   * @private
   */
  private summarizeState(state: any): string {
    if (!state || typeof state !== 'object') {
      return String(state);
    }

    const entries = Object.entries(state)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .slice(0, 5); // Limit to first 5 fields

    return entries.join(', ');
  }

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   * @private
   */
  private escapeCsvField(field: string | null | undefined): string {
    if (field === null || field === undefined) {
      return '';
    }

    const stringField = String(field);

    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }

    return stringField;
  }

  /**
   * Create audit record with hash generation
   * Requirements: 20.1, 20.3
   * @private
   */
  private async createAuditRecord(data: AuditRecordData): Promise<AuditLog> {
    console.log('=== CREATING AUDIT RECORD ===');
    console.log('Data:', JSON.stringify(data, null, 2));

    const hash = this.generateHash(data);

    console.log('Generated hash for new record:', hash);
    console.log('=== END CREATE ===');

    return this.auditRepository.create({
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      timestamp: data.timestamp,
      previousState: data.previousState,
      newState: data.newState,
      hash,
      user: {
        connect: { id: data.userId },
      },
    });
  }

  /**
   * Generate SHA-256 hash for audit record integrity
   * Hash = SHA-256(action + entityType + entityId + userId + timestamp + previousState + newState)
   * Requirements: 20.3
   * @private
   */
  private generateHash(data: AuditRecordData): string {
    const hashInput = [
      data.action,
      data.entityType,
      data.entityId,
      data.userId,
      data.timestamp.toISOString(),
      this.canonicalStringify(data.previousState || null),
      this.canonicalStringify(data.newState || null),
    ].join('|');

    console.log('Hash input:', hashInput);
    const hash = createHash('sha256').update(hashInput).digest('hex');
    console.log('Generated hash:', hash);

    return hash;
  }

  /**
   * Canonical JSON stringifier - ensures consistent key ordering
   * Requirements: 20.3
   * @private
   */
  private canonicalStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalStringify(item)).join(',') + ']';
    }

    // Sort object keys alphabetically
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map((key) => {
      return JSON.stringify(key) + ':' + this.canonicalStringify(obj[key]);
    });

    return '{' + pairs.join(',') + '}';
  }
}
