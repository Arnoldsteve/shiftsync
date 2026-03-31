import { Card, CardContent } from '@shiftsync/ui';
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface ShiftStatsProps {
  totalShifts: number;
  coveredShifts: number;
  uncoveredShifts: number;
}

export function ShiftStats({ totalShifts, coveredShifts, uncoveredShifts }: ShiftStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Total Shifts</p>
            <p className="text-2xl font-bold text-slate-900">{totalShifts}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Covered</p>
            <p className="text-2xl font-bold text-green-600">{coveredShifts}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Uncovered</p>
            <p className="text-2xl font-bold text-red-600">{uncoveredShifts}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
