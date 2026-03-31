import { apiClient } from '@/lib/api-client';

export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export const csvService = {
  async importSchedule(file: File): Promise<CSVImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as CSVImportResult;
  },

  async exportSchedule(locationId: string, startDate: string, endDate: string): Promise<Blob> {
    const response = await apiClient.get('/export/csv', {
      params: { locationId, startDate, endDate },
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
