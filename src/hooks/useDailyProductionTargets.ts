import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DailyProductionTarget = Tables<'daily_production_targets'>;

interface ShiftDetail {
  employeeId: string;
  name: string;
  hours: number;
  rate: number;
  total: number;
}

interface SalaryDetail {
  employeeId: string;
  name: string;
  annualSalary: number;
  dailyPortion: number;
}

interface FixedCostDetail {
  id: string;
  name: string;
  category: string;
  monthlyAmount: number;
  dailyPortion: number;
}

export interface DailyCostBreakdown {
  date: string;
  targetGallons: number;
  targetId?: string;
  notes?: string;
  
  // Hourly (Variable)
  hourlyLaborCost: number;
  hourlyLaborDetails: ShiftDetail[];
  hourlyCostPerGallon: number;
  
  // Overhead (Fixed Burden)
  salaryPortion: number;
  salaryDetails: SalaryDetail[];
  fixedCostPortion: number;
  fixedCostDetails: FixedCostDetail[];
  overheadTotal: number;
  overheadCostPerGallon: number;
  
  // Combined
  totalDailyCost: number;
  totalCostPerGallon: number;
}

const WORK_DAYS_PER_YEAR = 260;
const DEFAULT_WORK_DAYS_PER_MONTH = 21;

export function useDailyProductionTargets(startDate: string, endDate: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing targets for the date range
  const targetsQuery = useQuery({
    queryKey: ['daily-production-targets', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_production_targets')
        .select('*')
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employee shifts for hourly labor calculation
  const shiftsQuery = useQuery({
    queryKey: ['employee-shifts-for-targets', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select(`
          *,
          employee:employees(id, first_name, last_name, hourly_rate, pay_type)
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch active salaried employees
  const salaryEmployeesQuery = useQuery({
    queryKey: ['salary-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, salary_amount, pay_type, employment_status')
        .eq('pay_type', 'salary')
        .eq('employment_status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch active fixed costs
  const fixedCostsQuery = useQuery({
    queryKey: ['fixed-costs-for-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch work days per month setting (optional)
  const settingsQuery = useQuery({
    queryKey: ['overhead-settings-work-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overhead_settings')
        .select('*')
        .eq('setting_key', 'work_days_per_month')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const workDaysPerMonth = settingsQuery.data?.setting_value ?? DEFAULT_WORK_DAYS_PER_MONTH;

  // Calculate costs for a specific date
  const calculateDailyCosts = (date: string, targetGallons: number): DailyCostBreakdown => {
    const shifts = shiftsQuery.data || [];
    const salaryEmployees = salaryEmployeesQuery.data || [];
    const fixedCosts = fixedCostsQuery.data || [];
    const targets = targetsQuery.data || [];

    // Find existing target for this date
    const existingTarget = targets.find(t => t.target_date === date);

    // Calculate hourly labor from shifts
    const dateShifts = shifts.filter(s => s.shift_date === date);
    const hourlyLaborDetails: ShiftDetail[] = dateShifts
      .filter(shift => shift.employee?.pay_type === 'hourly')
      .map(shift => {
        const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
        const endHour = parseInt(shift.end_time?.split(':')[0] || '0');
        const hours = Math.max(0, endHour - startHour - (shift.break_minutes || 0) / 60);
        const rate = shift.employee?.hourly_rate || 0;
        return {
          employeeId: shift.employee_id,
          name: `${shift.employee?.first_name || ''} ${shift.employee?.last_name || ''}`.trim(),
          hours,
          rate,
          total: hours * rate,
        };
      });
    
    const hourlyLaborCost = hourlyLaborDetails.reduce((sum, d) => sum + d.total, 0);
    const hourlyCostPerGallon = targetGallons > 0 ? hourlyLaborCost / targetGallons : 0;

    // Calculate salary portion (daily rate = annual / 260)
    const salaryDetails: SalaryDetail[] = salaryEmployees.map(emp => ({
      employeeId: emp.id,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      annualSalary: emp.salary_amount || 0,
      dailyPortion: (emp.salary_amount || 0) / WORK_DAYS_PER_YEAR,
    }));
    const salaryPortion = salaryDetails.reduce((sum, d) => sum + d.dailyPortion, 0);

    // Calculate fixed costs (daily = monthly / work days per month)
    const fixedCostDetails: FixedCostDetail[] = fixedCosts.map(cost => ({
      id: cost.id,
      name: cost.cost_name,
      category: cost.category,
      monthlyAmount: cost.monthly_amount || 0,
      dailyPortion: (cost.monthly_amount || 0) / workDaysPerMonth,
    }));
    const fixedCostPortion = fixedCostDetails.reduce((sum, d) => sum + d.dailyPortion, 0);

    // Overhead = Salary + Fixed
    const overheadTotal = salaryPortion + fixedCostPortion;
    const overheadCostPerGallon = targetGallons > 0 ? overheadTotal / targetGallons : 0;

    // Combined totals
    const totalDailyCost = hourlyLaborCost + overheadTotal;
    const totalCostPerGallon = hourlyCostPerGallon + overheadCostPerGallon;

    return {
      date,
      targetGallons,
      targetId: existingTarget?.id,
      notes: existingTarget?.notes || undefined,
      hourlyLaborCost,
      hourlyLaborDetails,
      hourlyCostPerGallon,
      salaryPortion,
      salaryDetails,
      fixedCostPortion,
      fixedCostDetails,
      overheadTotal,
      overheadCostPerGallon,
      totalDailyCost,
      totalCostPerGallon,
    };
  };

  // Get all daily breakdowns for the date range
  const getDailyBreakdowns = (): DailyCostBreakdown[] => {
    const targets = targetsQuery.data || [];
    const breakdowns: DailyCostBreakdown[] = [];
    
    // Generate dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const existingTarget = targets.find(t => t.target_date === dateStr);
      const targetGallons = existingTarget?.target_quantity || 0;
      
      breakdowns.push(calculateDailyCosts(dateStr, targetGallons));
    }
    
    return breakdowns;
  };

  // Summary totals
  const getTotals = () => {
    const salaryEmployees = salaryEmployeesQuery.data || [];
    const fixedCosts = fixedCostsQuery.data || [];

    const totalMonthlySalary = salaryEmployees.reduce(
      (sum, emp) => sum + ((emp.salary_amount || 0) / 12), 
      0
    );
    const totalMonthlyFixed = fixedCosts.reduce(
      (sum, cost) => sum + (cost.monthly_amount || 0), 
      0
    );
    const dailySalary = salaryEmployees.reduce(
      (sum, emp) => sum + ((emp.salary_amount || 0) / WORK_DAYS_PER_YEAR), 
      0
    );
    const dailyFixed = totalMonthlyFixed / workDaysPerMonth;
    const dailyOverhead = dailySalary + dailyFixed;

    return {
      salaryEmployeeCount: salaryEmployees.length,
      totalMonthlySalary,
      totalMonthlyFixed,
      dailySalary,
      dailyFixed,
      dailyOverhead,
      workDaysPerMonth,
    };
  };

  // Upsert target mutation
  const upsertTarget = useMutation({
    mutationFn: async (data: { 
      target_date: string; 
      target_quantity: number; 
      notes?: string;
      production_line_id?: string;
    }) => {
      // Check if target exists for this date
      const { data: existing } = await supabase
        .from('daily_production_targets')
        .select('id')
        .eq('target_date', data.target_date)
        .maybeSingle();

      if (existing) {
        const { data: result, error } = await supabase
          .from('daily_production_targets')
          .update({
            target_quantity: data.target_quantity,
            notes: data.notes,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('daily_production_targets')
          .insert({
            target_date: data.target_date,
            target_quantity: data.target_quantity,
            notes: data.notes,
            production_line_id: data.production_line_id,
          })
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-production-targets'] });
      toast({ title: 'Target saved successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error saving target', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Bulk set targets for the week
  const setWeeklyTargets = useMutation({
    mutationFn: async (data: { 
      dates: string[]; 
      target_quantity: number;
    }) => {
      const results = [];
      for (const date of data.dates) {
        const { data: existing } = await supabase
          .from('daily_production_targets')
          .select('id')
          .eq('target_date', date)
          .maybeSingle();

        if (existing) {
          const { data: result, error } = await supabase
            .from('daily_production_targets')
            .update({ target_quantity: data.target_quantity })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          results.push(result);
        } else {
          const { data: result, error } = await supabase
            .from('daily_production_targets')
            .insert({
              target_date: date,
              target_quantity: data.target_quantity,
            })
            .select()
            .single();
          if (error) throw error;
          results.push(result);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-production-targets'] });
      toast({ title: 'Weekly targets set successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error setting targets', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Copy from last week
  const copyFromLastWeek = useMutation({
    mutationFn: async (currentWeekStart: string) => {
      const current = new Date(currentWeekStart);
      const lastWeekStart = new Date(current);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

      // Fetch last week's targets
      const { data: lastWeekTargets, error } = await supabase
        .from('daily_production_targets')
        .select('*')
        .gte('target_date', lastWeekStart.toISOString().split('T')[0])
        .lte('target_date', lastWeekEnd.toISOString().split('T')[0]);

      if (error) throw error;
      if (!lastWeekTargets || lastWeekTargets.length === 0) {
        throw new Error('No targets found from last week');
      }

      // Copy to current week
      const results = [];
      for (const target of lastWeekTargets) {
        const lastDate = new Date(target.target_date);
        const newDate = new Date(lastDate);
        newDate.setDate(newDate.getDate() + 7);
        const newDateStr = newDate.toISOString().split('T')[0];

        const { data: existing } = await supabase
          .from('daily_production_targets')
          .select('id')
          .eq('target_date', newDateStr)
          .maybeSingle();

        if (existing) {
          const { data: result, error } = await supabase
            .from('daily_production_targets')
            .update({ target_quantity: target.target_quantity })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          results.push(result);
        } else {
          const { data: result, error } = await supabase
            .from('daily_production_targets')
            .insert({
              target_date: newDateStr,
              target_quantity: target.target_quantity,
              production_line_id: target.production_line_id,
            })
            .select()
            .single();
          if (error) throw error;
          results.push(result);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-production-targets'] });
      toast({ title: 'Targets copied from last week' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error copying targets', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const isLoading = 
    targetsQuery.isLoading || 
    shiftsQuery.isLoading || 
    salaryEmployeesQuery.isLoading || 
    fixedCostsQuery.isLoading;

  return {
    targets: targetsQuery.data || [],
    isLoading,
    calculateDailyCosts,
    getDailyBreakdowns,
    getTotals,
    upsertTarget,
    setWeeklyTargets,
    copyFromLastWeek,
    workDaysPerMonth,
  };
}
