import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Printer, Download } from 'lucide-react';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface PrintScheduleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: any[];
  employees: any[];
  dateRange: Date[];
}

export function PrintSchedule({ open, onOpenChange, shifts, employees, dateRange }: PrintScheduleProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useCompanySettings();

  const dateStrings = dateRange.map(d => format(d, 'yyyy-MM-dd'));
  const shiftsInRange = shifts?.filter(s => dateStrings.includes(s.shift_date)) || [];

  // Group shifts by employee
  const scheduleByEmployee = employees?.map(emp => {
    const empShifts = shiftsInRange.filter(s => s.employee_id === emp.id);
    const shiftsByDate: Record<string, any> = {};
    
    empShifts.forEach(shift => {
      shiftsByDate[shift.shift_date] = shift;
    });

    const totalHours = empShifts.reduce((sum, s) => {
      const startH = parseInt(s.start_time?.split(':')[0] || '0');
      const startM = parseInt(s.start_time?.split(':')[1] || '0');
      const endH = parseInt(s.end_time?.split(':')[0] || '0');
      const endM = parseInt(s.end_time?.split(':')[1] || '0');
      return sum + ((endH * 60 + endM) - (startH * 60 + startM) - (s.break_minutes || 0)) / 60;
    }, 0);

    return {
      employee: emp,
      shiftsByDate,
      totalHours,
    };
  }).filter(e => Object.keys(e.shiftsByDate).length > 0) || [];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Schedule - ${format(dateRange[0], 'MMM d')} to ${format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .header { margin-bottom: 20px; }
            .company-name { font-size: 18px; font-weight: bold; }
            .date-range { color: #666; margin-top: 4px; }
            .total { font-weight: 600; }
            @media print {
              body { padding: 0; }
              @page { margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = ['Employee', ...dateRange.map(d => format(d, 'EEE M/d')), 'Total Hours'];
    const rows = scheduleByEmployee.map(({ employee, shiftsByDate, totalHours }) => {
      const row = [
        `${employee.first_name} ${employee.last_name}`,
        ...dateRange.map(date => {
          const shift = shiftsByDate[format(date, 'yyyy-MM-dd')];
          if (!shift) return '';
          return `${shift.start_time?.slice(0, 5)}-${shift.end_time?.slice(0, 5)}`;
        }),
        totalHours.toFixed(1),
      ];
      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `schedule-${format(dateRange[0], 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print / Export Schedule</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-4">
          <div className="header">
            <div className="company-name">{settings?.company_name || 'Company Schedule'}</div>
            <div className="date-range">
              {format(dateRange[0], 'MMMM d')} - {format(dateRange[dateRange.length - 1], 'MMMM d, yyyy')}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Employee</TableHead>
                {dateRange.map(date => (
                  <TableHead key={date.toISOString()} className="text-center min-w-[80px]">
                    <div>{format(date, 'EEE')}</div>
                    <div className="text-xs font-normal">{format(date, 'M/d')}</div>
                  </TableHead>
                ))}
                <TableHead className="text-right w-[80px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduleByEmployee.map(({ employee, shiftsByDate, totalHours }) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </TableCell>
                  {dateRange.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const shift = shiftsByDate[dateStr];
                    return (
                      <TableCell key={dateStr} className="text-center text-xs">
                        {shift ? (
                          <div>
                            <div>{shift.start_time?.slice(0, 5)}</div>
                            <div className="text-muted-foreground">{shift.end_time?.slice(0, 5)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-medium">
                    {totalHours.toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))}
              {scheduleByEmployee.length === 0 && (
                <TableRow>
                  <TableCell colSpan={dateRange.length + 2} className="text-center text-muted-foreground py-8">
                    No shifts scheduled for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
