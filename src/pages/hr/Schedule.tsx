import { useState, useMemo, useEffect } from 'react';
import { useEmployees, useEmployeeShifts } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  DollarSign,
  Droplets,
  Clock,
  Users,
  Settings,
  Pencil
} from 'lucide-react';
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
  const { shifts, updateShift } = useEmployeeShifts();

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

  // Calculate payroll for the date range
  const payrollData = useMemo(() => {
    let totalHours = 0;
    let totalCost = 0;
    let shiftsCount = 0;

    shifts?.forEach(shift => {
      const shiftDate = new Date(shift.shift_date);
      const isInRange = dateRange.some(d => isSameDay(d, shiftDate));
      
      if (isInRange) {
        const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
        const endHour = parseInt(shift.end_time?.split(':')[0] || '0');
        const hours = endHour - startHour - (shift.break_minutes || 0) / 60;
        
        const employee = employees?.find(e => e.id === shift.employee_id);
        const hourlyRate = employee?.hourly_rate || 15;
        
        totalHours += hours;
        totalCost += hours * hourlyRate;
        shiftsCount++;
      }
    });

    return { totalHours, totalCost, shiftsCount };
  }, [shifts, employees, dateRange]);

  // Calculate gallons needed based on labor cost setting
  const gallonsNeeded = laborCostPerGallon > 0 ? payrollData.totalCost / laborCostPerGallon : 0;

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
            <div className="text-2xl font-bold">${payrollData.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Avg ${(payrollData.totalCost / (payrollData.totalHours || 1)).toFixed(2)}/hr
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gallons Target</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gallonsNeeded.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              To meet ${laborCostPerGallon}/gal target
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
    </div>
  );
}
