import { useState } from 'react';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, ChevronRight, Clock, Check, X, Edit2, Eye, Calendar, Users, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  approval_status: string;
  approved_by: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
    department: { name: string } | null;
  };
}

export default function Timesheets() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch time entries for the week
  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['timesheets', format(weekStart, 'yyyy-MM-dd'), statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('employee_time_entries')
        .select(`
          *,
          employee:employees!employee_time_entries_employee_id_fkey(
            id,
            first_name,
            last_name,
            employee_number,
            department:departments(name)
          )
        `)
        .gte('clock_in', format(weekStart, 'yyyy-MM-dd'))
        .lte('clock_in', format(weekEnd, 'yyyy-MM-dd') + 'T23:59:59')
        .order('clock_in', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeEntry[];
    },
  });

  // Fetch employees for grouping
  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number, department:departments(name)')
        .eq('employment_status', 'active')
        .order('last_name');
      if (error) throw error;
      return data;
    },
  });

  // Approve entry mutation
  const approveEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('employee_time_entries')
        .update({ 
          approval_status: 'approved',
          approved_by: userData?.user?.id 
        })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Entry approved');
    },
    onError: () => toast.error('Failed to approve entry'),
  });

  // Reject entry mutation
  const rejectEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('employee_time_entries')
        .update({ 
          approval_status: 'rejected',
          approved_by: userData?.user?.id 
        })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Entry rejected');
    },
    onError: () => toast.error('Failed to reject entry'),
  });

  // Update entry mutation
  const updateEntry = useMutation({
    mutationFn: async ({ id, clock_in, clock_out, notes }: { id: string; clock_in: string; clock_out: string | null; notes: string }) => {
      const { error } = await supabase
        .from('employee_time_entries')
        .update({ 
          clock_in, 
          clock_out: clock_out || null,
          notes,
          approval_status: 'pending' // Reset to pending on edit
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Entry updated');
      setEditDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: () => toast.error('Failed to update entry'),
  });

  // Bulk approve
  const bulkApprove = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const pendingIds = timeEntries?.filter(e => e.approval_status === 'pending' && e.clock_out).map(e => e.id) || [];
      if (pendingIds.length === 0) return;
      
      const { error } = await supabase
        .from('employee_time_entries')
        .update({ 
          approval_status: 'approved',
          approved_by: userData?.user?.id 
        })
        .in('id', pendingIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('All completed entries approved');
    },
    onError: () => toast.error('Failed to approve entries'),
  });

  const openEditDialog = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditClockIn(entry.clock_in ? format(parseISO(entry.clock_in), "yyyy-MM-dd'T'HH:mm") : '');
    setEditClockOut(entry.clock_out ? format(parseISO(entry.clock_out), "yyyy-MM-dd'T'HH:mm") : '');
    setEditNotes(entry.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedEntry) return;
    updateEntry.mutate({
      id: selectedEntry.id,
      clock_in: new Date(editClockIn).toISOString(),
      clock_out: editClockOut ? new Date(editClockOut).toISOString() : null,
      notes: editNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const pendingCount = timeEntries?.filter(e => e.approval_status === 'pending' && e.clock_out).length || 0;
  const totalHours = timeEntries?.reduce((sum, e) => sum + (e.total_hours || 0), 0) || 0;

  // Group entries by employee for grid view
  const entriesByEmployee = new Map<string, TimeEntry[]>();
  timeEntries?.forEach(entry => {
    const empId = entry.employee_id;
    if (!entriesByEmployee.has(empId)) {
      entriesByEmployee.set(empId, []);
    }
    entriesByEmployee.get(empId)!.push(entry);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-muted-foreground">Review, edit, and approve employee time entries</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={() => bulkApprove.mutate()} disabled={bulkApprove.isPending}>
            {bulkApprove.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Approve All ({pendingCount})
          </Button>
        )}
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
              <div className="text-sm text-muted-foreground">
                Week of {format(weekStart, 'MMMM d')}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entriesByEmployee.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {timeEntries?.filter(e => e.approval_status === 'approved').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timesheet Views */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <CardDescription>Individual time clock entries for the selected week</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : !timeEntries?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time entries found for this week
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.employee?.first_name} {entry.employee?.last_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{entry.employee?.employee_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{format(parseISO(entry.clock_in), 'EEE, MMM d')}</TableCell>
                        <TableCell>{format(parseISO(entry.clock_in), 'h:mm a')}</TableCell>
                        <TableCell>
                          {entry.clock_out ? format(parseISO(entry.clock_out), 'h:mm a') : (
                            <span className="text-muted-foreground italic">Still clocked in</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.total_hours?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.approval_status)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditDialog(entry)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {entry.approval_status === 'pending' && entry.clock_out && (
                              <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-primary hover:text-primary"
                              onClick={() => approveEntry.mutate(entry.id)}
                              disabled={approveEntry.isPending}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={() => rejectEntry.mutate(entry.id)}
                                  disabled={rejectEntry.isPending}
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid View */}
        <TabsContent value="grid">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Grid</CardTitle>
              <CardDescription>Hours by employee for each day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Employee</TableHead>
                        {weekDays.map((day) => (
                          <TableHead key={day.toISOString()} className="text-center min-w-[80px]">
                            <div>{format(day, 'EEE')}</div>
                            <div className="text-xs text-muted-foreground">{format(day, 'M/d')}</div>
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees?.map((emp) => {
                        const empEntries = entriesByEmployee.get(emp.id) || [];
                        const weeklyTotal = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                        
                        if (empEntries.length === 0) return null;

                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {emp.first_name} {emp.last_name}
                            </TableCell>
                            {weekDays.map((day) => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const dayEntries = empEntries.filter(e => 
                                format(parseISO(e.clock_in), 'yyyy-MM-dd') === dayStr
                              );
                              const dayTotal = dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                              const hasPending = dayEntries.some(e => e.approval_status === 'pending');

                              return (
                                <TableCell key={dayStr} className="text-center">
                                  {dayTotal > 0 ? (
                                    <span className={hasPending ? 'text-warning font-medium' : ''}>
                                      {dayTotal.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-right font-bold">
                              {weeklyTotal.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Modify the clock in/out times for {selectedEntry?.employee?.first_name} {selectedEntry?.employee?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input 
                type="datetime-local" 
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input 
                type="datetime-local" 
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this time entry..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateEntry.isPending}>
              {updateEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
