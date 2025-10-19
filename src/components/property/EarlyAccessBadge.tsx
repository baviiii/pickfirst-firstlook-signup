import { Badge } from '@/components/ui/badge';
import { Clock, Crown } from 'lucide-react';

interface EarlyAccessBadgeProps {
  earlyAccessUntil?: string;
  className?: string;
}

export const EarlyAccessBadge = ({ earlyAccessUntil, className = "" }: EarlyAccessBadgeProps) => {
  if (!earlyAccessUntil) return null;

  const earlyAccessDate = new Date(earlyAccessUntil);
  const now = new Date();
  const isEarlyAccess = now < earlyAccessDate;

  if (!isEarlyAccess) return null;

  const hoursLeft = Math.ceil((earlyAccessDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Badge className={`bg-yellow-400 text-black border-0 ${className}`}>
      <Clock className="w-3 h-3 mr-1" />
      Early Access
      <span className="ml-1 font-semibold">
        {hoursLeft}h left
      </span>
    </Badge>
  );
};
