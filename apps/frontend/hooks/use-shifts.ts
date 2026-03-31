import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { shiftService } from '@/services/shift.service';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilters,
  AssignStaffDto,
} from '@/types/shift.types';

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: queryKeys.shifts.list(filters || {}),
    queryFn: () => shiftService.getShifts(filters),
    enabled: !!filters?.locationId,
  });
}

export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => shiftService.getShiftById(id),
    enabled: !!id,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftDto) => shiftService.createShift(data),
    onSuccess: () => {
      // Refetch all shift queries to immediately show the new shift
      queryClient.refetchQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Shift created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create shift');
    },
  });
}

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

export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignStaffDto) => shiftService.assignStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      toast.success('Staff assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign staff');
    },
  });
}

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
