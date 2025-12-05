// ============================================================================
// src/components/ui/trial-date-time-display.tsx
// PURPOSE: Display trial date/time with timezone info
// ============================================================================
import { Calendar, Clock } from 'lucide-react';
import { useTimezone, formatTimeRemaining } from '@/lib/timezone';
import { Badge } from '@/components/ui/badge';

interface TrialDateTimeDisplayProps {
  trialDate: string; // UTC ISO string
  trialTimezone: string;
  showCountdown?: boolean;
  showEntryStatus?: boolean;
  compact?: boolean;
  className?: string;
}

export const TrialDateTimeDisplay: React.FC<TrialDateTimeDisplayProps> = ({
  trialDate,
  trialTimezone,
  showCountdown = false,
  showEntryStatus = false,
  compact = false,
  className = ""
}) => {
  const { formatTrialTime } = useTimezone();
  const trialTime = formatTrialTime(trialDate, trialTimezone);
  const timeRemaining = formatTimeRemaining(trialDate);
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Calendar className="w-4 h-4 text-gray-500" />
        <span>{trialTime.date}</span>
        <Clock className="w-4 h-4 text-gray-500" />
        <span>{trialTime.time} {trialTime.timezone}</span>
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-600" />
          <div>
            <div className="font-medium">{trialTime.date}</div>
            <div className="text-sm text-gray-600">{trialTime.time} {trialTime.timezone}</div>
          </div>
        </div>
      </div>
      
      {showCountdown && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">{timeRemaining}</span>
        </div>
      )}
    </div>
  );
};