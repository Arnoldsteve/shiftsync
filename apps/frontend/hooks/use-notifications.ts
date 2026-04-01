import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { notificationService } from '@/services/notification.service';
import { queryKeys } from '@/lib/query-keys';
import type { UpdateNotificationPreferencesDto } from '@/types/notification.types';

/**
 * Hook for managing notifications
 * Requirements: 38.1, 38.2, 38.3
 */
export function useNotifications(includeRead: boolean = false) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();

  // Get notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications.list(includeRead),
    queryFn: () => notificationService.getNotifications(includeRead),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Listen for real-time notification events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotification = () => {
      // Invalidate queries to refetch notifications
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    // Listen for notification events (backend emits 'notification:new')
    socket.on('notification:new', handleNotification);

    // Cleanup
    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket, isConnected, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate both unread and all notifications
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      // Invalidate both unread and all notifications
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

/**
 * Hook for managing notification preferences
 * Requirements: 38.2
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  // Get preferences
  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => notificationService.getPreferences(),
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: UpdateNotificationPreferencesDto) =>
      notificationService.updatePreferences(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}
