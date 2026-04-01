import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shiftService } from '@/services/shift.service';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilters,
  AssignStaffDto,
  PublishScheduleDto,
  UnpublishScheduleDto,
} from '@/types/shift.types';

/**
 * Hook to fetch multiple shifts based on filters.
 * Senior Refactor: Now allows 'locationId' to be optional to support the Global View.
 * The query is enabled as long as a valid date range is provided.
 */
export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    // The queryKey includes the filters so that switching locations
    // or status triggers a fresh fetch from the server.
    queryKey: queryKeys.shifts.list(filters || {}),
    queryFn: () => shiftService.getShifts(filters),
    // Senior Logic: Only require dates. locationId is now handled
    // dynamically by the Backend's PBAC logic.
    enabled: !!filters?.startDate && !!filters?.endDate,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds of freshness
  });
}

/**
 * Hook to fetch a single shift by ID for detailed views or editing.
 */
export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => shiftService.getShiftById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new shift.
 * On success, it invalidates the shift list to ensure the UI shows the new data.
 */
export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftDto) => shiftService.createShift(data),
    onSuccess: () => {
      // Invalidate the entire shift cache to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      // Extraction of specific Backend Constraint Engine error messages
      const message = error.response?.data?.message || 'Failed to create shift';
      toast.error(message);
    },
  });
}

/**
 * Hook to update an existing shift (e.g., changing times or skills).
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftDto }) =>
      shiftService.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Shift updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update shift');
    },
  });
}

/**
 * Hook to delete a shift.
 */
export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shiftService.deleteShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Shift deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete shift');
    },
  });
}

/**
 * Hook to assign a staff member to a shift.
 * This mutation triggers the Backend Constraint Engine (10h rest, skills, etc.)
 */
export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignStaffDto) => shiftService.assignStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Staff assigned successfully');
    },
    onError: (error: any) => {
      // Crucial: This shows the "Why" John Doe couldn't be assigned
      const message = error.response?.data?.message || 'Failed to assign staff';
      toast.error(message, {
        duration: 5000, // Show longer for complex error messages
      });
    },
  });
}

/**
 * Hook to remove a staff member from a shift.
 */
export function useUnassignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: string) => shiftService.unassignStaff(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Staff unassigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unassign staff');
    },
  });
}

/**
 * Hook to publish a schedule for a week.
 * Requirement 32.1
 */
export function usePublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { locationId: string; weekStartDate: string }) =>
      shiftService.publishSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Schedule published successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to publish schedule');
    },
  });
}

/**
 * Hook to unpublish a schedule for a week.
 * Requirement 32.2 - with 48-hour cutoff enforcement
 */
export function useUnpublishSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { locationId: string; weekStartDate: string }) =>
      shiftService.unpublishSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Schedule unpublished successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unpublish schedule');
    },
  });
}

/**
 * Hook to fetch published shifts for a staff member.
 * Requirement 32.3
 */
export function usePublishedShifts(staffId: string, filters?: ShiftFilters) {
  return useQuery({
    queryKey: queryKeys.shifts.published(staffId, filters),
    queryFn: () => shiftService.getPublishedShifts(staffId, filters),
    enabled: !!staffId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}
