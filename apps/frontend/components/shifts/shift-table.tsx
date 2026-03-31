import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shiftsync/ui';
import { ShiftTableRow } from './shift-table-row';
import type { Shift } from '@/types/shift.types';

interface ShiftTableProps {
  shifts: Shift[] | undefined;
  isLoading: boolean;
  locationMap: Map<string, { name: string; tz: string }>;
  isPremiumShift: (dateStr: string, tz: string) => boolean;
}

export function ShiftTable({ shifts, isLoading, locationMap, isPremiumShift }: ShiftTableProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead>Shift Timing (Local)</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Required Skills</TableHead>
            <TableHead>Assignment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                Syncing with schedule engine...
              </TableCell>
            </TableRow>
          ) : shifts?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No shifts found for this criteria.
              </TableCell>
            </TableRow>
          ) : (
            shifts?.map((shift: Shift) => {
              const locData = locationMap.get(shift.locationId);
              const tz = locData?.tz || 'UTC';
              const isPremium = isPremiumShift(shift.startTime, tz);

              return (
                <ShiftTableRow
                  key={shift.id}
                  shift={shift}
                  locationName={locData?.name || 'Unknown'}
                  timezone={tz}
                  isPremium={isPremium}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
