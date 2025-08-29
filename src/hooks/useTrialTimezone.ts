// src/hooks/useTrialTimezone.ts
// PURPOSE: Custom hook for trial-specific timezone operations
import { useState, useEffect, useMemo } from 'react';
import { useTimezoneContext } from '@/contexts/timezone-context';
import { 
  formatTrialSchedule, 
  getEntryWindowStatus, 
  calculateLateFee 
} from '@/lib/cwags-business';

interface UseTrialTimezoneProps {
  trialDate: string;
  trialTimezone: string;
}

export const useTrialTimezone = ({ trialDate, trialTimezone }: UseTrialTimezoneProps) => {
  const { userTimezone } = useTimezoneContext();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const schedule = useMemo(() => 
    formatTrialSchedule(trialDate, trialTimezone, userTimezone),
    [trialDate, trialTimezone, userTimezone]
  );
  
  const entryStatus = useMemo(() => 
    getEntryWindowStatus(trialDate, trialTimezone, currentTime),
    [trialDate, trialTimezone, currentTime]
  );
  
  const lateFee = useMemo(() => 
    calculateLateFee(trialDate, trialTimezone, currentTime),
    [trialDate, trialTimezone, currentTime]
  );
  
  const isInDifferentTimezone = userTimezone !== trialTimezone;
  
  return {
    schedule,
    entryStatus,
    lateFee,
    isInDifferentTimezone,
    userTimezone,
    trialTimezone,
    currentTime,
  };
};