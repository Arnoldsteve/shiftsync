import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { auditService } from '@/services/audit.service';
import { queryKeys } from '@/lib/query-keys';
import type { AuditFilters } from '@/types/audit.types';

export function useAuditLogs(filters: AuditFilters, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: queryKeys.audit.logs({ ...filters, page, limit }),
    queryFn: () => auditService.getAuditLogs(filters, page, limit),
  });
}

export function useVerifyAuditRecord() {
  return useMutation({
    mutationFn: (recordId: string) => auditService.verifyAuditRecord(recordId),
    onSuccess: (result) => {
      if (result.isValid) {
        toast.success('Audit record verified successfully');
      } else {
        toast.error('Audit record verification failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to verify audit record');
    },
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (filters: AuditFilters) => auditService.exportAuditLogs(filters),
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export audit logs');
    },
  });
}
