// src/components/auth/AuthGuard.tsx
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component ensures authentication is complete before rendering children.
 * This prevents race conditions where components try to access user data before it's loaded.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  // Loading state
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Authentication Error: {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-3">
            <Button 
              onClick={() => router.push('/login')}
              className="flex-1"
            >
              Go to Login
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated or user is null
  if (!isAuthenticated || !user) {
    if (typeof window !== 'undefined') {
      window.location.pathname = '/login';
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and loaded - safe to render children
  return <>{children}</>;
}