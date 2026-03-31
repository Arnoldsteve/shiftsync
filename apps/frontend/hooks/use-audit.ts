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
