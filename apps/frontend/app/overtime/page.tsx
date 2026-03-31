'use client';

import { useState } from 'react';
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
} from '@shiftsync/ui';
import { Download } from 'lucide-react';
import { useOvertimeReport } from '@/hooks/use-overtime';

export default function OvertimePage() {
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: report, isLoading } = useOvertimeReport({
    locationId,
    startDate,
    endDate,
  });

  const handleExport = () => {
    if (!report) return;

    const csv = [
      ['Staff Name', 'Regular Hours', 'Overtime Hours', 'Total Hours'],
      ...report.staff.map((s) => [s.staffName, s.regularHours, s.overtimeHours, s.totalHours]),
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
          <h1 className="text-3xl font-bold">Overtime Dashboard</h1>
          <p className="text-muted-foreground">Track staff overtime hours and generate reports</p>
        </div>
        {report && (
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
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

      <Card>
        <CardHeader>
          <CardTitle>Overtime Report</CardTitle>
          <CardDescription>Staff overtime hours for selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading report...</div>
          ) : report ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-right">Regular Hours</TableHead>
                  <TableHead className="text-right">Overtime Hours</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.staff.map((staff) => (
                  <TableRow key={staff.staffId}>
                    <TableCell className="font-medium">{staff.staffName}</TableCell>
                    <TableCell className="text-right">{staff.regularHours.toFixed(2)}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
