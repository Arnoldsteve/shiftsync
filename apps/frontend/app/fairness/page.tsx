'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
} from '@shiftsync/ui';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Play } from 'lucide-react';
import { useFairnessReport, useGenerateFairnessReport } from '@/hooks/use-fairness';
import type { HourDistribution } from '@/types/fairness.types';

export default function FairnessPage() {
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: report, isLoading } = useFairnessReport({
    locationId,
    startDate,
    endDate,
  });

  const generateReport = useGenerateFairnessReport();

  const columns = useMemo<ColumnDef<HourDistribution>[]>(
    () => [
      {
        accessorKey: 'staffName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Staff Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'totalHours',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Total Hours
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.totalHours.toFixed(2),
      },
      {
        accessorKey: 'deviation',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Deviation
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className={row.original.isOutlier ? 'text-red-600 font-semibold' : ''}>
            {row.original.deviation.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'isOutlier',
        header: 'Status',
        cell: ({ row }) =>
          row.original.isOutlier ? (
            <span className="text-red-600 font-semibold">Outlier</span>
          ) : (
            <span className="text-green-600">Normal</span>
          ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: report?.hourDistribution.staff || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleGenerateReport = () => {
    if (locationId && startDate && endDate) {
      generateReport.mutate({ locationId, startDate, endDate });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fairness Analytics</h1>
          <p className="text-muted-foreground">
            Analyze hour distribution and premium shift fairness
          </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {generateReport.isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select location and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loc1">Downtown</SelectItem>
                  <SelectItem value="loc2">Uptown</SelectItem>
                  <SelectItem value="loc3">Westside</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <div className="grid gap-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Mean Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{report.hourDistribution.mean.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Standard Deviation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {report.hourDistribution.standardDeviation.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hour Distribution</CardTitle>
          <CardDescription>Staff hour distribution with outlier detection</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading report...</div>
          ) : report ? (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-10 px-2 text-left align-middle font-medium"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select filters to view report
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
