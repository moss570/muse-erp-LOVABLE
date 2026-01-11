import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { Calendar, Lock, Unlock, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight, FileText, Package, Receipt, Factory } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useAccountingPeriods, usePeriodCloseItems } from '@/hooks/useFinancialSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PERIOD_TYPES = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
];

export default function PeriodClose() {
  const { periods, isLoading, createPeriod, closePeriod, reopenPeriod } = useAccountingPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const { closeItems } = usePeriodCloseItems(selectedPeriod?.id);

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newPeriodType, setNewPeriodType] = useState('month');
  const [newPeriodDate, setNewPeriodDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleClosePeriod = () => {
    if (selectedPeriod) {
      closePeriod.mutate({ id: selectedPeriod.id, notes: closeNotes });
      setCloseDialogOpen(false);
      setCloseNotes('');
    }
  };

  const handleReopenPeriod = () => {
    if (selectedPeriod) {
      reopenPeriod.mutate(selectedPeriod.id);
      setReopenDialogOpen(false);
    }
  };

  const handleCreatePeriod = () => {
    createPeriod.mutate({ period_date: newPeriodDate, period_type: newPeriodType });
    setCreateDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Open</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending Review</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'po':
        return <FileText className="h-4 w-4" />;
      case 'invoice':
        return <Receipt className="h-4 w-4" />;
      case 'receiving':
        return <Package className="h-4 w-4" />;
      case 'production':
        return <Factory className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Calendar view data
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getPeriodForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return periods?.find((p) => p.period_date === dateStr && p.period_type === 'day');
  };

  const monthPeriod = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM-01');
    return periods?.find((p) => p.period_date === monthStr && p.period_type === 'month');
  }, [periods, currentMonth]);

  const openPeriods = periods?.filter((p) => p.status === 'open').length ?? 0;
  const closedPeriods = periods?.filter((p) => p.status === 'closed').length ?? 0;

  return (
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Period Close" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Period Close</h1>
          <p className="text-muted-foreground">Manage accounting periods and close procedures</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Calendar className="mr-2 h-4 w-4" /> Create Period
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
            <Unlock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Closed Periods</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closeItems?.filter((i) => !i.is_resolved).length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(currentMonth, 'MMM yyyy')}</div>
            {monthPeriod && getStatusBadge(monthPeriod.status)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list">
            <FileText className="mr-2 h-4 w-4" />
            Period List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const period = getPeriodForDate(day);
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 text-center border rounded-md ${
                        isCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
                      } ${period?.status === 'closed' ? 'bg-muted' : ''}`}
                    >
                      <div className="text-sm">{format(day, 'd')}</div>
                      {period && (
                        <div className="mt-1">
                          {period.status === 'closed' ? (
                            <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                          ) : (
                            <Unlock className="h-3 w-3 mx-auto text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounting Periods</CardTitle>
              <CardDescription>All periods with their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Closed At</TableHead>
                    <TableHead>Closed By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : periods?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No periods configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods?.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">
                          {format(new Date(period.period_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="capitalize">{period.period_type}</TableCell>
                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {period.closed_at ? format(new Date(period.closed_at), 'MMM d, yyyy h:mm a') : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {period.closed_by_profile
                            ? `${period.closed_by_profile.first_name} ${period.closed_by_profile.last_name}`
                            : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {period.notes || '—'}
                        </TableCell>
                        <TableCell>
                          {period.status === 'open' || period.status === 'pending' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setCloseDialogOpen(true);
                              }}
                            >
                              <Lock className="mr-2 h-3 w-3" /> Close
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setReopenDialogOpen(true);
                              }}
                            >
                              <Unlock className="mr-2 h-3 w-3" /> Reopen
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Incomplete Items Section */}
      {selectedPeriod && closeItems && closeItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Incomplete Items for {format(new Date(selectedPeriod.period_date), 'MMM d, yyyy')}
            </CardTitle>
            <CardDescription>Items that need attention before closing</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closeItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getItemTypeIcon(item.item_type)}
                        <span className="capitalize">{item.item_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{item.item_reference || item.item_id}</TableCell>
                    <TableCell>{item.issue_description}</TableCell>
                    <TableCell>
                      {item.is_resolved ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" /> Resolved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Accounting Period</DialogTitle>
            <DialogDescription>Create a new accounting period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period_type">Period Type</Label>
              <Select value={newPeriodType} onValueChange={setNewPeriodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_date">Period Date</Label>
              <input
                type="date"
                id="period_date"
                value={newPeriodDate}
                onChange={(e) => setNewPeriodDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>Create Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Period Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Period</DialogTitle>
            <DialogDescription>
              This will lock the period and prevent further edits to transactions within this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="close_notes">Closing Notes (optional)</Label>
              <Textarea
                id="close_notes"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Any notes about this period close..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClosePeriod}>
              <Lock className="mr-2 h-4 w-4" /> Close Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Period Confirmation */}
      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reopen this period? This will allow edits to transactions within this period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenPeriod}>Reopen Period</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
