'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@shiftsync/ui';
import { Calendar, Clock, MapPin, Users, AlertCircle } from 'lucide-react';
import { useLocations } from '@/hooks/use-locations';

export default function ShiftsPage() {
  const router = useRouter();
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Mock data - in real app, fetch from API
  const shifts = [
    {
      id: 'shift-1',
      location: 'Downtown',
      locationId: 'loc1',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
      requiredStaff: 3,
      assignedStaff: 3,
      status: 'covered',
      skills: ['Cashier', 'Customer Service'],
    },
    {
      id: 'shift-2',
      location: 'Uptown',
      locationId: 'loc2',
      startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      requiredStaff: 2,
      assignedStaff: 1,
      status: 'partial',
      skills: ['Manager', 'Inventory'],
    },
    {
      id: 'shift-3',
      location: 'Westside',
      locationId: 'loc3',
      startTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString(),
      requiredStaff: 4,
      assignedStaff: 0,
      status: 'uncovered',
      skills: ['Cashier', 'Stock', 'Customer Service'],
    },
  ];

  const filteredShifts = shifts.filter((shift) => {
    if (locationFilter !== 'all' && shift.locationId !== locationFilter) return false;
    if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'covered':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-orange-100 text-orange-700';
      case 'uncovered':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'covered':
        return 'Fully Covered';
      case 'partial':
        return 'Partially Covered';
      case 'uncovered':
        return 'Uncovered';
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Shifts</h1>
        <p className="text-muted-foreground">View and manage all shifts across locations</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter shifts by location and coverage status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
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
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="covered">Fully Covered</SelectItem>
                  <SelectItem value="partial">Partially Covered</SelectItem>
                  <SelectItem value="uncovered">Uncovered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <div className="grid gap-4">
        {filteredShifts.length > 0 ? (
          filteredShifts.map((shift) => (
            <Card key={shift.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      {shift.location}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(shift.startTime).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(shift.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {new Date(shift.endTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                      shift.status
                    )}`}
                  >
                    {getStatusText(shift.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>
                          {shift.assignedStaff}/{shift.requiredStaff}
                        </strong>{' '}
                        staff assigned
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Required Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {shift.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {shift.status === 'uncovered' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        This shift needs coverage urgently
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/shifts/${shift.id}/coverage`)}
                    >
                      View Coverage
                    </Button>
                    {shift.status !== 'covered' && (
                      <Button onClick={() => router.push(`/shifts/${shift.id}/coverage`)}>
                        Find Staff
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                No shifts found for the selected filters
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
