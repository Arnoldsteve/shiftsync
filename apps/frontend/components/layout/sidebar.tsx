'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/lib/ability';
import { Button } from '@shiftsync/ui';
import {
  Calendar,
  Users,
  RefreshCw,
  Clock,
  BarChart3,
  Phone,
  Settings,
  FileText,
  Briefcase,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  UserCog,
  Package,
  User,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  action: Action;
  subject: any;
  roles?: string[]; // Optional: restrict to specific roles
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { can } = usePermissions();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Define navigation items with permissions and role restrictions
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      action: Action.Read,
      subject: 'User',
    },
    {
      label: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      action: Action.Read,
      subject: 'Schedule',
    },
    {
      label: 'My Shifts',
      href: '/my-shifts',
      icon: ClipboardList,
      action: Action.Read,
      subject: 'SwapRequest',
      roles: ['STAFF'], // Only staff see this
    },
    {
      label: 'Pickup Shifts',
      href: '/pickup',
      icon: Package,
      action: Action.Read,
      subject: 'Shift',
      roles: ['STAFF'], // Only staff see this
    },
    {
      label: 'My Availability',
      href: '/availability',
      icon: UserCog,
      action: Action.Read,
      subject: 'Availability',
      roles: ['STAFF'], // Only staff see this
    },
    {
      label: 'Coverage',
      href: '/coverage',
      icon: Users,
      action: Action.Update,
      subject: 'CalloutRequest',
    },
    {
      label: 'Shifts',
      href: '/shifts',
      icon: Briefcase,
      action: Action.Create,
      subject: 'Shift',
    },
    {
      label: 'Swap Requests',
      href: '/swaps',
      icon: RefreshCw,
      action: Action.Manage,
      subject: 'SwapRequest',
    },
    // {
    //   label: 'Callouts',
    //   href: '/callouts',
    //   icon: Phone,
    //   action: Action.Update,
    //   subject: 'CalloutRequest',
    // },
    {
      label: 'Overtime',
      href: '/overtime',
      icon: Clock,
      action: Action.Read,
      subject: 'Overtime',
    },
    {
      label: 'Fairness',
      href: '/fairness',
      icon: BarChart3,
      action: Action.Read,
      subject: 'Fairness',
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
      action: Action.Manage,
      subject: 'User',
    },
    {
      label: 'Configuration',
      href: '/admin/config',
      icon: Settings,
      action: Action.Update,
      subject: 'Config',
    },
    {
      label: 'Audit Logs',
      href: '/admin/audit',
      icon: FileText,
      action: Action.Read,
      subject: 'Audit',
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: User,
      action: Action.Read,
      subject: 'User',
    },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold">ShiftSync</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            // Check role restriction first
            if (item.roles && user?.role && !item.roles.includes(user.role)) {
              return null;
            }

            // Check if user has permission to see this nav item
            if (!can(item.action, item.subject)) {
              return null;
            }

            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
