import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWebSocket } from '@/contexts/websocket-context';
import { queryKeys } from '@/lib/query-keys';
import type { Notification } from '@/types/notification.types';

/**
 * Hook for real-time notification updates
 * Requirements: 38.4, 38.5, 38.6, 38.7, 38.8, 38.9
 *
 * Subscribes to notification:new events via WebSocket and:
 * - Displays toast notification using Sonner
 * - Updates notification center in real-time
 * - Updates unread count badge
 */
export function useNotificationRealtime() {
  const { socket, isConnected } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNotificationNew = (notification: Notification) => {
      // Display toast notification
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      });

      // Invalidate notification queries to update the notification center and unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    // Subscribe to notification:new event
    socket.on('notification:new', handleNotificationNew);

    // Cleanup on unmount
    return () => {
      socket.off('notification:new', handleNotificationNew);
    };
  }, [socket, isConnected, queryClient]);
}
