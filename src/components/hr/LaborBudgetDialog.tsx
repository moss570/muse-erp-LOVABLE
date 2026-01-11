import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLaborBudgets } from '@/hooks/useScheduleFeatures';
import { format } from 'date-fns';
import { DollarSign, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LaborBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: Date[];
  actualCost: number;
  actualHours: number;
}

export function LaborBudgetDialog({ 
  open, 
  onOpenChange, 
  dateRange,
  actualCost,
  actualHours,
}: LaborBudgetDialogProps) {
  const startDate = format(dateRange[0], 'yyyy-MM-dd');
  const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');
  
  const { budgets, upsertBudget, isLoading } = useLaborBudgets(startDate, endDate);
  
  const [formData, setFormData] = useState({
    budget_hours: '',
    budget_amount: '',
    target_gallons: '',
  });

  // Calculate budget for the period
  const periodBudget = useMemo(() => {
    if (!budgets || budgets.length === 0) return null;
    
    const totalHours = budgets.reduce((sum, b) => sum + (Number(b.budget_hours) || 0), 0);
    const totalAmount = budgets.reduce((sum, b) => sum + (Number(b.budget_amount) || 0), 0);
    const totalGallons = budgets.reduce((sum, b) => sum + (Number(b.target_gallons) || 0), 0);
    
    return {
      hours: totalHours,
      amount: totalAmount,
      gallons: totalGallons,
    };
  }, [budgets]);

  // Load existing budget for editing
  useEffect(() => {
    if (budgets && budgets.length > 0) {
      // Sum up the budgets for the period for display
      const avgHours = periodBudget?.hours ? (periodBudget.hours / dateRange.length).toFixed(1) : '';
      const avgAmount = periodBudget?.amount ? (periodBudget.amount / dateRange.length).toFixed(2) : '';
      const avgGallons = periodBudget?.gallons ? (periodBudget.gallons / dateRange.length).toFixed(0) : '';
      
      setFormData({
        budget_hours: avgHours,
        budget_amount: avgAmount,
        target_gallons: avgGallons,
      });
    }
  }, [budgets, periodBudget, dateRange.length]);

  const handleSaveBudget = async () => {
    // Save budget for each day in the range
    for (const date of dateRange) {
      await upsertBudget.mutateAsync({
        budget_date: format(date, 'yyyy-MM-dd'),
        budget_hours: formData.budget_hours ? parseFloat(formData.budget_hours) : null,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
        target_gallons: formData.target_gallons ? parseFloat(formData.target_gallons) : null,
        department_id: null,
      });
    }
  };

  const calculateVariance = (actual: number, budget: number) => {
    if (!budget) return 0;
    return ((actual - budget) / budget) * 100;
  };

  const hoursVariance = periodBudget ? calculateVariance(actualHours, periodBudget.hours) : 0;
  const costVariance = periodBudget ? calculateVariance(actualCost, periodBudget.amount) : 0;

  const getVarianceColor = (variance: number, inverse = false) => {
    const isNegative = inverse ? variance > 0 : variance < 0;
    if (Math.abs(variance) < 5) return 'text-muted-foreground';
    return isNegative ? 'text-green-600' : 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 90) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const hoursProgress = periodBudget?.hours ? (actualHours / periodBudget.hours) * 100 : 0;
  const costProgress = periodBudget?.amount ? (actualCost / periodBudget.amount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Labor Budget vs Actual</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          {periodBudget && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Hours</span>
                    <span className={cn("text-sm flex items-center gap-1", getVarianceColor(hoursVariance))}>
                      {hoursVariance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {hoursVariance > 0 ? '+' : ''}{hoursVariance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(hoursProgress, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Actual: {actualHours.toFixed(1)}h</span>
                      <span>Budget: {periodBudget.hours.toFixed(1)}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Labor Cost</span>
                    <span className={cn("text-sm flex items-center gap-1", getVarianceColor(costVariance))}>
                      {costVariance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {costVariance > 0 ? '+' : ''}{costVariance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Progress 
                      value={Math.min(costProgress, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Actual: ${actualCost.toFixed(2)}</span>
                      <span>Budget: ${periodBudget.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget Form */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Set Daily Budget</h3>
            <p className="text-sm text-muted-foreground">
              Enter the daily budget targets. These will be applied to each day in the current view 
              ({format(dateRange[0], 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d')}).
            </p>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budget_hours">Hours per Day</Label>
                <Input
                  id="budget_hours"
                  type="number"
                  step="0.5"
                  value={formData.budget_hours}
                  onChange={(e) => setFormData({ ...formData, budget_hours: e.target.value })}
                  placeholder="e.g., 40"
                />
              </div>

              <div>
                <Label htmlFor="budget_amount">Cost per Day ($)</Label>
                <Input
                  id="budget_amount"
                  type="number"
                  step="0.01"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                  placeholder="e.g., 800"
                />
              </div>

              <div>
                <Label htmlFor="target_gallons">Gallons per Day</Label>
                <Input
                  id="target_gallons"
                  type="number"
                  value={formData.target_gallons}
                  onChange={(e) => setFormData({ ...formData, target_gallons: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveBudget} 
              disabled={upsertBudget.isPending}
              className="w-full"
            >
              {upsertBudget.isPending ? 'Saving...' : 'Save Budget for Period'}
            </Button>
          </div>

          {/* Daily Breakdown */}
          {budgets && budgets.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Daily Budget Details</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Gallons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>{format(new Date(budget.budget_date), 'EEE, MMM d')}</TableCell>
                      <TableCell className="text-right">{budget.budget_hours || '-'}</TableCell>
                      <TableCell className="text-right">
                        {budget.budget_amount ? `$${Number(budget.budget_amount).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">{budget.target_gallons || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
