'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { useNotificationRealtime } from '@/hooks/use-notification-realtime';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Enable real-time notification updates (Requirements: 38.4, 38.5, 38.6, 38.7, 38.8, 38.9)
  useNotificationRealtime();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
