'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@shiftsync/ui';
import { Download, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { useOvertimeReport } from '@/hooks/use-overtime';
import { useLocations } from '@/hooks/use-locations';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export default function OvertimePage() {
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Default to current week (Monday to Sunday)
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Initialize with current week on mount
  useEffect(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    setStartDate(format(weekStart, 'yyyy-MM-dd'));
    setEndDate(format(weekEnd, 'yyyy-MM-dd'));

    // Auto-select first location if available
    if (locations && locations.length > 0 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const { data: report, isLoading } = useOvertimeReport({
    locationId,
    startDate,
    endDate,
  });

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!report || !report.staff) return null;

    const totalOvertimeHours = report.staff.reduce((sum, s) => sum + s.overtimeHours, 0);
    const BASE_RATE = 15; // $15/hr base rate
    const OVERTIME_MULTIPLIER = 1.5;
    const estimatedCost = totalOvertimeHours * BASE_RATE * OVERTIME_MULTIPLIER;

    const criticalStaff = report.staff.filter((s) => s.totalHours > 40).length;
    const warningStaff = report.staff.filter(
      (s) => s.totalHours >= 35 && s.totalHours <= 40
    ).length;

    return {
      totalOvertimeHours,
      estimatedCost,
      criticalStaff,
      warningStaff,
    };
  }, [report]);

  const handleExport = () => {
    if (!report) return;

    const csv = [
      ['Staff Name', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Status'],
      ...report.staff.map((s) => [
        s.staffName,
        s.regularHours.toFixed(2),
        s.overtimeHours.toFixed(2),
        s.totalHours.toFixed(2),
        s.totalHours > 40 ? 'CRITICAL' : s.totalHours >= 35 ? 'WARNING' : 'OK',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime-report-${startDate}-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Overtime Control Center</h1>
          <p className="text-muted-foreground">Monitor labor costs and overtime compliance</p>
        </div>
        {report && (
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Overtime Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold">{summary.totalOvertimeHours.toFixed(1)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Estimated OT Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">${summary.estimatedCost.toFixed(0)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">@ $15/hr × 1.5x</p>
            </CardContent>
          </Card>

          <Card className={summary.criticalStaff > 0 ? 'border-red-300 bg-red-50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical (&gt;40h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-red-600">{summary.criticalStaff}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={summary.warningStaff > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warning (35-40h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{summary.warningStaff}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Select location and date range (defaults to current week)
          </CardDescription>
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
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overtime Report</CardTitle>
          <CardDescription>
            Staff overtime hours for selected period (Red: &gt;40h, Yellow: 35-40h)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading report...</div>
          ) : report && report.staff && report.staff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-right">Regular Hours</TableHead>
                  <TableHead className="text-right">Overtime Hours</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.staff
                  .sort((a, b) => b.totalHours - a.totalHours) // Sort by total hours descending
                  .map((staff) => {
                    const isCritical = staff.totalHours > 40;
                    const isWarning = staff.totalHours >= 35 && staff.totalHours <= 40;
                    const rowClass = isCritical
                      ? 'bg-red-50 border-l-4 border-l-red-600'
                      : isWarning
                        ? 'bg-yellow-50 border-l-4 border-l-yellow-600'
                        : '';

                    return (
                      <TableRow key={staff.staffId} className={rowClass}>
                        <TableCell className="font-medium">{staff.staffName}</TableCell>
                        <TableCell className="text-right">
                          {staff.regularHours.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${
                            staff.overtimeHours > 0 ? 'text-red-600 font-semibold' : ''
                          }`}
                        >
                          {staff.overtimeHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {staff.totalHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCritical ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              CRITICAL
                            </Badge>
                          ) : isWarning ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-yellow-600 text-yellow-700 bg-yellow-50"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              WARNING
                            </Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {locationId && startDate && endDate
                ? 'No overtime data for selected period'
                : 'Select filters to view report'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
