import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Palmtree } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface TimeOffOverlayProps {
  timeOffRequests: any[];
  date: Date;
}

export function TimeOffOverlay({ timeOffRequests, date }: TimeOffOverlayProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const employeesOnTimeOff = useMemo(() => {
    return timeOffRequests?.filter(request => {
      const startDate = parseISO(request.start_date);
      const endDate = parseISO(request.end_date);
      return isWithinInterval(date, { start: startDate, end: endDate });
    }) || [];
  }, [timeOffRequests, date]);

  if (employeesOnTimeOff.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 mb-1">
        {employeesOnTimeOff.map((request) => (
          <Tooltip key={request.id}>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="text-[10px] py-0 px-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              >
                <Palmtree className="h-2.5 w-2.5 mr-0.5" />
                {request.employee?.first_name?.charAt(0)}{request.employee?.last_name?.charAt(0)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">
                  {request.employee?.first_name} {request.employee?.last_name}
                </p>
                <p className="text-muted-foreground">
                  {request.time_off_type} ({format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d')})
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
