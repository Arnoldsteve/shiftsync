'use client';

import { useState, useMemo, useEffect } from 'react';
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
} from '@shiftsync/ui';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  MinusCircle,
  Award,
  BarChart3,
} from 'lucide-react';
import { useDesiredHoursComparison, usePremiumShiftDistribution } from '@/hooks/use-fairness';
import { useLocations } from '@/hooks/use-locations';
import { ProtectedPage } from '@/components/auth/protected-page';
import { Action } from '@/lib/ability';
import type { DesiredHoursComparison } from '@/types/fairness.types';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export default function FairnessPage() {
  // Initialize with current week (Monday-Sunday)
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return format(start, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return format(end, 'yyyy-MM-dd');
  });
  const [desiredHoursSorting, setDesiredHoursSorting] = useState<SortingState>([
    { id: 'difference', desc: true },
  ]);
  const [premiumSorting, setPremiumSorting] = useState<SortingState>([
    { id: 'premiumShifts', desc: true },
  ]);

  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Auto-select first location on mount
  useEffect(() => {
    if (locations && locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const { data: desiredHoursData, isLoading: isLoadingDesiredHours } = useDesiredHoursComparison({
    locationId,
    startDate,
    endDate,
  });

  const { data: premiumData, isLoading: isLoadingPremium } = usePremiumShiftDistribution({
    locationId,
    startDate,
    endDate,
  });

  // Calculate fairness score (0-100)
  const fairnessScore = useMemo(() => {
    if (!desiredHoursData || !premiumData) return null;

    const comparisons = (desiredHoursData as any)?.comparisons || [];

    if (comparisons.length === 0) return 100;

    // Score based on desired hours distribution (50% weight)
    const onTarget = comparisons.filter((c: any) => c.status === 'on-target').length;
    const desiredHoursScore = (onTarget / comparisons.length) * 50;

    // Score based on premium shift distribution (50% weight)
    const premiumStdDev = (premiumData as any)?.statistics?.standardDeviation || 0;
    const premiumMean = (premiumData as any)?.statistics?.meanPremiumCount || 1;
    const premiumCoefficientOfVariation = premiumMean > 0 ? premiumStdDev / premiumMean : 0;
    // Lower CV = more fair. CV of 0 = perfect fairness (100%), CV of 1 = poor fairness (0%)
    const premiumScore = Math.max(0, (1 - premiumCoefficientOfVariation) * 50);

    return Math.round(desiredHoursScore + premiumScore);
  }, [desiredHoursData, premiumData]);

  const premiumColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'staffName',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Staff Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
      },
      {
        accessorKey: 'totalShifts',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Total Shifts
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
      },
      {
        accessorKey: 'premiumShifts',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Premium Shifts
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => (
          <span className={row.original.isOutlier ? 'text-orange-600 font-semibold' : ''}>
            {row.original.premiumShifts}
          </span>
        ),
      },
      {
        accessorKey: 'premiumPercentage',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Premium %
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => (
          <span className={row.original.isOutlier ? 'text-orange-600 font-semibold' : ''}>
            {row.original.premiumPercentage.toFixed(1)}%
          </span>
        ),
      },
      {
        accessorKey: 'isOutlier',
        header: 'Status',
        cell: ({ row }) =>
          row.original.isOutlier ? (
            <span className="text-orange-600 font-semibold">Above Average</span>
          ) : (
            <span className="text-green-600">Normal</span>
          ),
      },
    ],
    []
  );

  const desiredHoursColumns = useMemo<ColumnDef<DesiredHoursComparison>[]>(
    () => [
      {
        accessorKey: 'staffName',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Staff Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
      },
      {
        accessorKey: 'desiredHours',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Desired Hours
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
        cell: ({ row }) =>
          row.original.desiredHours !== null ? row.original.desiredHours.toFixed(2) : 'Not set',
      },
      {
        accessorKey: 'actualHours',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Actual Hours
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.actualHours.toFixed(2),
      },
      {
        accessorKey: 'premiumShifts',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Premium Shifts
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => {
          // Find premium shift count for this staff member
          const staffPremium = (premiumData as any)?.staffPremiumShifts?.find(
            (s: any) => s.staffId === row.original.staffId
          );
          return staffPremium?.premiumShifts || 0;
        },
      },
      {
        accessorKey: 'difference',
        header: ({ column }) => (
          <button
            className="flex items-center hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Difference
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </button>
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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === 'under-scheduled') {
            return (
              <span className="flex items-center text-red-600 font-semibold">
                <TrendingDown className="mr-1 h-4 w-4" />
                Under
              </span>
            );
          }
          if (status === 'over-scheduled') {
            return (
              <span className="flex items-center text-orange-600 font-semibold">
                <TrendingUp className="mr-1 h-4 w-4" />
                Over
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
              No Pref
            </span>
          );
        },
      },
    ],
    [premiumData]
  );

  const desiredHoursTable = useReactTable({
    data: (desiredHoursData as any)?.comparisons || [],
    columns: desiredHoursColumns,
    state: { sorting: desiredHoursSorting },
    onSortingChange: setDesiredHoursSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const premiumTable = useReactTable({
    data: (premiumData as any)?.staffPremiumShifts || [],
    columns: premiumColumns,
    state: { sorting: premiumSorting },
    onSortingChange: setPremiumSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <ProtectedPage
      action={Action.Read}
      subject="Fairness"
      fallbackMessage="Only administrators and managers can view fairness analytics."
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Fairness Control Center</h1>
            <p className="text-muted-foreground">Proactive fairness monitoring for current week</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Location and date range (defaults to current week)</CardDescription>
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

        {/* Fairness Score Summary */}
        {fairnessScore !== null && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card
              className={
                fairnessScore >= 80
                  ? 'border-green-500'
                  : fairnessScore >= 60
                    ? 'border-yellow-500'
                    : 'border-red-500'
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Award className="mr-2 h-4 w-4" />
                  Overall Fairness Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-4xl font-bold ${
                    fairnessScore >= 80
                      ? 'text-green-600'
                      : fairnessScore >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {fairnessScore}/100
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fairnessScore >= 80
                    ? 'Excellent distribution'
                    : fairnessScore >= 60
                      ? 'Needs attention'
                      : 'Critical issues'}
                </p>
              </CardContent>
            </Card>

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
                <p className="text-xs text-muted-foreground mt-1">Staff below desired hours</p>
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
                <p className="text-xs text-muted-foreground mt-1">Staff above desired hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Premium Outliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {(premiumData as any)?.staffPremiumShifts?.filter((s: any) => s.isOutlier)
                    .length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Disproportionate premium shifts
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Premium Shift Distribution */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Premium Shift Distribution</CardTitle>
            <CardDescription>
              Friday/Saturday evening shifts and other premium assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPremium ? (
              <div className="text-center py-8 text-muted-foreground">Loading data...</div>
            ) : premiumData && (premiumData as any)?.staffPremiumShifts?.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    {premiumTable.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-muted/50">
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
                    {premiumTable.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
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
                No premium shift data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desired vs Actual Hours with Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Desired vs Actual Hours
            </CardTitle>
            <CardDescription>
              Compare staff actual hours to their desired weekly hours preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDesiredHours ? (
              <div className="text-center py-8 text-muted-foreground">Loading comparison...</div>
            ) : desiredHoursData && (desiredHoursData as any)?.comparisons?.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    {desiredHoursTable.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b bg-muted/50">
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
                      <tr
                        key={row.id}
                        className={`border-b hover:bg-muted/50 ${
                          row.original.status === 'under-scheduled'
                            ? 'bg-red-50'
                            : row.original.status === 'over-scheduled'
                              ? 'bg-orange-50'
                              : ''
                        }`}
                      >
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
                No data available for selected filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
