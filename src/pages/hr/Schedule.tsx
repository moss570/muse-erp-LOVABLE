import { useState, useMemo, useEffect } from 'react';
import { useEmployees, useEmployeeShifts } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  DollarSign,
  Droplets,
  Clock,
  Users,
  Settings,
  Pencil,
  Copy,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { ShiftFormDialog } from '@/components/hr/ShiftFormDialog';
import { ScheduleSettings } from '@/components/hr/ScheduleSettings';
import { cn } from '@/lib/utils';

type ViewType = 'day' | 'week' | 'month';


interface ShiftCardProps {
  shift: any;
  employee: any;
  isDragging?: boolean;
  onEdit?: () => void;
  dragHandleProps?: any;
}

function ShiftCard({ shift, employee, isDragging, onEdit, dragHandleProps }: ShiftCardProps) {
  const startTime = shift.start_time?.slice(0, 5) || '00:00';
  const endTime = shift.end_time?.slice(0, 5) || '00:00';
  
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  const hours = endHour - startHour - (shift.break_minutes || 0) / 60;
  
  return (
    <div
      className={cn(
        "p-2 rounded-md text-xs transition-all group relative",
        "bg-primary/10 border border-primary/20 hover:bg-primary/20",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
      style={{ backgroundColor: shift.color ? `${shift.color}20` : undefined }}
    >
      <div className="flex items-start gap-1">
        {/* Drag handle */}
        <div 
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
          title="Drag to move"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="2" />
            <circle cx="15" cy="6" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="18" r="2" />
            <circle cx="15" cy="18" r="2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {employee?.first_name} {employee?.last_name?.charAt(0)}.
          </div>
          <div className="text-muted-foreground">
            {startTime} - {endTime}
          </div>
          <div className="text-muted-foreground">
            {hours.toFixed(1)}h
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded hover:bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit shift"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DraggableShift({ shift, employee, onEdit }: { shift: any; employee: any; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shift.id,
    data: { shift, employee }
  });

  return (
    <div ref={setNodeRef} {...attributes}>
      <ShiftCard 
        shift={shift} 
        employee={employee} 
        isDragging={isDragging} 
        onEdit={onEdit}
        dragHandleProps={listeners}
      />
    </div>
  );
}

function DroppableCell({ date, children }: { date: Date; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd')
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] p-1 space-y-1 border-r border-b transition-colors",
        isOver && "bg-primary/5"
      )}
    >
      {children}
    </div>
  );
}

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('week');
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [laborCostPerGallon, setLaborCostPerGallon] = useState(2.50);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('schedule_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.labor_cost_per_gallon) {
          setLaborCostPerGallon(parsed.labor_cost_per_gallon);
        }
      } catch (e) {
        console.error('Failed to parse saved settings');
      }
    }
  }, [settingsOpen]); // Re-read when settings dialog closes
  
  const { employees } = useEmployees();
  const { shifts, updateShift, createShift } = useEmployeeShifts();
  const { toast } = useToast();

  // Get date range based on view
  const dateRange = useMemo(() => {
    if (view === 'day') {
      return [currentDate];
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  // Navigation
  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'day') {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : addDays(prev, -1));
    } else if (view === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Calculate salary employees' daily cost (assuming 52 weeks, 5 days/week = 260 work days)
  const salaryCostData = useMemo(() => {
    const workDaysPerYear = 260;
    const hoursPerDay = 8;
    
    const salaryEmployees = employees?.filter(e => 
      e.pay_type === 'salary' && 
      e.salary_amount && 
      e.employment_status === 'active'
    ) || [];
    
    // Count work days in the date range (Mon-Fri)
    const workDaysInRange = dateRange.filter(d => {
      const day = d.getDay();
      return day !== 0 && day !== 6; // Exclude weekends
    }).length;
    
    let totalSalaryCost = 0;
    const employeeBreakdown = salaryEmployees.map(emp => {
      const dailyRate = (emp.salary_amount || 0) / workDaysPerYear;
      const cost = dailyRate * workDaysInRange;
      totalSalaryCost += cost;
      return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        type: 'salary' as const,
        annualSalary: emp.salary_amount || 0,
        dailyRate,
        days: workDaysInRange,
        cost,
      };
    });
    
    // Calculate equivalent hours for display
    const avgHourlyRate = salaryEmployees.length > 0
      ? salaryEmployees.reduce((sum, emp) => sum + ((emp.salary_amount || 0) / workDaysPerYear / hoursPerDay), 0) / salaryEmployees.length
      : 0;
    const equivalentHours = avgHourlyRate > 0 ? totalSalaryCost / avgHourlyRate : workDaysInRange * hoursPerDay * salaryEmployees.length;
    
    return { totalSalaryCost, salaryEmployeeCount: salaryEmployees.length, equivalentHours, employeeBreakdown, workDaysInRange };
  }, [employees, dateRange]);

  // Calculate payroll for the date range (hourly employees from shifts)
  const payrollData = useMemo(() => {
    let totalHours = 0;
    let totalCost = 0;
    let shiftsCount = 0;
    const employeeHours: Record<string, { hours: number; cost: number; rate: number }> = {};

    shifts?.forEach(shift => {
      const shiftDateStr = shift.shift_date;
      const isInRange = dateRange.some(d => format(d, 'yyyy-MM-dd') === shiftDateStr);
      
      if (isInRange) {
        const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
        const endHour = parseInt(shift.end_time?.split(':')[0] || '0');
        const hours = endHour - startHour - (shift.break_minutes || 0) / 60;
        
        const employee = employees?.find(e => e.id === shift.employee_id);
        const hourlyRate = employee?.hourly_rate || 15;
        
        totalHours += hours;
        totalCost += hours * hourlyRate;
        shiftsCount++;

        // Track per-employee
        if (!employeeHours[shift.employee_id]) {
          employeeHours[shift.employee_id] = { hours: 0, cost: 0, rate: hourlyRate };
        }
        employeeHours[shift.employee_id].hours += hours;
        employeeHours[shift.employee_id].cost += hours * hourlyRate;
      }
    });

    // Build hourly employee breakdown
    const employeeBreakdown = Object.entries(employeeHours).map(([empId, data]) => {
      const employee = employees?.find(e => e.id === empId);
      return {
        id: empId,
        name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
        type: 'hourly' as const,
        hours: data.hours,
        rate: data.rate,
        cost: data.cost,
      };
    });

    return { totalHours, totalCost, shiftsCount, employeeBreakdown };
  }, [shifts, employees, dateRange]);

  // Total labor cost including salary employees
  const totalLaborCost = payrollData.totalCost + salaryCostData.totalSalaryCost;

  // Calculate gallons needed based on labor cost setting (includes salary employees)
  const gallonsNeeded = laborCostPerGallon > 0 ? totalLaborCost / laborCostPerGallon : 0;

  // Get shifts for a specific date - compare date strings to avoid timezone issues
  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts?.filter(shift => shift.shift_date === dateStr) || [];
  };

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const shiftId = active.id as string;
    const newDate = over.id as string;
    const shift = active.data.current.shift;

    if (shift.shift_date !== newDate) {
      updateShift.mutate({
        id: shiftId,
        shift_date: newDate
      });
    }
  };

  const handleAddShift = (date?: Date) => {
    setSelectedShift(null);
    setSelectedDate(date || null);
    setShiftDialogOpen(true);
  };

  const handleEditShift = (shift: any) => {
    setSelectedShift(shift);
    setSelectedDate(null);
    setShiftDialogOpen(true);
  };

  // Copy today's shifts to the entire week
  const handleCopyToWeek = async () => {
    if (view !== 'week') {
      toast({ title: 'Please switch to week view first', variant: 'destructive' });
      return;
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayShifts = shifts?.filter(s => s.shift_date === todayStr) || [];

    if (todayShifts.length === 0) {
      toast({ title: 'No shifts today to copy', description: 'Add shifts for today first', variant: 'destructive' });
      return;
    }

    // Get other days in the week (excluding today)
    const otherDays = dateRange.filter(d => format(d, 'yyyy-MM-dd') !== todayStr);

    let createdCount = 0;
    for (const day of otherDays) {
      const dayStr = format(day, 'yyyy-MM-dd');
      // Check if day already has shifts
      const existingShifts = shifts?.filter(s => s.shift_date === dayStr) || [];
      
      if (existingShifts.length === 0) {
        // Copy each shift to this day
        for (const shift of todayShifts) {
          await createShift.mutateAsync({
            employee_id: shift.employee_id,
            shift_date: dayStr,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_minutes: shift.break_minutes,
            department_id: shift.department_id,
            job_position_id: shift.job_position_id,
            location_id: shift.location_id,
            color: shift.color,
            notes: shift.notes,
          });
          createdCount++;
        }
      }
    }

    if (createdCount > 0) {
      toast({ title: `Copied ${createdCount} shifts to the week` });
    } else {
      toast({ title: 'All days already have shifts', description: 'Clear existing shifts first to copy' });
    }
  };

  const activeShift = activeId ? shifts?.find(s => s.id === activeId) : null;
  const activeEmployee = activeShift ? employees?.find(e => e.id === activeShift.employee_id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage employee shifts and view labor costs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          {view === 'week' && (
            <Button variant="outline" onClick={handleCopyToWeek}>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Week
            </Button>
          )}
          <Button onClick={() => handleAddShift()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollData.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {payrollData.shiftsCount} shifts scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalLaborCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${payrollData.totalCost.toFixed(0)} hourly + ${salaryCostData.totalSalaryCost.toFixed(0)} salary
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setBreakdownOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gallons Target</CardTitle>
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3 text-muted-foreground" />
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gallonsNeeded.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              ${laborCostPerGallon}/gal • Click for details
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(shifts?.filter(s => 
                dateRange.some(d => s.shift_date === format(d, 'yyyy-MM-dd'))
              ).map(s => s.employee_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              of {employees?.length || 0} team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>Today</Button>
              <Button variant="outline" size="icon" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-2">
                {view === 'month' 
                  ? format(currentDate, 'MMMM yyyy')
                  : view === 'week'
                  ? `${format(dateRange[0], 'MMM d')} - ${format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}`
                  : format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h2>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Week/Day View */}
            {(view === 'week' || view === 'day') && (
              <div className="overflow-x-auto">
                <div className={cn(
                  "grid border-t",
                  view === 'day' ? "grid-cols-1" : "grid-cols-7"
                )} style={{ minWidth: view === 'week' ? '700px' : 'auto' }}>
                  {/* Header Row */}
                  {dateRange.map(date => (
                    <div 
                      key={date.toISOString()} 
                      className={cn(
                        "p-3 text-center border-r border-b bg-muted/50",
                        isSameDay(date, new Date()) && "bg-primary/10"
                      )}
                    >
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(date, 'EEE')}
                      </div>
                      <div className={cn(
                        "text-lg font-semibold",
                        isSameDay(date, new Date()) && "text-primary"
                      )}>
                        {format(date, 'd')}
                      </div>
                    </div>
                  ))}

                  {/* Shift Cells */}
                  {dateRange.map(date => {
                    const dayShifts = getShiftsForDate(date);
                    return (
                      <DroppableCell key={`cell-${date.toISOString()}`} date={date}>
                        {dayShifts.map(shift => {
                          const employee = employees?.find(e => e.id === shift.employee_id);
                          return (
                            <DraggableShift
                              key={shift.id}
                              shift={shift}
                              employee={employee}
                              onEdit={() => handleEditShift(shift)}
                            />
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleAddShift(date)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </DroppableCell>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month View */}
            {view === 'month' && (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 border-t" style={{ minWidth: '700px' }}>
                  {/* Day Headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase border-r border-b bg-muted/50">
                      {day}
                    </div>
                  ))}

                  {/* Calendar Grid */}
                  {(() => {
                    const monthStart = startOfMonth(currentDate);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
                    const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
                    
                    return days.map(date => {
                      const dayShifts = getShiftsForDate(date);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      
                      return (
                        <DroppableCell key={date.toISOString()} date={date}>
                          <div className={cn(
                            "text-xs font-medium mb-1",
                            !isCurrentMonth && "text-muted-foreground/50",
                            isSameDay(date, new Date()) && "text-primary"
                          )}>
                            {format(date, 'd')}
                          </div>
                          {dayShifts.slice(0, 2).map(shift => {
                            const employee = employees?.find(e => e.id === shift.employee_id);
                            return (
                              <DraggableShift
                                key={shift.id}
                                shift={shift}
                                employee={employee}
                                onEdit={() => handleEditShift(shift)}
                              />
                            );
                          })}
                          {dayShifts.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{dayShifts.length - 2} more
                            </Badge>
                          )}
                        </DroppableCell>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Drag Overlay */}
            <DragOverlay>
              {activeShift && activeEmployee && (
                <ShiftCard shift={activeShift} employee={activeEmployee} />
              )}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {/* Shift Form Dialog */}
      <ShiftFormDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        shift={selectedShift}
        defaultDate={selectedDate}
      />

      {/* Settings Dialog */}
      <ScheduleSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Gallons Target Breakdown Dialog */}
      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gallons Target Calculation Breakdown</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Labor Cost</div>
                  <div className="text-xl font-bold">${totalLaborCost.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Cost per Gallon</div>
                  <div className="text-xl font-bold">${laborCostPerGallon.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Gallons Needed</div>
                  <div className="text-xl font-bold text-primary">{gallonsNeeded.toFixed(0)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Hourly Employees */}
            {payrollData.employeeBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="secondary">Hourly</Badge>
                  Scheduled Employees
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.employeeBreakdown.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell className="text-right">{emp.hours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right">${emp.rate.toFixed(2)}/hr</TableCell>
                        <TableCell className="text-right font-medium">${emp.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-semibold">Subtotal</TableCell>
                      <TableCell className="text-right font-semibold">{payrollData.totalHours.toFixed(1)}h</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-semibold">${payrollData.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Salary Employees */}
            {salaryCostData.employeeBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Badge>Salary</Badge>
                  Salaried Employees
                  <span className="text-xs text-muted-foreground font-normal">
                    ({salaryCostData.workDaysInRange} work days in range)
                  </span>
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Annual Salary</TableHead>
                      <TableHead className="text-right">Daily Rate</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryCostData.employeeBreakdown.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell className="text-right">${emp.annualSalary.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${emp.dailyRate.toFixed(2)}/day</TableCell>
                        <TableCell className="text-right font-medium">${emp.cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-semibold">Subtotal</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-semibold">${salaryCostData.totalSalaryCost.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-2">
                  * Salary cost calculated as: Annual Salary ÷ 260 work days × {salaryCostData.workDaysInRange} days in current view
                </p>
              </div>
            )}

            {/* Formula */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <div className="font-medium mb-2">Calculation Formula:</div>
              <div className="font-mono text-xs space-y-1">
                <div>Gallons Target = Total Labor Cost ÷ Labor Cost per Gallon</div>
                <div className="text-muted-foreground">
                  {gallonsNeeded.toFixed(0)} = ${totalLaborCost.toFixed(2)} ÷ ${laborCostPerGallon.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
