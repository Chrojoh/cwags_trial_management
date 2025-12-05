// ============================================================================
// src/components/ui/trial-date-time-inputs.tsx
// PURPOSE: Form inputs for date/time/timezone with preview
// ============================================================================
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimezoneSelector } from '@/components/ui/timezoneSelector';
import { createTrialDateTime, formatters } from '@/lib/timezone';

interface TrialDateTimeInputsProps {
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  timezone: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onTimezoneChange: (timezone: string) => void;
  disabled?: boolean;
  className?: string;
}

export const TrialDateTimeInputs: React.FC<TrialDateTimeInputsProps> = ({
  date,
  time,
  timezone,
  onDateChange,
  onTimeChange,
  onTimezoneChange,
  disabled = false,
  className = ""
}) => {
  // Preview the resulting UTC datetime
  const getPreviewDateTime = () => {
    if (date && time && timezone) {
      try {
        const utcDateTime = createTrialDateTime(date, time, timezone);
        return formatters.trialDateTime(utcDateTime.toISOString(), timezone);
      } catch {
        return 'Invalid date/time combination';
      }
    }
    return '';
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trial-date" className="flex items-center gap-2">
            Trial Date
          </Label>
          <Input
            id="trial-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="trial-time" className="flex items-center gap-2">
            Start Time
          </Label>
          <Input
            id="trial-time"
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
      
      <TimezoneSelector
        value={timezone}
        onChange={onTimezoneChange}
        disabled={disabled}
      />
      
      {date && time && timezone && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="text-sm font-medium text-orange-800">Preview:</div>
          <div className="text-sm text-orange-700">{getPreviewDateTime()}</div>
        </div>
      )}
    </div>
  );
};