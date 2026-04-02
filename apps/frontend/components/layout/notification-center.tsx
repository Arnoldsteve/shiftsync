'use client';

import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/use-notifications';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shiftsync/ui';
import {
  Bell,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  RefreshCw,
  Trash2,
  Info,
  Package,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from '@/types/notification.types';

/**
 * Notification Center Component
 * Requirements: 38.1, 38.3
 */
export function NotificationCenter() {
  const router = useRouter();
  const includeRead = false;
  const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingAllAsRead } =
    useNotifications(includeRead);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'SHIFT_OFFER': {
        // Extract shiftId from metadata and add as query parameter
        const shiftId = notification.metadata?.shiftId;
        if (shiftId) {
          router.push(`/pickup?highlight=${shiftId}`);
        } else {
          router.push('/pickup');
        }
        break;
      }
      case 'SHIFT_OFFER_ACCEPTED':
      case 'COVERAGE_GAP':
        router.push('/coverage');
        break;
      case 'SHIFT_ASSIGNED':
      case 'SHIFT_MODIFIED':
      case 'SHIFT_DELETED':
        router.push('/my-shifts');
        break;
      case 'SWAP_REQUEST_CREATED':
      case 'SWAP_REQUEST_APPROVED':
      case 'SWAP_REQUEST_REJECTED':
        router.push('/swaps');
        break;
      case 'SCHEDULE_PUBLISHED':
        router.push('/schedule');
        break;
      case 'OVERTIME_APPROACHING':
        router.push('/overtime');
        break;
      case 'AVAILABILITY_CHANGED':
        router.push('/availability');
        break;
      default:
        // No navigation for unknown types
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'SHIFT_OFFER':
        return <Package className="h-4 w-4 text-green-600" />;
      case 'SHIFT_OFFER_ACCEPTED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'COVERAGE_GAP':
        return <Users className="h-4 w-4 text-red-600" />;
      case 'SHIFT_ASSIGNED':
      case 'SCHEDULE_PUBLISHED':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'SHIFT_MODIFIED':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'SHIFT_DELETED':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'SWAP_REQUEST_CREATED':
        return <RefreshCw className="h-4 w-4 text-purple-600" />;
      case 'SWAP_REQUEST_APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'SWAP_REQUEST_REJECTED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'OVERTIME_APPROACHING':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'AVAILABILITY_CHANGED':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <>
            <div className="px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
              >
                Mark all as read
              </Button>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Notifications list */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !notification.isRead ? 'bg-accent/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
