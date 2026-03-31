import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { csvService } from '@/services/csv.service';

export function useImportSchedule() {
  return useMutation({
    mutationFn: (file: File) => csvService.importSchedule(file),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Successfully imported ${result.imported} shifts`);
      } else {
        toast.error('Import completed with errors');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import schedule');
    },
  });
}

export function useExportSchedule() {
  return useMutation({
    mutationFn: ({
      locationId,
      startDate,
      endDate,
    }: {
      locationId: string;
      startDate: string;
      endDate: string;
    }) => csvService.exportSchedule(locationId, startDate, endDate),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule-export-${new Date().toISOString()}.csv`;
      a.click();
      toast.success('Schedule exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export schedule');
    },
  });
}
