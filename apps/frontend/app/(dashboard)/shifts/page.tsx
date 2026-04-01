'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

import { useLocations } from '@/hooks/use-locations';
import { useShifts } from '@/hooks/use-shifts';
import { CreateShiftDialog } from '@/components/schedule/create-shift-dialog';
import { ShiftFilters } from '@/components/shifts/shift-filters';
import { ShiftTable } from '@/components/shifts/shift-table';
import { Can } from '@/components/auth/can';
import { Action } from '@/lib/ability';

/**
 * ShiftsPage: Operational Dashboard for Coastal Eats.
 * Fixed: Infinite re-fetch loop by stabilizing Query Keys.
 * Identity: Admin/Manager Global Visibility & Timezone Handling.
 */
export default function ShiftsPage() {
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'uncovered'>('all');
  const [mounted, setMounted] = useState(false);

  /**
   * Senior Move: Stabilize Date Range
   * We normalize to the start and end of the 7-day window.
   * Without useMemo, new Date() creates a new Query Key every millisecond,
   * causing the infinite re-fetch loop you saw in the console.
   */
  const { startISO, endISO } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Start of today

    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(23, 59, 59, 999); // End of the 7th day

    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };
  }, []); // Empty deps: This range stays stable for the lifecycle of the page

  // Fetch Locations (Authorized for the logged-in Admin/Manager)
  const { data: locations, isLoading: isLoadingLocations } = useLocations();

  // Fetch Shifts (Global or Location-specific)
  const {
    data: shifts,
    isLoading: isLoadingShifts,
    error,
  } = useShifts({
    // If 'all', pass undefined. Backend Service handles the PBAC Global fetch.
    locationId: locationFilter === 'all' ? undefined : locationFilter,
    startDate: startISO,
    endDate: endISO,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Handle Hydration (Next.js 15 App Router requirement)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map for O(1) location metadata lookups in the table rows
  const locationMap = useMemo(() => {
    const map = new Map();
    locations?.forEach((loc) => {
      map.set(loc.id, {
        name: loc.name,
        timezone: loc.timezone,
      });
    });
    return map;
  }, [locations]);

  /**
   * Requirement #5: Premium Shift Identification
   * Tag Friday/Saturday nights (after 4pm) for fairness tracking.
   */
  const isPremiumShift = (dateStr: string, tz: string) => {
    const localDate = new Date(dateStr);
    const day = parseInt(formatInTimeZone(localDate, tz, 'i')); // 1 (Mon) - 7 (Sun)
    const hour = parseInt(formatInTimeZone(localDate, tz, 'H')); // 0-23
    return (day === 5 || day === 6) && hour >= 16;
  };

  /**
   * UI State Logic
   * We only show the "Syncing" overlay if we have no data and are actually loading.
   */
  const isLoading = (isLoadingLocations || isLoadingShifts) && !shifts && !error;
  const shiftList = shifts || [];

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Operations</h1>
          <p className="text-muted-foreground">
            Monitoring coverage across all authorized Coastal Eats locations.
          </p>
        </div>
        <Can I={Action.Create} a="Shift">
          <CreateShiftDialog />
        </Can>
      </div>

      {/* Requirement #17.1: Advanced Filtering */}
      <ShiftFilters
        locationFilter={locationFilter}
        statusFilter={statusFilter}
        locations={locations || []}
        onLocationChange={setLocationFilter}
        onStatusChange={setStatusFilter}
        onReset={() => {
          setLocationFilter('all');
          setStatusFilter('all');
        }}
      />

      {/* Global Error Alert (PBAC or Network violations) */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          Engine Sync Error: {error instanceof Error ? error.message : 'Unauthorized access'}
        </div>
      )}

      {/* High-Capacity Data Table */}
      <ShiftTable
        shifts={shiftList}
        isLoading={isLoading}
        locationMap={locationMap}
        isPremiumShift={isPremiumShift}
      />
    </div>
  );
}
