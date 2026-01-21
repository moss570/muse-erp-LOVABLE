import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { format, addDays, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  DollarSign,
  Users,
  X,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmployeeSchedule {
  id: string;
  employee_id: string;
  schedule_date: string;
  shift_start_time: string;
  shift_end_time: string;
  scheduled_hours: number;
  hourly_rate: number;
  assigned_production_line_id: string | null;
  schedule_status: string;
  is_absent: boolean;
  absence_reason: string | null;
  production_line?: { line_name: string } | null;
  employee?: { first_name: string; last_name: string; email: string } | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  hourly_rate: number;
}

export default function EmployeeSchedulerPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "08:00",
    endTime: "16:00",
    hourlyRate: "18.00",
    lineId: "",
  });

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd")
  );

  // Get employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-scheduler"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employees") as any)
        .select("id, first_name, last_name, email, hourly_rate")
        .eq("status", "active")
        .order("last_name");
      if (error) throw error;
      return (data || []) as Employee[];
    },
  });

  // Get production lines
  const { data: productionLines = [] } = useQuery({
    queryKey: ["production-lines-emp-scheduler"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("production_lines") as any)
        .select("id, line_name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Get employee schedules for the week
  const { data: schedules = [] } = useQuery({
    queryKey: ["employee-schedules", weekDates[0], weekDates[6]],
    queryFn: async () => {
      const { data, error } = await (supabase.from("employee_schedules") as any)
        .select(`
          *,
          production_line:production_lines(line_name),
          employee:employees(first_name, last_name, email)
        `)
        .gte("schedule_date", weekDates[0])
        .lte("schedule_date", weekDates[6])
        .order("schedule_date");

      if (error) throw error;
      return (data || []) as EmployeeSchedule[];
    },
  });

  // Get labor requirements for warnings
  const { data: laborRequirements = {} } = useQuery({
    queryKey: ["labor-requirements", weekDates[0], weekDates[6]],
    queryFn: async () => {
      const requirements: Record<string, any> = {};

      for (const date of weekDates) {
        try {
          const { data } = await supabase.rpc("check_labor_balance", {
            p_date: date,
          });
          if (data) {
            requirements[date] = data;
          }
        } catch (e) {
          // Ignore individual errors
        }
      }

      return requirements;
    },
  });

  // Add shift mutation
  const addShiftMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(`2000-01-01T${shiftForm.startTime}`);
      const endDate = new Date(`2000-01-01T${shiftForm.endTime}`);
      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

      const { data: userData } = await supabase.auth.getUser();

      const { error } = await (supabase.from("employee_schedules") as any).insert({
        employee_id: shiftForm.employeeId,
        schedule_date: shiftForm.date,
        shift_start_time: shiftForm.startTime,
        shift_end_time: shiftForm.endTime,
        scheduled_hours: hours,
        hourly_rate: parseFloat(shiftForm.hourlyRate),
        assigned_production_line_id: shiftForm.lineId || null,
        schedule_status: "Scheduled",
        created_by: userData?.user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["labor-requirements"] });
      toast.success("Shift added successfully");
      setAddShiftOpen(false);
      setShiftForm({
        employeeId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "08:00",
        endTime: "16:00",
        hourlyRate: "18.00",
        lineId: "",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to add shift", { description: error.message });
    },
  });

  // Mark absence mutation
  const markAbsenceMutation = useMutation({
    mutationFn: async ({ scheduleId, reason }: { scheduleId: string; reason: string }) => {
      const { error } = await (supabase.from("employee_schedules") as any)
        .update({
          schedule_status: "Called Off",
          is_absent: true,
          absence_reason: reason,
        })
        .eq("id", scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["labor-requirements"] });
      toast.success("Absence marked");
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await (supabase.from("employee_schedules") as any)
        .delete()
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["labor-requirements"] });
      toast.success("Shift removed");
    },
  });

  const getScheduleForDateEmployee = (date: string, employeeId: string) => {
    return schedules.filter(
      (s) => s.schedule_date === date && s.employee_id === employeeId
    );
  };

  const getDailySummary = (date: string) => {
    const daySchedules = schedules.filter((s) => s.schedule_date === date && !s.is_absent);
    const totalHours = daySchedules.reduce((sum, s) => sum + (s.scheduled_hours || 0), 0);
    const totalCost = daySchedules.reduce(
      (sum, s) => sum + (s.scheduled_hours || 0) * (s.hourly_rate || 0),
      0
    );
    const requirements = laborRequirements[date];

    return {
      hours: totalHours,
      cost: totalCost,
      count: daySchedules.length,
      requirements,
    };
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Employee Scheduler
          </h1>
          <p className="text-muted-foreground">
            Manage employee schedules with production integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Daily Summary Bar */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const summary = getDailySummary(date);
          const isUnderStaffed = summary.requirements?.status === "UNDERSTAFFED";
          const isOverStaffed = summary.requirements?.status === "OVERSTAFFED";

          return (
            <Card
              key={date}
              className={cn(
                isUnderStaffed && "border-destructive bg-destructive/5",
                isOverStaffed && "border-orange-500 bg-orange-500/5"
              )}
            >
              <CardContent className="p-3">
                <p className="font-semibold text-sm mb-2">
                  {format(new Date(date), "EEE M/d")}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{summary.count} employees</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{summary.hours.toFixed(1)} hrs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>${summary.cost.toFixed(0)}</span>
                  </div>
                  {(isUnderStaffed || isOverStaffed) && (
                    <div className={cn(
                      "flex items-center gap-1 font-medium",
                      isUnderStaffed ? "text-destructive" : "text-orange-600"
                    )}>
                      <AlertTriangle className="h-3 w-3" />
                      <span>{summary.requirements?.status}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee Schedule Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Weekly Schedule</CardTitle>
            <Dialog open={addShiftOpen} onOpenChange={setAddShiftOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Employee Shift</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select
                      value={shiftForm.employeeId}
                      onValueChange={(value) => setShiftForm({ ...shiftForm, employeeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={shiftForm.date}
                      onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={shiftForm.startTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={shiftForm.endTime}
                        onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Hourly Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={shiftForm.hourlyRate}
                      onChange={(e) => setShiftForm({ ...shiftForm, hourlyRate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Production Line (Optional)</Label>
                    <Select
                      value={shiftForm.lineId}
                      onValueChange={(value) => setShiftForm({ ...shiftForm, lineId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {productionLines.map((line: any) => (
                          <SelectItem key={line.id} value={line.id}>
                            {line.line_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddShiftOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addShiftMutation.mutate()}
                    disabled={!shiftForm.employeeId || addShiftMutation.isPending}
                  >
                    Add Shift
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] sticky left-0 bg-background">Employee</TableHead>
                  {weekDates.map((date) => (
                    <TableHead key={date} className="min-w-[150px]">
                      {format(new Date(date), "EEE M/d")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No employees found. Add employees in the HR module.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium sticky left-0 bg-background">
                        {emp.first_name} {emp.last_name}
                      </TableCell>
                      {weekDates.map((date) => {
                        const shifts = getScheduleForDateEmployee(date, emp.id);
                        return (
                          <TableCell key={date} className="p-2">
                            {shifts.length === 0 ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              <div className="space-y-1">
                                {shifts.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className={cn(
                                      "p-2 rounded border text-xs",
                                      shift.is_absent
                                        ? "bg-destructive/10 border-destructive"
                                        : "bg-primary/10 border-primary"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">
                                        {shift.shift_start_time?.slice(0, 5)} - {shift.shift_end_time?.slice(0, 5)}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                        onClick={() => deleteShiftMutation.mutate(shift.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {shift.production_line?.line_name || "Unassigned"}
                                    </div>
                                    <div className="font-medium mt-1">
                                      ${((shift.scheduled_hours || 0) * (shift.hourly_rate || 0)).toFixed(2)}
                                    </div>
                                    {!shift.is_absent && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-1 h-6 text-xs w-full"
                                        onClick={() =>
                                          markAbsenceMutation.mutate({
                                            scheduleId: shift.id,
                                            reason: "Called off",
                                          })
                                        }
                                      >
                                        Mark Absent
                                      </Button>
                                    )}
                                    {shift.is_absent && (
                                      <Badge variant="destructive" className="mt-1 w-full justify-center">
                                        ABSENT
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Labor Warnings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Labor Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weekDates.map((date) => {
              const req = laborRequirements[date];
              if (!req || req.status === "BALANCED") return null;

              return (
                <div
                  key={date}
                  className={cn(
                    "p-3 rounded border",
                    req.status === "UNDERSTAFFED" 
                      ? "border-destructive bg-destructive/5" 
                      : "border-orange-500 bg-orange-500/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">
                        {format(new Date(date), "EEEE, MMMM d")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {req.warnings?.[0]}
                      </p>
                      {req.recommendation && (
                        <p className="text-sm font-medium mt-2">{req.recommendation}</p>
                      )}
                    </div>
                    <Badge
                      variant={req.status === "UNDERSTAFFED" ? "destructive" : "secondary"}
                    >
                      {req.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {!weekDates.some((date) => laborRequirements[date]?.status !== "BALANCED" && laborRequirements[date]) && (
              <p className="text-center text-muted-foreground py-4">
                No labor warnings for this week
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
