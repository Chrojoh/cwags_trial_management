// ============================================================================
// src/components/ui/timezone-status-badge.tsx
// PURPOSE: Status badge for entry windows
// ============================================================================
import { DollarSign, CheckCircle } from 'lucide-react';

interface TimezoneStatusBadgeProps {
  status: 'open' | 'late' | 'closed';
  lateFee?: number;
  className?: string;
}

export const TimezoneStatusBadge: React.FC<TimezoneStatusBadgeProps> = ({
  status,
  lateFee = 0,
  className = ""
}) => {
  switch (status) {
    case 'open':
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 ${className}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Entries Open
        </Badge>
      );
      
    case 'late':
      return (
        <Badge variant="secondary" className={`bg-yellow-100 text-yellow-800 ${className}`}>
          <Clock className="w-3 h-3 mr-1" />
          Late Entries
          {lateFee > 0 && (
            <>
              <DollarSign className="w-3 h-3 ml-1" />
              +${lateFee}
            </>
          )}
        </Badge>
      );
      
    case 'closed':
      return (
        <Badge variant="destructive" className={className}>
          <Clock className="w-3 h-3 mr-1" />
          Entries Closed
        </Badge>
      );
      
    default:
      return null;
  }
};