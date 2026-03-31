'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Filter,
  MoreHorizontal,
  Star,
  CheckCircle2,
} from 'lucide-react';

import {
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shiftsync/ui';

import { useLocations } from '@/hooks/use-locations';
import { useShifts } from '@/hooks/use-shifts';
import { CreateShiftDialog } from '@/components/schedule/create-shift-dialog';
import type { Shift } from '@/types/shift.types';

export default function ShiftsPage() {
  const router = useRouter();
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'uncovered'>('all');

  // Next 7 days window
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const { data: locations, isLoading: isLoadingLocations } = useLocations();
  const { data: shifts, isLoading: isLoadingShifts } = useShifts({
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Map for location metadata (Timezone + Name)
  const locationMap = useMemo(() => {
    const map = new Map();
    locations?.forEach((loc) => map.set(loc.id, { name: loc.name, tz: loc.timezone }));
    return map;
  }, [locations]);

  // Logic: Is this a "Premium" shift? (Requirement #5: Fri/Sat night)
  const isPremiumShift = (dateStr: string, tz: string) => {
    const localDate = new Date(dateStr);
    const day = parseInt(formatInTimeZone(localDate, tz, 'i')); // 1-7
    const hour = parseInt(formatInTimeZone(localDate, tz, 'H'));
    // Friday (5) or Saturday (6) after 4 PM (16:00)
    return (day === 5 || day === 6) && hour >= 16;
  };

  const isLoading = isLoadingLocations || isLoadingShifts;

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Operations</h1>
          <p className="text-muted-foreground">
            Monitor coverage and labor distribution across Coastal Eats.
          </p>
        </div>
        <CreateShiftDialog />
      </div>

      {/* Modern Filter Bar */}
      <Card className="bg-slate-50/50 border-none shadow-none">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Location Context
            </Label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[220px] bg-white">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Global (All Locations)</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" /> Coverage Status
            </Label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="assigned">Fully Covered</SelectItem>
                <SelectItem value="uncovered">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            className="h-10 text-slate-500"
            onClick={() => {
              setLocationFilter('all');
              setStatusFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* Main Table Content */}
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
                const isUncovered = !shift.assignment;

                return (
                  <TableRow key={shift.id} className="group transition-colors hover:bg-slate-50/50">
                    <TableCell>
                      {isUncovered ? (
                        <Badge
                          variant="destructive"
                          className="flex gap-1 items-center px-2 py-0.5"
                        >
                          <AlertCircle className="h-3 w-3" /> Uncovered
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 flex gap-1 items-center px-2 py-0.5"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Covered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {formatInTimeZone(new Date(shift.startTime), tz, 'EEE, MMM d')}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatInTimeZone(new Date(shift.startTime), tz, 'h:mm a')} -{' '}
                          {formatInTimeZone(new Date(shift.endTime), tz, 'h:mm a')}
                          <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">
                            ({formatInTimeZone(new Date(shift.startTime), tz, 'zzz')})
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {locData?.name || 'Unknown'}
                        </span>
                        {isPremium && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Premium
                                  Shift
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                High-value shift: Friday/Saturday night
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {shift.requiredSkills?.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-600 uppercase"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.assignment ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                            {shift.assignment.staffName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {shift.assignment.staffName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          Waiting for assignment...
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-900"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Shift Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/shifts/${shift.id}/coverage`)}
                          >
                            <Users className="mr-2 h-4 w-4" /> Manage Coverage
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CalendarIcon className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete Shift</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
