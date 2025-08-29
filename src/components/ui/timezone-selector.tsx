// src/components/ui/timezone-selector.tsx
'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { TIMEZONE_CONFIG, getTimezoneAbbreviation } from '@/lib/timezone';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  value,
  onChange,
  label = "Trial Timezone",
  disabled = false,
  className = ""
}) => {
  const currentDate = new Date();
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {label}
      </label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Select timezone...</option>
        {TIMEZONE_CONFIG.commonTimezones.map((timezone) => {
          const abbreviation = getTimezoneAbbreviation(timezone, currentDate);
          const displayName = timezone.replace('America/', '').replace('_', ' ');
          
          return (
            <option key={timezone} value={timezone}>
              {displayName} ({abbreviation})
            </option>
          );
        })}
      </select>
    </div>
  );
};