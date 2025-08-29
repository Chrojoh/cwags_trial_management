'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, LogOut, User as UserIcon, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  user: User;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onMenuClick }) => {
  const { signOut } = useAuth();
  const [notificationCount] = useState(3);

  // Add this debug and safety check
  console.log('Header user:', user);
  
  if (!user) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200 z-30">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div>Loading...</div>
        </div>
      </header>
    );
  }

  const handleLogout = () => {
    signOut();
  };

  // Simplified time display
  const currentTime = new Date().toLocaleString();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'trial_secretary':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 z-30">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CW</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">C-WAGS</h1>
              <p className="text-xs text-gray-500 -mt-1">Trial Management</p>
            </div>
          </Link>
        </div>

        {/* Center Section - Current Time */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
          <span>{currentTime}</span>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleBadgeColor(user.role)}`}
                  >
                    {formatRoleName(user.role)}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
  <DropdownMenuLabel>
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-medium">
        {user.first_name} {user.last_name}
      </p>
      <p className="text-xs text-gray-500">{user.email}</p>
      {user.club_name && (
        <p className="text-xs text-gray-500">{user.club_name}</p>
      )}
    </div>
  </DropdownMenuLabel>
  
  <DropdownMenuSeparator />
  
  <DropdownMenuItem 
    onClick={handleLogout}
    className="text-red-600 focus:text-red-600"
  >
    <LogOut className="mr-2 h-4 w-4" />
    <span>Sign out</span>
  </DropdownMenuItem>
</DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};