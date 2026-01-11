import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface OvertimeWarningsProps {
  shifts: any[];
  employees: any[];
  currentDate: Date;
  overtimeThreshold?: number; // hours per week, default 40
}

export function OvertimeWarnings({ 
  shifts, 
  employees, 
  currentDate,
  overtimeThreshold = 40 
}: OvertimeWarningsProps) {
  const warnings = useMemo(() => {
    // Get current week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const weekDateStrings = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    // Calculate hours per employee for the week
    const employeeHours: Record<string, { hours: number; name: string; overtime: number }> = {};

    shifts?.forEach(shift => {
      if (!weekDateStrings.includes(shift.shift_date)) return;

      const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
      const startMin = parseInt(shift.start_time?.split(':')[1] || '0');
      const endHour = parseInt(shift.end_time?.split(':')[0] || '0');
      const endMin = parseInt(shift.end_time?.split(':')[1] || '0');
      
      const totalMins = (endHour * 60 + endMin) - (startHour * 60 + startMin) - (shift.break_minutes || 0);
      const hours = totalMins / 60;

      if (!employeeHours[shift.employee_id]) {
        const emp = employees?.find(e => e.id === shift.employee_id);
        employeeHours[shift.employee_id] = {
          hours: 0,
          name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
          overtime: 0,
        };
      }
      employeeHours[shift.employee_id].hours += hours;
    });

    // Calculate overtime and create warnings
    const overtimeWarnings: { employeeId: string; name: string; hours: number; overtime: number }[] = [];

    Object.entries(employeeHours).forEach(([empId, data]) => {
      if (data.hours > overtimeThreshold) {
        overtimeWarnings.push({
          employeeId: empId,
          name: data.name,
          hours: data.hours,
          overtime: data.hours - overtimeThreshold,
        });
      }
    });

    // Sort by overtime hours descending
    return overtimeWarnings.sort((a, b) => b.overtime - a.overtime);
  }, [shifts, employees, currentDate, overtimeThreshold]);

  if (warnings.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Overtime Alert</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {warnings.length} employee{warnings.length > 1 ? 's' : ''} scheduled for overtime (&gt;{overtimeThreshold}h/week):
          </p>
          <div className="flex flex-wrap gap-2">
            {warnings.map((w) => (
              <Badge 
                key={w.employeeId} 
                variant="outline" 
                className="border-amber-500 text-amber-800 dark:text-amber-200"
              >
                <Clock className="h-3 w-3 mr-1" />
                {w.name}: {w.hours.toFixed(1)}h (+{w.overtime.toFixed(1)}h OT)
              </Badge>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
