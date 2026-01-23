import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, getDay } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Users, DollarSign, Calendar, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDailyProductionTargets, DailyCostBreakdown } from '@/hooks/useDailyProductionTargets';

export default function DailyProductionTargets() {
  const navigate = useNavigate();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyDefaultTarget, setWeeklyDefaultTarget] = useState('');
  const [editingDay, setEditingDay] = useState<DailyCostBreakdown | null>(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');

  const {
    isLoading,
    getDailyBreakdowns,
    getTotals,
    upsertTarget,
    setWeeklyTargets,
    copyFromLastWeek,
    autoRollover,
    toggleAutoRollover,
    isAutoRolloverPending,
    calculateDailyCosts,
  } = useDailyProductionTargets(startDateStr, endDateStr);

  const dailyBreakdowns = useMemo(() => getDailyBreakdowns(), [getDailyBreakdowns]);
  const totals = useMemo(() => getTotals(), [getTotals]);

  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: currentWeekStart, end: weekEnd }),
    [currentWeekStart, weekEnd]
  );

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const handleSetWeeklyDefault = () => {
    const target = parseFloat(weeklyDefaultTarget);
    if (isNaN(target) || target <= 0) return;

    // Explicitly filter for Monday(1) through Friday(5) only
    // Use date-fns getDay which handles timezone correctly
    const weekdayDates = weekDays
      .filter(d => {
        const dayOfWeek = getDay(d); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        console.log('Day:', format(d, 'EEE yyyy-MM-dd'), 'dayOfWeek:', dayOfWeek);
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      })
      .map(d => format(d, 'yyyy-MM-dd'));

    console.log('Weekday dates to update:', weekdayDates);
    setWeeklyTargets.mutate({ dates: weekdayDates, target_quantity: target });
    setWeeklyDefaultTarget('');
  };

  const handleCopyLastWeek = () => {
    copyFromLastWeek.mutate(startDateStr);
  };

  const openEditDialog = (breakdown: DailyCostBreakdown) => {
    setEditingDay(breakdown);
    setEditTargetValue(breakdown.targetGallons > 0 ? breakdown.targetGallons.toString() : '');
    setEditNotes(breakdown.notes || '');
  };

  const handleSaveTarget = () => {
    if (!editingDay) return;
    const target = parseFloat(editTargetValue);
    if (isNaN(target) || target < 0) return;

    upsertTarget.mutate({
      target_date: editingDay.date,
      target_quantity: target,
      notes: editNotes || undefined,
    });
    setEditingDay(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDecimal = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Get the breakdown for the edit dialog with fresh calculation
  const editBreakdown = useMemo(() => {
    if (!editingDay) return null;
    const target = parseFloat(editTargetValue) || 0;
    // Use the already-fetched base breakdown and recalculate cost per gallon
    const baseBreakdown = dailyBreakdowns.find(b => b.date === editingDay.date);
    if (!baseBreakdown) return null;
    
    // Update cost per gallon calculations based on edited target
    const hourlyCostPerGallon = target > 0 ? baseBreakdown.hourlyLaborCost / target : 0;
    const overheadCostPerGallon = target > 0 ? baseBreakdown.overheadTotal / target : 0;
    const totalCostPerGallon = hourlyCostPerGallon + overheadCostPerGallon;
    
    return {
      ...baseBreakdown,
      targetGallons: target,
      hourlyCostPerGallon,
      overheadCostPerGallon,
      totalCostPerGallon,
    };
  }, [editingDay, editTargetValue, dailyBreakdowns]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Production Targets</h1>
          <p className="text-muted-foreground">
            Set minimum production goals and track cost per gallon
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monthly Fixed Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalMonthlyFixed)}/mo</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totals.dailyFixed)}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Salaried Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.salaryEmployeeCount} employees</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totals.dailySalary)}/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Daily Overhead (Salary+Fixed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.dailyOverhead)}/day</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {totals.workDaysPerMonth} work days/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[220px] text-center">
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Daily Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="text-right">Target (gal)</TableHead>
                <TableHead className="text-right">Hourly Labor</TableHead>
                <TableHead className="text-right">Overhead</TableHead>
                <TableHead className="text-right">Hourly $/Gal</TableHead>
                <TableHead className="text-right">Overhead $/Gal</TableHead>
                <TableHead className="text-right">Total $/Gal</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyBreakdowns.map((breakdown) => {
                const date = new Date(breakdown.date);
                const dayOfWeek = getDay(date);
                const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
                
                return (
                  <TableRow 
                    key={breakdown.date} 
                    className={isWeekendDay ? 'bg-muted/30' : ''}
                  >
                    <TableCell className="font-medium">
                      {format(date, 'EEE M/d')}
                    </TableCell>
                    <TableCell className="text-right">
                      {breakdown.targetGallons > 0 ? breakdown.targetGallons.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {breakdown.hourlyLaborCost > 0 ? formatCurrency(breakdown.hourlyLaborCost) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {breakdown.overheadTotal > 0 ? formatCurrency(breakdown.overheadTotal) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {breakdown.hourlyCostPerGallon > 0 
                        ? formatCurrencyDecimal(breakdown.hourlyCostPerGallon) 
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {breakdown.overheadCostPerGallon > 0 
                        ? formatCurrencyDecimal(breakdown.overheadCostPerGallon) 
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {breakdown.totalCostPerGallon > 0 
                        ? formatCurrencyDecimal(breakdown.totalCostPerGallon) 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(breakdown)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="weekly-default" className="whitespace-nowrap">
                Set weekday default:
              </Label>
              <Input
                id="weekly-default"
                type="number"
                placeholder="e.g. 600"
                value={weeklyDefaultTarget}
                onChange={(e) => setWeeklyDefaultTarget(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">gal</span>
              <Button 
                onClick={handleSetWeeklyDefault}
                disabled={!weeklyDefaultTarget || setWeeklyTargets.isPending}
              >
                Apply
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleCopyLastWeek}
              disabled={copyFromLastWeek.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Last Week's Targets
            </Button>
          </div>

          {/* Auto-Rollover Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="auto-rollover" className="text-sm font-medium cursor-pointer">
                  Auto-Rollover Weekly Targets
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, this week's targets will automatically copy to future weeks
                </p>
              </div>
            </div>
            <Switch
              id="auto-rollover"
              checked={autoRollover}
              onCheckedChange={(checked) => toggleAutoRollover.mutate(checked)}
              disabled={isAutoRolloverPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Edit Target Dialog */}
      <Dialog open={!!editingDay} onOpenChange={(open) => !open && setEditingDay(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Set Production Target - {editingDay && format(new Date(editingDay.date), 'EEE, MMM d')}
            </DialogTitle>
            <DialogDescription>
              Set the target quantity and view the cost breakdown
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Target Input */}
            <div className="space-y-2">
              <Label htmlFor="target-quantity">Target Quantity</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="target-quantity"
                  type="number"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(e.target.value)}
                  placeholder="e.g. 600"
                  className="w-40"
                />
                <span className="text-sm text-muted-foreground">gallons</span>
              </div>
            </div>

            {editBreakdown && (
              <>
                {/* Hourly Labor Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Hourly Labor (Variable Cost)
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    {editBreakdown.hourlyLaborDetails.length > 0 ? (
                      <>
                        {editBreakdown.hourlyLaborDetails.map((detail, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{detail.name} ({detail.hours.toFixed(1)}h × {formatCurrencyDecimal(detail.rate)}/hr)</span>
                            <span>{formatCurrency(detail.total)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                          <span>Subtotal</span>
                          <span>{formatCurrency(editBreakdown.hourlyLaborCost)}</span>
                        </div>
                        <div className="flex justify-between text-primary font-semibold">
                          <span>HOURLY COST PER GALLON</span>
                          <span>{formatCurrencyDecimal(editBreakdown.hourlyCostPerGallon)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hourly shifts scheduled</p>
                    )}
                  </div>
                </div>

                {/* Overhead Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Overhead (Fixed Burden)
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                    {/* Salary Employees */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Salaried Staff (daily portion)</p>
                      {editBreakdown.salaryDetails.length > 0 ? (
                        editBreakdown.salaryDetails.map((detail, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{detail.name} ({formatCurrency(detail.annualSalary)}/yr ÷ 260)</span>
                            <span>{formatCurrencyDecimal(detail.dailyPortion)}/day</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No salaried employees</p>
                      )}
                      <div className="text-sm font-medium mt-1">
                        Salary Subtotal: {formatCurrency(editBreakdown.salaryPortion)}
                      </div>
                    </div>

                    {/* Fixed Costs */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Fixed Costs (daily portion)</p>
                      {editBreakdown.fixedCostDetails.length > 0 ? (
                        editBreakdown.fixedCostDetails.map((detail, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{detail.name} ({formatCurrency(detail.monthlyAmount)}/mo ÷ {totals.workDaysPerMonth})</span>
                            <span>{formatCurrencyDecimal(detail.dailyPortion)}/day</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No fixed costs configured</p>
                      )}
                      <div className="text-sm font-medium mt-1">
                        Fixed Subtotal: {formatCurrency(editBreakdown.fixedCostPortion)}
                      </div>
                    </div>

                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Overhead Total</span>
                        <span>{formatCurrency(editBreakdown.overheadTotal)}</span>
                      </div>
                      <div className="flex justify-between text-primary font-semibold">
                        <span>OVERHEAD COST PER GALLON</span>
                        <span>{formatCurrencyDecimal(editBreakdown.overheadCostPerGallon)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Combined Total */}
                <div className="bg-primary/10 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span>COMBINED TOTAL</span>
                    <span>{formatCurrency(editBreakdown.totalDailyCost)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-primary">
                    <span>TOTAL COST PER GALLON</span>
                    <span>{formatCurrencyDecimal(editBreakdown.totalCostPerGallon)}</span>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any notes for this day..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDay(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTarget}
              disabled={upsertTarget.isPending}
            >
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
