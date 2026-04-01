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
import {
  ArrowUpDown,
  Play,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';
import {
  useFairnessReport,
  useGenerateFairnessReport,
  useDesiredHoursComparison,
} from '@/hooks/use-fairness';
import { useLocations } from '@/hooks/use-locations';
import { ProtectedPage } from '@/components/auth/protected-page';
import { Action } from '@/lib/ability';
import type { HourDistribution, DesiredHoursComparison } from '@/types/fairness.types';

export default function FairnessPage() {
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [desiredHoursSorting, setDesiredHoursSorting] = useState<SortingState>([]);

  const { data: report, isLoading } = useFairnessReport({
    locationId,
    startDate,
    endDate,
  });

  const { data: desiredHoursData, isLoading: isLoadingDesiredHours } = useDesiredHoursComparison({
    locationId,
    startDate,
    endDate,
  });

  const { data: locations, isLoading: isLoadingLocations } = useLocations();

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

  const desiredHoursColumns = useMemo<ColumnDef<DesiredHoursComparison>[]>(
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
        accessorKey: 'desiredHours',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Desired Hours
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) =>
          row.original.desiredHours !== null ? row.original.desiredHours.toFixed(2) : 'Not set',
      },
      {
        accessorKey: 'actualHours',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Actual Hours
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original.actualHours.toFixed(2),
      },
      {
        accessorKey: 'difference',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Difference
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const diff = row.original.difference;
          if (diff === null) return '-';
          const isNegative = diff < 0;
          const color = isNegative
            ? 'text-red-600'
            : diff > 0
              ? 'text-orange-600'
              : 'text-green-600';
          return (
            <span className={`font-semibold ${color}`}>
              {diff > 0 ? '+' : ''}
              {diff.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: 'percentageDifference',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            % Difference
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const pct = row.original.percentageDifference;
          if (pct === null) return '-';
          const isNegative = pct < 0;
          const color =
            Math.abs(pct) > 20
              ? isNegative
                ? 'text-red-600'
                : 'text-orange-600'
              : 'text-green-600';
          return (
            <span className={`font-semibold ${color}`}>
              {pct > 0 ? '+' : ''}
              {pct.toFixed(1)}%
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'under-scheduled') {
            return (
              <span className="flex items-center text-red-600 font-semibold">
                <TrendingDown className="mr-1 h-4 w-4" />
                Under-scheduled
              </span>
            );
          }
          if (status === 'over-scheduled') {
            return (
              <span className="flex items-center text-orange-600 font-semibold">
                <TrendingUp className="mr-1 h-4 w-4" />
                Over-scheduled
              </span>
            );
          }
          if (status === 'on-target') {
            return (
              <span className="flex items-center text-green-600">
                <CheckCircle2 className="mr-1 h-4 w-4" />
                On Target
              </span>
            );
          }
          return (
            <span className="flex items-center text-gray-500">
              <MinusCircle className="mr-1 h-4 w-4" />
              No Preference
            </span>
          );
        },
      },
    ],
    []
  );

  const desiredHoursTable = useReactTable({
    data: (desiredHoursData as any)?.comparisons || [],
    columns: desiredHoursColumns,
    state: { sorting: desiredHoursSorting },
    onSortingChange: setDesiredHoursSorting,
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
    <ProtectedPage
      action={Action.Read}
      subject="Fairness"
      fallbackMessage="Only administrators and managers can view fairness analytics."
    >
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
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
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
                  <div className="text-3xl font-bold">
                    {report.hourDistribution.mean.toFixed(2)}
                  </div>
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

        <Card>
          <CardHeader>
            <CardTitle>Desired vs Actual Hours</CardTitle>
            <CardDescription>
              Compare staff actual hours to their desired weekly hours preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDesiredHours ? (
              <div className="text-center py-8 text-muted-foreground">Loading comparison...</div>
            ) : desiredHoursData ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Under-Scheduled
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {(desiredHoursData as any)?.underScheduled?.length || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Over-Scheduled
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {(desiredHoursData as any)?.overScheduled?.length || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        On Target
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {(desiredHoursData as any)?.onTarget?.length || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        No Preference
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-500">
                        {(desiredHoursData as any)?.noPreference?.length || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      {desiredHoursTable.getHeaderGroups().map((headerGroup) => (
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
                      {desiredHoursTable.getRowModel().rows.map((row) => (
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
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select filters to view comparison
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
