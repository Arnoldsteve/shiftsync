'use client';

import { Button, Badge } from '@shiftsync/ui';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle } from 'lucide-react';
import type { Shift } from '@/types/shift.types';

interface WeekCalendarProps {
  startDate: Date;
  endDate: Date;
  shifts: Shift[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onShiftClick?: (shift: Shift) => void;
}

export function WeekCalendar({
  startDate,
  endDate,
  shifts,
  onPreviousWeek,
  onNextWeek,
  onToday,
  onShiftClick,
}: WeekCalendarProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    return day;
  });

  const getShiftsForDay = (date: Date) => {
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={onNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayShifts = getShiftsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`border rounded-lg p-3 min-h-[200px] ${
                isToday ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="font-semibold mb-2">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                <div className="text-sm font-normal text-muted-foreground">{day.getDate()}</div>
              </div>
              <div className="space-y-2">
                {dayShifts.map((shift) => {
                  // Calculate headcount status
                  const requiredHeadcount = shift.requiredHeadcount || 1;
                  const assignments =
                    shift.assignments || (shift.assignment ? [shift.assignment] : []);
                  const filledHeadcount = assignments.length;
                  const isFullyCovered = filledHeadcount >= requiredHeadcount;
                  const isPartiallyCovered =
                    filledHeadcount > 0 && filledHeadcount < requiredHeadcount;

                  return (
                    <div
                      key={shift.id}
                      onClick={() => onShiftClick?.(shift)}
                      className={`p-2 rounded text-xs cursor-pointer hover:opacity-80 relative ${
                        isFullyCovered
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                          : isPartiallyCovered
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
                            : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                      }`}
                    >
                      {/* Published Status Indicator (Requirement 32.2) */}
                      {shift.isPublished && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Published
                          </Badge>
                        </div>
                      )}
                      <div className="font-medium">
                        {new Date(shift.startTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(shift.endTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      {/* Headcount Status (Requirement 42.3, 42.4, 42.5) */}
                      <div className="flex items-center gap-1 mt-1">
                        {isFullyCovered ? (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1 py-0 h-4 bg-green-600"
                          >
                            ✓ Fully Staffed
                          </Badge>
                        ) : isPartiallyCovered ? (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1 py-0 h-4 bg-yellow-600"
                          >
                            ⚠ Needs {requiredHeadcount - filledHeadcount} more
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] px-1 py-0 h-4 bg-red-600">
                            Uncovered
                          </Badge>
                        )}
                      </div>

                      {/* Staff Count Display */}
                      <div className="text-muted-foreground mt-1">
                        {filledHeadcount} / {requiredHeadcount} staff
                      </div>

                      {/* Staff Names */}
                      {assignments.length > 0 && (
                        <div className="text-muted-foreground text-[10px] mt-1">
                          {assignments.map((a) => a.staffName).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
