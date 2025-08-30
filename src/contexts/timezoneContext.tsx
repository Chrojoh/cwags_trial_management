// src/contexts/timezone-context.tsx
// PURPOSE: React context for user timezone preferences ONLY
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TIMEZONE_CONFIG } from '@/lib/timezone';

interface TimezoneContextType {
  userTimezone: string;
  setUserTimezone: (timezone: string) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [userTimezone, setUserTimezoneState] = useState<string>(TIMEZONE_CONFIG.display);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved timezone preference in localStorage
    const savedTimezone = localStorage.getItem('cwags-user-timezone');
    
    if (savedTimezone) {
      setUserTimezoneState(savedTimezone);
    } else {
      // Auto-detect user timezone
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezoneState(detectedTimezone);
    }
    
    setIsLoading(false);
  }, []);

  const setUserTimezone = (timezone: string) => {
    setUserTimezoneState(timezone);
    localStorage.setItem('cwags-user-timezone', timezone);
  };

  return (
    <TimezoneContext.Provider value={{ 
      userTimezone, 
      setUserTimezone, 
      isLoading 
    }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezoneContext = () => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezoneContext must be used within a TimezoneProvider');
  }
  return context;
};