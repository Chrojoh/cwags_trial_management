'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Users, 
  Settings, 
  Database,
  Trophy,
  ClipboardList,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['administrator', 'trial_secretary'],
  },
  {
    name: 'Trials',
    href: '/trials',
    icon: Calendar,
    roles: ['administrator', 'trial_secretary'],
  },
  {
    name: 'Running Orders & Scoring',
    href: '/scoring',
    icon: ClipboardList,
    roles: ['administrator', 'trial_secretary'],
    badge: 'New',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['administrator', 'trial_secretary'],
  },
  {
    name: 'Registry',
    href: '/registry',
    icon: Database,
    roles: ['administrator'],
  },
  {
    name: 'Judges',
    href: '/judges',
    icon: Trophy,
    roles: ['administrator'],
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: ['administrator'],
  },
  {
    name: 'System Settings',
    href: '/settings',
    icon: Settings,
    roles: ['administrator'],
  },
];

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Safety check AFTER all hooks
  if (!user) {
    return null; // Don't render mobile nav if no user
  }

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => 
    user && user.role && item.roles.includes(user.role)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Slide-out menu */}
      <div className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">CW</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">C-WAGS</h2>
              <p className="text-xs text-gray-500">Trial Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom - with safety checks */}
        {user && (
          <div className="p-4 border-t bg-gray-50">
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-gray-600 capitalize">
                {user.role?.replace('_', ' ')}
              </p>
              {user.club_name && (
                <p className="text-gray-500 text-xs">{user.club_name}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}