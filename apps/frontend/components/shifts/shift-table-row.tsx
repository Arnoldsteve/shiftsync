import { useRouter } from 'next/navigation';
import { formatInTimeZone } from 'date-fns-tz';
import {
  TableRow,
  TableCell,
  Badge,
  Button,
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
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  AlertCircle,
  MoreHorizontal,
  Star,
  CheckCircle2,
} from 'lucide-react';
import type { Shift } from '@/types/shift.types';

interface ShiftTableRowProps {
  shift: Shift;
  locationName: string;
  timezone: string;
  isPremium: boolean;
}

export function ShiftTableRow({ shift, locationName, timezone, isPremium }: ShiftTableRowProps) {
  const router = useRouter();
  const isUncovered = !shift.assignment;

  return (
    <TableRow className="group transition-colors hover:bg-slate-50/50">
      <TableCell>
        {isUncovered ? (
          <Badge variant="destructive" className="flex gap-1 items-center px-2 py-0.5">
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
            {formatInTimeZone(new Date(shift.startTime), timezone, 'EEE, MMM d')}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {formatInTimeZone(new Date(shift.startTime), timezone, 'h:mm a')} -{' '}
            {formatInTimeZone(new Date(shift.endTime), timezone, 'h:mm a')}
            <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">
              ({formatInTimeZone(new Date(shift.startTime), timezone, 'zzz')})
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-slate-700">{locationName}</span>
          {isPremium && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Premium Shift
                  </span>
                </TooltipTrigger>
                <TooltipContent>High-value shift: Friday/Saturday night</TooltipContent>
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
            <span className="text-sm font-medium text-slate-700">{shift.assignment.staffName}</span>
          </div>
        ) : (
          <span className="text-xs italic text-slate-400">Waiting for assignment...</span>
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
            <DropdownMenuItem onClick={() => router.push(`/shifts/${shift.id}/coverage`)}>
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
}
