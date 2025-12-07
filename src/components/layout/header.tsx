'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Image from "next/image";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdownMenu';

import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  user: User;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onMenuClick }) => {
  const { signOut } = useAuth();
  
  // ✅ Clock state that updates every second
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());

  // ✅ Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'trial_secretary':
        return 'bg-orange-100 text-orange-800';
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
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              C-WAGS
            </div>
            <span className="hidden md:block text-xl font-bold text-gray-900">
              Trial Management
            </span>
          </Link>
        </div>

        {/* Center Section - Clock */}
        <div className="flex items-center justify-center">
          <div className="text-sm font-medium text-gray-700">
            {currentTime}
          </div>
        </div>

        {/* Right Section - User Menu */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {user.email}
                  </div>
                  <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleName(user.role)}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
};