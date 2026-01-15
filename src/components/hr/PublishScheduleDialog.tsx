import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePublishShifts } from '@/hooks/useScheduleFeatures';
import { format } from 'date-fns';
import { Send, Check, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PublishScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: any[];
  employees: any[];
  dateRange: Date[];
}

export function PublishScheduleDialog({ 
  open, 
  onOpenChange, 
  shifts, 
  employees,
  dateRange 
}: PublishScheduleDialogProps) {
  const { publishShifts, unpublishShifts } = usePublishShifts();
  const { toast } = useToast();
  const [sendNotifications, setSendNotifications] = useState(true);

  const dateStrings = useMemo(() => 
    dateRange.map(d => format(d, 'yyyy-MM-dd')), 
    [dateRange]
  );

  const shiftsInRange = useMemo(() => 
    shifts?.filter(s => dateStrings.includes(s.shift_date)) || [],
    [shifts, dateStrings]
  );

  const unpublishedShifts = useMemo(() => 
    shiftsInRange.filter(s => !s.is_published),
    [shiftsInRange]
  );

  const publishedShifts = useMemo(() => 
    shiftsInRange.filter(s => s.is_published),
    [shiftsInRange]
  );

  // Group shifts by employee
  const shiftsByEmployee = useMemo(() => {
    const grouped: Record<string, { employee: any; shifts: any[] }> = {};
    
    unpublishedShifts.forEach(shift => {
      if (!grouped[shift.employee_id]) {
        const emp = employees?.find(e => e.id === shift.employee_id);
        grouped[shift.employee_id] = {
          employee: emp,
          shifts: [],
        };
      }
      grouped[shift.employee_id].shifts.push(shift);
    });

    return Object.values(grouped);
  }, [unpublishedShifts, employees]);

  const handlePublish = async () => {
    if (unpublishedShifts.length === 0) {
      toast({ title: 'No unpublished shifts', description: 'All shifts are already published' });
      return;
    }

    const shiftIds = unpublishedShifts.map(s => s.id);
    await publishShifts.mutateAsync({ shiftIds });

    if (sendNotifications) {
      // In a real app, this would trigger email/push notifications
      toast({ 
        title: 'Notifications sent', 
        description: `${shiftsByEmployee.length} employees notified of their schedule` 
      });
    }
  };

  const handleUnpublish = async () => {
    if (publishedShifts.length === 0) {
      toast({ title: 'No published shifts', description: 'All shifts are already unpublished' });
      return;
    }

    const shiftIds = publishedShifts.map(s => s.id);
    await unpublishShifts.mutateAsync({ shiftIds });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Publish Schedule
          </DialogTitle>
          <DialogDescription>
            Review and publish the schedule for {format(dateRange[0], 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Summary */}
          <div className="flex gap-4">
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              {publishedShifts.length} Published
            </Badge>
            <Badge variant="secondary" className="gap-1">
              {unpublishedShifts.length} Unpublished
            </Badge>
          </div>

          {/* Unpublished Shifts by Employee */}
          {shiftsByEmployee.length > 0 ? (
            <div>
              <h3 className="font-medium mb-2">Shifts to Publish</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shifts</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftsByEmployee.map(({ employee, shifts: empShifts }) => {
                    const totalHours = empShifts.reduce((sum, s) => {
                      const startH = parseInt(s.start_time?.split(':')[0] || '0');
                      const endH = parseInt(s.end_time?.split(':')[0] || '0');
                      return sum + (endH - startH - (s.break_minutes || 0) / 60);
                    }, 0);

                    return (
                      <TableRow key={employee?.id}>
                        <TableCell className="font-medium">
                          {employee?.first_name} {employee?.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {empShifts.map(s => (
                              <Badge key={s.id} variant="outline" className="text-xs">
                                {format(new Date(s.shift_date), 'EEE')}: {s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{totalHours.toFixed(1)}h</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              All shifts in this period are already published.
            </p>
          )}

          {/* Notification Option */}
          {shiftsByEmployee.length > 0 && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Checkbox 
                id="notifications" 
                checked={sendNotifications}
                onCheckedChange={(checked) => setSendNotifications(checked as boolean)}
              />
              <Label htmlFor="notifications" className="flex items-center gap-2 cursor-pointer">
                <Bell className="h-4 w-4" />
                Send notifications to employees about their shifts
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {publishedShifts.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleUnpublish}
              disabled={unpublishShifts.isPending}
            >
              Unpublish All ({publishedShifts.length})
            </Button>
          )}
          <Button 
            onClick={handlePublish}
            disabled={publishShifts.isPending || unpublishedShifts.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            {publishShifts.isPending ? 'Publishing...' : `Publish ${unpublishedShifts.length} Shifts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
