'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Header } from './header';
import { Breadcrumbs } from './breadcrumbs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  fullWidth?: boolean; // Control padding
}

function MainLayout({ 
  children, 
  title, 
  breadcrumbItems,
  fullWidth = false // Default to false for backward compatibility
}: MainLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.pathname = '/auth/signin';
    }
    return null;
  }

  // Ensure user exists before rendering (TypeScript safety)
  if (!user) {
    return null;
  }

 

  return (
    <div className="flex h-screen bg-gray-50">
   

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Now guaranteed to have user */}
        <Header user={user} onMenuClick={() => {}} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Breadcrumbs */}
          {(breadcrumbItems && breadcrumbItems.length > 0) && (
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <Breadcrumbs items={breadcrumbItems} />
            </div>
          )}

          {/* Page Header */}
          {title && (
            <div className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          )}

          {/* Page Content - Conditional padding based on fullWidth prop */}
          <main className={`flex-1 overflow-y-auto ${fullWidth ? '' : 'p-4 lg:p-6'}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;