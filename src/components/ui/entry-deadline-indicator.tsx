// ============================================================================
// src/components/ui/entry-deadline-indicator.tsx
// PURPOSE: Show entry deadline status with alerts
// ============================================================================
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { calculateEntryDeadline, calculateLateEntryDeadline } from '@/lib/cwags-business';
import { formatDateForDisplay } from '@/lib/timezone';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EntryDeadlineIndicatorProps {
  trialDate: string; // UTC ISO string
  trialTimezone: string;
  className?: string;
}

export const EntryDeadlineIndicator: React.FC<EntryDeadlineIndicatorProps> = ({
  trialDate,
  trialTimezone,
  className = ""
}) => {
  const now = new Date();
  const entryDeadline = calculateEntryDeadline(trialDate, trialTimezone);
  const lateEntryDeadline = calculateLateEntryDeadline(entryDeadline, trialTimezone);
  
  const entriesOpen = now < entryDeadline;
  const lateEntriesOpen = now >= entryDeadline && now < lateEntryDeadline;
  const entriesClosed = now >= lateEntryDeadline;
  
  const formatDeadline = (date: Date) => 
    formatDateForDisplay(date.toISOString(), trialTimezone, 'MMM dd, yyyy h:mm a zzz');
  
  if (entriesOpen) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Entries Open</strong> - Deadline: {formatDeadline(entryDeadline)}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (lateEntriesOpen) {
    return (
      <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Late Entries Only</strong> - Final deadline: {formatDeadline(lateEntryDeadline)}
          <br />
          <span className="text-sm">Additional late fees may apply</span>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <XCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <strong>Entries Closed</strong> - Deadline passed: {formatDeadline(lateEntryDeadline)}
      </AlertDescription>
    </Alert>
  );
};