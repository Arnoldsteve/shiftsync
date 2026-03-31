'use client';

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shiftsync/ui';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { useImportSchedule, useExportSchedule } from '@/hooks/use-csv';
import { useLocations } from '@/hooks/use-locations';

export default function CSVPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFilters, setExportFilters] = useState({
    locationId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importCSV = useImportSchedule();
  const exportCSV = useExportSchedule();
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importCSV.mutate(selectedFile, {
        onSuccess: () => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
      });
    }
  };

  const handleExport = () => {
    if (exportFilters.locationId) {
      exportCSV.mutate(exportFilters);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">CSV Import/Export</h1>
        <p className="text-muted-foreground">
          Import schedules from CSV or export existing schedules
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Schedule
            </CardTitle>
            <CardDescription>Upload a CSV file to import shifts and assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Select CSV File</span>
                </Button>
              </Label>
              {selectedFile && (
                <div className="mt-4 text-sm">
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              )}
            </div>

            {importCSV.isError && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-900">Import Failed</div>
                    <div className="text-sm text-red-700 mt-1">
                      {(importCSV.error as any)?.response?.data?.message ||
                        'Failed to import CSV file'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {importCSV.isSuccess && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900">Import Successful</div>
                    <div className="text-sm text-green-700 mt-1">
                      Schedule imported successfully
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={!selectedFile || importCSV.isPending}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importCSV.isPending ? 'Importing...' : 'Import Schedule'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="font-medium">CSV Format Requirements:</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Columns: shiftId, locationId, startTime, endTime, staffId, skills</li>
                <li>Date format: ISO 8601 (YYYY-MM-DDTHH:mm:ss)</li>
                <li>Skills: comma-separated list</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Schedule
            </CardTitle>
            <CardDescription>Export shifts and assignments to CSV format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={exportFilters.locationId}
                  onValueChange={(value) =>
                    setExportFilters({ ...exportFilters, locationId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingLocations ? (
                      <SelectItem value="loading" disabled>
                        Loading locations...
                      </SelectItem>
                    ) : locations && locations.length > 0 ? (
                      locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No locations available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exportStartDate">Start Date</Label>
                <Input
                  id="exportStartDate"
                  type="date"
                  value={exportFilters.startDate}
                  onChange={(e) =>
                    setExportFilters({ ...exportFilters, startDate: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="exportEndDate">End Date</Label>
                <Input
                  id="exportEndDate"
                  type="date"
                  value={exportFilters.endDate}
                  onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={!exportFilters.locationId || exportCSV.isPending}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportCSV.isPending ? 'Exporting...' : 'Export to CSV'}
            </Button>

            <div className="text-xs text-muted-foreground">
              The exported CSV will include all shifts and assignments for the selected location and
              date range.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
