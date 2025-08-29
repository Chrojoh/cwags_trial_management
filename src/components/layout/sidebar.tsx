'use client';

import type { User } from '@/types/auth';
import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Trophy,
  FileText,
  BarChart3,
  Settings,
  Database,
  UserCheck,
  ClipboardList,
  Timer,
  Award,
  FileSpreadsheet,
  Bell
} from 'lucide-react';

interface SidebarProps {
  user: User;
  currentPath: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavigationItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentPath }) => {
  if (!user) {
    return (
      <nav className="h-full bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </nav>
    );
  }

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
    },
    {
      label: 'Trial Management',
      href: '/dashboard/trials',
      icon: Calendar,
      children: [
        {
          label: 'All Trials',
          href: '/dashboard/trials',
          icon: Calendar,
        },
        {
          label: 'Create Trial',
          href: '/dashboard/trials/create',
          icon: Calendar,
        },
        {
          label: 'Draft Trials',
          href: '/dashboard/trials/drafts',
          icon: FileText,
        },
      ],
    },
    {
      label: 'Entries',
      href: '/dashboard/entries',
      icon: ClipboardList,
      children: [
        {
          label: 'All Entries',
          href: '/dashboard/entries',
          icon: ClipboardList,
        },
        {
          label: 'Entry Processing',
          href: '/dashboard/entries/processing',
          icon: UserCheck,
        },
        {
          label: 'Running Orders',
          href: '/dashboard/entries/running-orders',
          icon: Timer,
        },
      ],
    },
    {
      label: 'Scoring',
      href: '/dashboard/scoring',
      icon: Trophy,
      children: [
        {
          label: 'Score Entry',
          href: '/dashboard/scoring/entry',
          icon: Trophy,
        },
        {
          label: 'Class Results',
          href: '/dashboard/scoring/results',
          icon: Award,
        },
        {
          label: 'Score Sheets',
          href: '/dashboard/scoring/sheets',
          icon: FileText,
        },
      ],
    },
    {
      label: 'Reports',
      href: '/dashboard/reports',
      icon: FileSpreadsheet,
      children: [
        {
          label: 'Trial Reports',
          href: '/dashboard/reports/trials',
          icon: FileSpreadsheet,
        },
        {
          label: 'Financial Reports',
          href: '/dashboard/reports/financial',
          icon: BarChart3,
        },
        {
          label: 'Statistics',
          href: '/dashboard/reports/statistics',
          icon: BarChart3,
        },
      ],
    },
    {
      label: 'Data Management',
      href: '/dashboard/data',
      icon: Database,
      children: [
        {
          label: 'Judges',
          href: '/dashboard/data/judges',
          icon: Users,
        },
        {
          label: 'Registry',
          href: '/dashboard/data/registry',
          icon: Database,
        },
        {
          label: 'Users',
          href: '/dashboard/data/users',
          icon: UserCheck,
        },
      ],
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      icon: Bell,
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const isActiveRoute = (href: string): boolean => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  };

  return (
    <nav className="h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;
            
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
                
                {item.children && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = isActiveRoute(child.href);
                      const ChildIcon = child.icon;
                      
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center space-x-3 ml-6 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isChildActive
                              ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-500'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Stats Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Stats
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Active Trials</span>
              <span className="font-medium">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Entries</span>
              <span className="font-medium">234</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending Scores</span>
              <span className="font-medium text-orange-600">8</span>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-blue-700">
                {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              {user.club_name && (
                <p className="text-xs text-blue-600">{user.club_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};