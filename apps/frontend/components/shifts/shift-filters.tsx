import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@shiftsync/ui';
import { Filter, MapPin } from 'lucide-react';
import type { Location } from '@/services/location.service';

interface ShiftFiltersProps {
  locationFilter: string;
  statusFilter: 'all' | 'assigned' | 'uncovered';
  locations: Location[] | undefined;
  onLocationChange: (value: string) => void;
  onStatusChange: (value: 'all' | 'assigned' | 'uncovered') => void;
  onReset: () => void;
}

export function ShiftFilters({
  locationFilter,
  statusFilter,
  locations,
  onLocationChange,
  onStatusChange,
  onReset,
}: ShiftFiltersProps) {
  return (
    <Card className="bg-slate-50/50 border-none shadow-none">
      <CardContent className="p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location Context
          </Label>
          <Select value={locationFilter} onValueChange={onLocationChange}>
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
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as 'all' | 'assigned' | 'uncovered')}
          >
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

        <Button variant="ghost" className="h-10 text-slate-500" onClick={onReset}>
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  );
}
