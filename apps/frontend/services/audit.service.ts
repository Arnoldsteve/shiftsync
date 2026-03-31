import { apiClient } from '@/lib/api-client';
import type {
  AuditLog,
  AuditFilters,
  AuditVerificationResult,
  PaginatedAuditLogs,
} from '@/types/audit.types';

export const auditService = {
  async getAuditLogs(
    filters: AuditFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedAuditLogs> {
    const response = await apiClient.get('/audit', {
      params: { ...filters, page, limit },
    });
    return response.data as PaginatedAuditLogs;
  },

  async verifyAuditRecord(recordId: string): Promise<AuditVerificationResult> {
    const response = await apiClient.get(`/audit/${recordId}/verify`);
    return response.data as AuditVerificationResult;
  },
};
